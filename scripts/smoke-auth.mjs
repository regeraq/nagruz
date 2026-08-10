/**
 * Смоук-проверка auth-контура на живом сервере.
 * Запуск: node scripts/smoke-auth.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://127.0.0.1:5101";

let cookies = {};
const cookieHeader = () =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

function absorb(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === "" || /Expires=Thu, 01 Jan 1970/i.test(c)) delete cookies[name];
    else cookies[name] = value;
  }
  return raw;
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

const email = `smoke_${Date.now()}@example.com`;
const password = "SmokeTest!2026x";

const health = await call("GET", "/api/health");
check("health 200", health.status === 200, health.data);

await call("GET", "/api/csrf-token");
check("csrf cookie выдан", !!cookies["csrf-token"]);

const reg = await call("POST", "/api/auth/register", {
  email,
  password,
  firstName: "Смоук",
  lastName: "Тест",
  consentPersonalData: true,
  consentPolicies: true,
});
check("register 200/201", reg.status === 200 || reg.status === 201, reg.data);
check("access_token в HttpOnly cookie", !!cookies["access_token"]);
check("refresh_token в HttpOnly cookie", !!cookies["refresh_token"]);
check("токены не возвращаются в теле", !JSON.stringify(reg.data ?? {}).includes("eyJ"), reg.data);

const me = await call("GET", "/api/auth/me");
check("me 200", me.status === 200 && me.data?.user?.email === email, me.data);

const refresh = await call("POST", "/api/auth/refresh");
check("refresh 200", refresh.status === 200, refresh.data);

const meAfterRefresh = await call("GET", "/api/auth/me");
check("me 200 после refresh", meAfterRefresh.status === 200, meAfterRefresh.data);

// Транзакционное удаление аккаунта.
const del = await call("DELETE", "/api/auth/account");
check("delete account 200", del.status === 200, del.data);

const meAfterDelete = await call("GET", "/api/auth/me");
check("me 401 после удаления", meAfterDelete.status === 401, meAfterDelete.data);

cookies = {};
await call("GET", "/api/csrf-token");
const relogin = await call("POST", "/api/auth/login", { email, password });
check("login удалённым аккаунтом отклонён", relogin.status >= 400, relogin.data);

console.log(failures === 0 ? "\nВсе проверки пройдены" : `\nПровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
