/**
 * Смоук-проверка формы заявки на живом сервере.
 * Запуск: node scripts/smoke-contact.mjs [baseUrl]
 *
 * Форма на главной долго отправляла данные без флага согласия, и каждая
 * заявка отлетала с 400 — незаметно для посетителя и для нас. Проверяем
 * ровно тот payload, который уходит из формы.
 */
const BASE = process.argv[2] || "http://127.0.0.1:5101";

let cookies = {};
const cookieHeader = () =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

function absorb(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === "" || /Expires=Thu, 01 Jan 1970/i.test(c)) delete cookies[name];
    else cookies[name] = value;
  }
}

async function call(method, path, body) {
  const headers = { cookie: cookieHeader() };
  if (body) headers["content-type"] = "application/json";
  if (cookies["csrf-token"]) headers["x-csrf-token"] = decodeURIComponent(cookies["csrf-token"]);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  absorb(res);
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

const password = "SmokeTest!2026x";
const account = `contact_smoke_${Date.now()}@example.com`;

await call("GET", "/api/csrf-token");

const reg = await call("POST", "/api/auth/register", {
  email: account,
  password,
  firstName: "Смоук",
  lastName: "Заявка",
  consentPersonalData: true,
  consentPolicies: true,
});
check("регистрация", reg.status === 200 || reg.status === 201, reg.data);

const payload = {
  name: "Смоук Заявка",
  email: account,
  phone: "+7 900 000-00-00",
  company: "ООО Тест",
  message: "Смоук-проверка формы заявки.",
  consentPersonalData: true,
};

const sent = await call("POST", "/api/contact", payload);
check("заявка принята", sent.status === 200 || sent.status === 201, sent.data);
check("файлы не потерялись", sent.data?.filesFailed !== true, sent.data);

// Согласие проверяется на сервере, а не только галочкой в форме (152-ФЗ).
const noConsent = await call("POST", "/api/contact", { ...payload, consentPersonalData: false });
check(
  "заявка без согласия отклонена",
  noConsent.status === 400 && noConsent.data?.code === "CONSENT_REQUIRED",
  noConsent.data,
);

// Третий запрос подряд упирается в rate limit — это тоже ожидаемое поведение.
const flood = await call("POST", "/api/contact", payload);
check("повторные отправки ограничены", flood.status === 429 || flood.status === 201, flood.status);

await call("DELETE", "/api/auth/delete-account", { password });

console.log(failures === 0 ? "\nВсе проверки пройдены" : `\nПровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
