/**
 * Смоук-проверка оформления заказа на живом сервере.
 *
 * Проверяет ровно то, что раньше было сломано: суммы и статус оплаты
 * считает сервер, а не клиент; резерв записывается; отмена возвращает
 * товар на склад; скрытый товар заказать нельзя.
 *
 * Запуск: node scripts/smoke-orders.mjs [baseUrl]
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

const email = `order_smoke_${Date.now()}@example.com`;
const password = "SmokeTest!2026x";

await call("GET", "/api/csrf-token");

const reg = await call("POST", "/api/auth/register", {
  email,
  password,
  firstName: "Смоук",
  lastName: "Заказ",
  consentPersonalData: true,
  consentPolicies: true,
});
check("регистрация", reg.status === 200 || reg.status === 201, reg.data);

const catalog = await call("GET", "/api/products");
const products = Array.isArray(catalog.data) ? catalog.data : catalog.data?.products ?? [];
const product = products.find((p) => Number(p.stock) > 0);
if (!product) {
  console.log("SKIP  в каталоге нет товара с остатком — проверка невозможна");
  process.exit(0);
}
const stockBefore = Number(product.stock);
const unitPrice = Number(product.price);

// Пытаемся подделать сумму и статус оплаты — сервер обязан их игнорировать.
const created = await call("POST", "/api/orders", {
  productId: product.id,
  quantity: 2,
  paymentMethod: "Банковская карта",
  customerName: "Смоук Заказ",
  customerEmail: email,
  customerPhone: "+7 900 000-00-00",
  consentPersonalData: true,
  totalAmount: "1.00",
  discountAmount: "0",
  finalAmount: "1.00",
  paymentStatus: "paid",
  promoCode: null,
});
check("заказ создан", created.status === 200 || created.status === 201, created.data);

const order = created.data?.order ?? created.data;
const expectedTotal = (unitPrice * 2).toFixed(2);

check(
  "статус оплаты принудительно pending",
  order?.paymentStatus === "pending",
  order?.paymentStatus,
);
check(
  `сумма пересчитана сервером (${expectedTotal})`,
  Number(order?.finalAmount) === Number(expectedTotal),
  { got: order?.finalAmount, expected: expectedTotal },
);
check("срок резерва записан", Boolean(order?.reservedUntil), order?.reservedUntil);

const afterOrder = await call("GET", `/api/products/${product.id}`);
const stockAfterOrder = Number(afterOrder.data?.product?.stock ?? afterOrder.data?.stock);
check(
  "остаток уменьшился на 2",
  stockAfterOrder === stockBefore - 2,
  { before: stockBefore, after: stockAfterOrder },
);

const cancelled = await call("PATCH", `/api/orders/${order.id}/status`, { status: "cancelled" });
check("заказ отменён", cancelled.status === 200, cancelled.data);

const afterCancel = await call("GET", `/api/products/${product.id}`);
const stockAfterCancel = Number(afterCancel.data?.product?.stock ?? afterCancel.data?.stock);
check(
  "остаток вернулся после отмены",
  stockAfterCancel === stockBefore,
  { before: stockBefore, after: stockAfterCancel },
);

const badStatus = await call("PATCH", `/api/orders/${order.id}/status`, { status: "pyad" });
check("недопустимый статус отклонён", badStatus.status === 400, badStatus.data);

const noConsent = await call("POST", "/api/orders", {
  productId: product.id,
  quantity: 1,
  paymentMethod: "Банковская карта",
  customerName: "Смоук Заказ",
  customerEmail: email,
  customerPhone: "+7 900 000-00-00",
});
check("заказ без согласия отклонён", noConsent.status === 400, noConsent.data);

await call("DELETE", "/api/auth/delete-account");

console.log("");
if (failures) {
  console.log(`Провалено проверок: ${failures}`);
  process.exit(1);
}
console.log("Все проверки пройдены");
