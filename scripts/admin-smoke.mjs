/**
 * Smoke-test admin API on localhost. Does not print secrets.
 * Safe writes: restore settings/cookies; create+delete throwaway content/contact.
 */
import jwt from "jsonwebtoken";
import pg from "pg";

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:5000";
const jar = {};
let bearer = "";

function storeCookies(res) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const raw of list) {
    const part = raw.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  }
}

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path, body) {
  const headers = { Accept: "application/json" };
  if (jar["csrf-token"]) headers["x-csrf-token"] = decodeURIComponent(jar["csrf-token"]);
  if (cookieHeader()) headers.cookie = cookieHeader();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  storeCookies(res);
  let json = null;
  const text = await res.text();
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json };
}

function readEnv(name) {
  return (process.env[name] || "").trim();
}

const results = [];
function log(ok, name, extra = "") {
  results.push({ ok, name, extra });
  console.log(`${ok ? "OK " : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
}

async function main() {
  const secret = readEnv("JWT_SECRET");
  const dbUrl = readEnv("DATABASE_URL");
  if (!secret || !dbUrl) {
    console.error("Missing JWT_SECRET or DATABASE_URL");
    process.exit(2);
  }

  const pool = new pg.Pool({ connectionString: dbUrl });
  const { rows } = await pool.query(
    "SELECT id, email, role, is_blocked FROM users WHERE role IN ('admin','superadmin') AND COALESCE(is_blocked, false) = false ORDER BY role DESC LIMIT 1",
  );
  await pool.end();
  if (!rows[0]) {
    console.error("No admin user in database");
    process.exit(2);
  }
  bearer = jwt.sign(
    { userId: rows[0].id, email: rows[0].email, role: rows[0].role, typ: "access" },
    secret,
    { expiresIn: "15m", algorithm: "HS256" },
  );
  log(true, "mint admin access token", `role=${rows[0].role}`);

  let r = await req("GET", "/api/csrf-token");
  log(r.status === 200 && !!r.json?.token, "GET /api/csrf-token", String(r.status));

  r = await req("GET", "/api/auth/me");
  const role = r.json?.user?.role || r.json?.role || "";
  log(r.status === 200 && ["admin", "superadmin"].includes(role || r.json?.user?.role), "GET /api/auth/me", `role=${r.json?.user?.role || "?"}`);

  const gets = [
    "/api/admin/stats?days=30",
    "/api/admin/products",
    "/api/admin/users",
    "/api/admin/orders",
    "/api/admin/contacts",
    "/api/admin/promocodes",
    "/api/admin/content",
    "/api/admin/site-contacts",
    "/api/admin/cookie-settings",
    "/api/admin/settings",
    "/api/admin/database/size",
    "/api/admin/email/status",
  ];
  for (const path of gets) {
    r = await req("GET", path);
    log(r.status === 200, `GET ${path}`, String(r.status) + (r.json?.message ? ` ${r.json.message}` : ""));
  }

  // Settings: rewrite the same operator_name value
  r = await req("GET", "/api/admin/settings");
  const settings = r.json?.settings || [];
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s]));
  const nameVal = byKey.operator_name?.value || "smoke-keep";
  r = await req("PUT", "/api/admin/settings", {
    settings: [{ key: "operator_name", value: nameVal, type: "string", description: byKey.operator_name?.description || "Полное наименование оператора персональных данных" }],
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/settings (same operator_name)", String(r.status));

  r = await req("PUT", "/api/admin/settings/enable_file_upload", {
    value: byKey.enable_file_upload?.value === "false" ? "false" : "true",
    type: "boolean",
    description: "Разрешить загрузку файлов в форме коммерческого предложения",
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/settings/enable_file_upload", String(r.status));

  // Content single + bulk + delete
  r = await req("PUT", "/api/admin/content/smoke_test_key", { value: "ok", page: "smoke", section: "test" });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/content/:key", String(r.status));

  r = await req("PUT", "/api/admin/content/bulk", {
    items: [
      { key: "smoke_test_key", value: "bulk-ok", page: "smoke", section: "test" },
      { key: "nav_home", value: "Главная", page: "nav", section: "nav" },
    ],
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/content/bulk", String(r.status) + (r.json?.message ? ` ${r.json.message}` : ""));

  r = await req("GET", "/api/content");
  const publicKeys = (r.json?.content || []).map((c) => c.key);
  log(r.status === 200 && publicKeys.includes("smoke_test_key"), "GET /api/content sees saved key", `keys=${publicKeys.length}`);

  r = await req("DELETE", "/api/admin/content/smoke_test_key");
  log(r.status === 200 && r.json?.success, "DELETE /api/admin/content/smoke_test_key", String(r.status));

  // Cookie: write current values back
  r = await req("GET", "/api/admin/cookie-settings");
  const cookies = r.json?.settings || {};
  r = await req("PUT", "/api/admin/cookie-settings", {
    enabled: cookies.enabled !== false,
    message: cookies.message || "Мы используем cookies для улучшения работы сайта",
    acceptButtonText: cookies.acceptButtonText || "Принять",
    declineButtonText: cookies.declineButtonText || "Отклонить",
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/cookie-settings", String(r.status));

  // Site contact create/update/delete
  r = await req("POST", "/api/admin/site-contacts", {
    type: "telegram",
    value: "@smoke_test_contact",
    label: "smoke-test",
    order: 99,
  });
  const contactId = r.json?.contact?.id;
  log(r.status === 200 && !!contactId, "POST /api/admin/site-contacts", String(r.status));
  if (contactId) {
    r = await req("PUT", `/api/admin/site-contacts/${contactId}`, {
      type: "telegram",
      value: "@smoke_test_contact",
      label: "smoke-test-upd",
      order: 99,
    });
    log(r.status === 200 && r.json?.success, "PUT /api/admin/site-contacts/:id", String(r.status));
    r = await req("DELETE", `/api/admin/site-contacts/${contactId}`);
    log(r.status === 200 && r.json?.success, "DELETE /api/admin/site-contacts/:id", String(r.status));
  }

  r = await req("GET", "/api/admin/products");
  const products = Array.isArray(r.json) ? r.json : (r.json?.products || r.json?.data || []);
  log(Array.isArray(products), "products payload is a list", `count=${products.length}`);

  // Privacy / SEO / contacts bulk — same values the admin forms send
  r = await req("PUT", "/api/admin/settings", {
    settings: [
      { key: "operator_name", value: byKey.operator_name?.value || nameVal, type: "string", description: "Полное наименование оператора персональных данных" },
      { key: "operator_inn", value: byKey.operator_inn?.value || "", type: "string", description: "ИНН оператора персональных данных" },
      { key: "operator_ogrn", value: byKey.operator_ogrn?.value || "", type: "string", description: "ОГРН/ОГРНИП оператора персональных данных" },
      { key: "responsible_person", value: byKey.responsible_person?.value || "", type: "string", description: "ФИО ответственного за организацию обработки персональных данных" },
    ],
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/settings privacy block", String(r.status));

  r = await req("PUT", "/api/admin/settings", {
    settings: [
      { key: "seo_title", value: byKey.seo_title?.value || byKey.site_title?.value || "", type: "string" },
      { key: "site_title", value: byKey.seo_title?.value || byKey.site_title?.value || "", type: "string" },
      { key: "seo_description", value: byKey.seo_description?.value || "", type: "string" },
      { key: "seo_keywords", value: byKey.seo_keywords?.value || "", type: "string" },
    ],
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/settings SEO block", String(r.status));

  r = await req("PUT", "/api/admin/settings", {
    settings: [
      { key: "contact_email", value: byKey.contact_email?.value || "", type: "string" },
      { key: "contact_phone", value: byKey.contact_phone?.value || "", type: "string" },
      { key: "contact_address", value: byKey.contact_address?.value || "", type: "string" },
      { key: "contact_telegram", value: byKey.contact_telegram?.value || "", type: "string" },
      { key: "contact_working_hours", value: byKey.contact_working_hours?.value || "", type: "string" },
    ],
  });
  log(r.status === 200 && r.json?.success, "PUT /api/admin/settings contacts block", String(r.status));

  // Cookie save as the admin UI does: whole GET object including id/updatedAt
  r = await req("GET", "/api/admin/cookie-settings");
  const cookieRow = r.json?.settings || {};
  r = await req("PUT", "/api/admin/cookie-settings", cookieRow);
  log(r.status === 200 && r.json?.success, "PUT /api/admin/cookie-settings full row", String(r.status) + (r.json?.message ? ` ${r.json.message}` : ""));

  // Database size shape used by the Database tab
  r = await req("GET", "/api/admin/database/size");
  log(
    r.status === 200 && !!r.json?.database?.total_size && Array.isArray(r.json?.tables?.list),
    "GET /api/admin/database/size payload",
    r.status === 200 ? `size=${r.json?.database?.total_size} tables=${r.json?.tables?.count}` : String(r.status),
  );

  // Nested admin reads
  r = await req("GET", "/api/admin/users");
  const users = r.json?.users || [];
  if (users[0]?.id) {
    const u = await req("GET", `/api/admin/users/${users[0].id}`);
    log(u.status === 200 && !!u.json?.user, "GET /api/admin/users/:id", String(u.status));
    const uo = await req("GET", `/api/admin/users/${users[0].id}/orders`);
    log(uo.status === 200, "GET /api/admin/users/:id/orders", String(uo.status));
  } else {
    log(true, "GET /api/admin/users/:id", "skipped no users");
  }

  r = await req("GET", "/api/admin/orders");
  const orders = r.json?.orders || [];
  if (orders[0]?.id) {
    const o = await req("GET", `/api/admin/orders/${orders[0].id}`);
    log(o.status === 200, "GET /api/admin/orders/:id", String(o.status));
    const sameStatus = orders[0].paymentStatus || "pending";
    const op = await req("PATCH", `/api/admin/orders/${orders[0].id}`, { paymentStatus: sameStatus });
    log(op.status === 200 && op.json?.success !== false, "PATCH /api/admin/orders/:id same status", String(op.status));
  } else {
    log(true, "GET /api/admin/orders/:id", "skipped no orders");
  }

  r = await req("GET", "/api/admin/contacts");
  const submissions = r.json?.contacts || [];
  log(r.status === 200 && Array.isArray(submissions), "GET /api/admin/contacts list", `count=${submissions.length}`);
  if (submissions[0]?.id) {
    const c = await req("GET", `/api/admin/contacts/${submissions[0].id}`);
    log(c.status === 200, "GET /api/admin/contacts/:id", String(c.status));
  }

  r = await req("GET", "/api/admin/promocodes");
  const promocodes = r.json?.promoCodes || r.json?.promocodes || [];
  log(r.status === 200 && Array.isArray(promocodes), "GET /api/admin/promocodes list", `count=${promocodes.length}`);

  const promoCode = `SMOKE${Date.now().toString().slice(-6)}`;
  r = await req("POST", "/api/admin/promocodes", {
    code: promoCode,
    discountPercent: 5,
    isActive: 1,
  });
  const promoId = r.json?.promoCode?.id;
  log((r.status === 200 || r.status === 201) && !!promoId, "POST /api/admin/promocodes", String(r.status));
  if (promoId) {
    r = await req("PATCH", `/api/admin/promocodes/${promoId}`, { isActive: 0 });
    log(r.status === 200 && r.json?.success, "PATCH /api/admin/promocodes/:id", String(r.status));
    r = await req("DELETE", `/api/admin/promocodes/${promoId}`);
    log(r.status === 200 && r.json?.success, "DELETE /api/admin/promocodes/:id", String(r.status));
  }

  if (products[0]?.id) {
    const p = products[0];
    r = await req("PATCH", `/api/admin/products/${p.id}`, { isActive: p.isActive });
    log(r.status === 200 && r.json?.success !== false, "PATCH /api/admin/products/:id same isActive", String(r.status) + (r.json?.message ? ` ${r.json.message}` : ""));
    r = await req("PATCH", `/api/admin/products/${p.id}`, { price: String(p.price ?? "0"), stock: Number(p.stock ?? 0) });
    log(r.status === 200 && r.json?.success !== false, "PATCH /api/admin/products/:id price/stock", String(r.status) + (r.json?.message ? ` ${r.json.message}` : ""));
    r = await req("GET", `/api/admin/products/${p.id}/images`);
    log(r.status === 200, "GET /api/admin/products/:id/images", String(r.status));
  }

  r = await req("GET", "/api/admin/content/nav_home");
  log(r.status === 200 || r.status === 404, "GET /api/admin/content/:key", String(r.status));

  // --- Закрытый режим сайта ---
  r = await req("GET", "/api/site-access");
  const accessBefore = r.json || {};
  log(r.status === 200 && typeof accessBefore.privateMode === "boolean", "GET /api/site-access", String(r.status));

  const restoreAccess = async () => {
    await req("PUT", "/api/admin/settings", {
      settings: [
        { key: "site_private_mode", value: byKey.site_private_mode?.value || "false", type: "boolean" },
        { key: "registration_enabled", value: byKey.registration_enabled?.value || "true", type: "boolean" },
      ],
    });
  };

  try {
    r = await req("PUT", "/api/admin/settings", {
      settings: [{ key: "site_private_mode", value: "true", type: "boolean" }],
    });
    log(r.status === 200 && r.json?.success, "PUT site_private_mode=true", String(r.status));

    r = await req("GET", "/api/site-access");
    log(r.status === 200 && r.json?.privateMode === true, "site-access reports private", String(r.status));

    // Админ с валидной сессией должен продолжать работать.
    r = await req("GET", "/api/admin/products");
    log(r.status === 200, "admin still reads products in private mode", String(r.status));
    r = await req("GET", "/api/content");
    log(r.status === 200, "admin still reads public content in private mode", String(r.status));

    // Аноним не должен получать ничего, кроме входа.
    const anon = async (method, path, body) => {
      const headers = { Accept: "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let json = null;
      const text = await res.text();
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      return { status: res.status, json };
    };

    let a = await anon("GET", "/api/content");
    log(a.status === 403 && a.json?.code === "SITE_PRIVATE", "anon blocked on /api/content", String(a.status));
    a = await anon("GET", "/api/products");
    log(a.status === 403, "anon blocked on /api/products", String(a.status));
    a = await anon("GET", "/api/settings");
    log(a.status === 403, "anon blocked on /api/settings", String(a.status));
    a = await anon("GET", "/api/site-access");
    log(a.status === 200, "anon can read /api/site-access", String(a.status));
    a = await anon("GET", "/api/csrf-token");
    log(a.status === 200, "anon can read /api/csrf-token", String(a.status));
    a = await anon("GET", "/api/auth/me");
    log(a.status === 401, "anon /api/auth/me stays 401 (not 403)", String(a.status));

    a = await anon("GET", "/robots.txt");
    log(a.status === 200, "robots.txt served in private mode", String(a.status));

    // Регистрация должна быть закрыта даже прямым запросом.
    const csrfRes = await fetch(`${BASE}/api/csrf-token`);
    const setCookie = typeof csrfRes.headers.getSetCookie === "function" ? csrfRes.headers.getSetCookie() : [];
    const csrfJson = await csrfRes.json().catch(() => ({}));
    const cookiePairs = setCookie.map((c) => c.split(";")[0]).join("; ");
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfJson?.token || "",
        cookie: cookiePairs,
      },
      body: JSON.stringify({
        email: `smoke_${Date.now()}@example.com`,
        password: "Sm0ke!TestPassword",
        consentPersonalData: true,
        consentPolicies: true,
      }),
    });
    const regJson = await regRes.json().catch(() => ({}));
    log(
      regRes.status === 403 && regJson?.code === "REGISTRATION_CLOSED",
      "registration blocked in private mode",
      `${regRes.status} ${regJson?.code || ""}`,
    );
  } finally {
    await restoreAccess();
  }

  // Сравниваем с исходным значением, а не с false: тест могут гонять и на
  // закрытом сайте, и тогда «вернуть как было» — это вернуть закрытый режим.
  r = await req("GET", "/api/site-access");
  log(
    r.status === 200 && r.json?.privateMode === accessBefore.privateMode,
    "private mode restored to previous value",
    `${r.status} privateMode=${r.json?.privateMode}`,
  );

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("CRASH", err.message);
  process.exit(1);
});
