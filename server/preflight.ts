/**
 * Проверка конфигурации перед запуском (preflight).
 *
 * Задача — обнаружить ошибки конфигурации в момент старта, а не тогда,
 * когда на них наткнётся первый живой пользователь. Всё, что делает
 * развёртывание небезопасным, останавливает запуск (BLOCKER). Всё, что
 * лишь снижает надёжность, выводится предупреждением.
 *
 * Секреты никогда не печатаются — только имена переменных.
 */

const isProduction = process.env.NODE_ENV === "production";

/** Значения-заглушки из .env.example. Длина у них достаточная, поэтому
 *  обычная проверка «≥32 символа» их пропускает — а секрет при этом
 *  публично известен всем, у кого есть доступ к репозиторию. */
const PLACEHOLDER_MARKERS = [
  "REPLACE_ME",
  "CHANGE_ME",
  "YOUR_SECRET",
  "yourdomain.ru",
  "changeme",
  "example.com",
];

function looksLikePlaceholder(value: string): boolean {
  const lowered = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker.toLowerCase()));
}

/** Секреты вида `test_jwt_secret_...` — забытые значения из локальной
 *  разработки. Длину они проходят, но случайными не являются. */
const DEV_SECRET_PREFIX = /^(test|dev|demo|local|sample|example|secret|password|my)[-_]/i;

export function runPreflightChecks(): void {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // ---------- Секреты ----------
  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET", "CSRF_SECRET"]) {
    const value = process.env[key];

    if (!value) {
      // JWT-секреты уже проверяет server/auth.ts; здесь важен CSRF_SECRET.
      if (isProduction) blockers.push(`${key} не задан.`);
      continue;
    }
    if (looksLikePlaceholder(value)) {
      blockers.push(
        `${key} содержит значение-заглушку из .env.example. ` +
          `Сгенерируйте настоящее: openssl rand -base64 48`,
      );
    }
    if (isProduction && value.length < 32) {
      blockers.push(`${key} короче 32 символов.`);
    }
    if (isProduction && DEV_SECRET_PREFIX.test(value)) {
      blockers.push(
        `${key} похож на тестовое значение из локальной разработки, а не на ` +
          `случайный секрет. Сгенерируйте: openssl rand -base64 48`,
      );
    }
  }

  const secrets = [process.env.JWT_SECRET, process.env.JWT_REFRESH_SECRET, process.env.CSRF_SECRET]
    .filter((v): v is string => Boolean(v));
  if (isProduction && new Set(secrets).size !== secrets.length) {
    blockers.push("JWT_SECRET, JWT_REFRESH_SECRET и CSRF_SECRET должны быть тремя РАЗНЫМИ значениями.");
  }

  // ---------- База данных ----------
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl && looksLikePlaceholder(dbUrl)) {
    blockers.push("DATABASE_URL выглядит как пример из шаблона, а не реальная строка подключения.");
  }
  if (isProduction && /:(postgres|password|123456|admin)@/i.test(dbUrl)) {
    blockers.push("DATABASE_URL содержит тривиальный пароль БД. Задайте стойкий пароль.");
  }

  if (isProduction) {
    // ---------- Работа за reverse-proxy ----------
    // Это не косметика: при TRUST_PROXY=false за nginx приложение видит
    // IP 127.0.0.1 у ВСЕХ клиентов. Тогда rate limiting и защита от
    // перебора считают всех посетителей одним человеком, и неудачные
    // попытки входа одного пользователя блокируют вход всем остальным.
    if (process.env.TRUST_PROXY !== "true") {
      warnings.push(
        "TRUST_PROXY не равен 'true'. Если приложение стоит за nginx, все клиенты " +
          "будут выглядеть как 127.0.0.1: rate limiting и антибрутфорс станут " +
          "общими для всех посетителей, а в журналах будет неверный IP. " +
          "Поставьте TRUST_PROXY=true при работе за nginx.",
      );
    }

    // Cookie без флага Secure уходят по открытому HTTP при downgrade-атаке.
    if (process.env.FORCE_SECURE_COOKIES !== "true") {
      warnings.push(
        "FORCE_SECURE_COOKIES не равен 'true'. При терминации TLS на nginx " +
          "Node видит обычный HTTP и не ставит флаг Secure на cookie. " +
          "Поставьте FORCE_SECURE_COOKIES=true, если сайт работает по HTTPS.",
      );
    }

    // ---------- Публичные адреса ----------
    const frontendUrl = process.env.FRONTEND_URL || "";
    if (!frontendUrl) {
      warnings.push("FRONTEND_URL не задан — ссылки в письмах будут вести на localhost.");
    } else if (looksLikePlaceholder(frontendUrl)) {
      blockers.push("FRONTEND_URL содержит домен-заглушку (yourdomain.ru). Укажите реальный домен.");
    } else if (!frontendUrl.startsWith("https://")) {
      warnings.push(`FRONTEND_URL использует не HTTPS (${frontendUrl}). Ссылки в письмах будут небезопасными.`);
    }

    for (const origin of (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean)) {
      if (origin === "*") {
        blockers.push("ALLOWED_ORIGINS='*' вместе с cookie-авторизацией полностью снимает защиту от CSRF.");
      } else if (!origin.startsWith("https://")) {
        warnings.push(`ALLOWED_ORIGINS содержит не-HTTPS источник: ${origin}`);
      }
    }

    // ---------- Почта ----------
    const provider = process.env.EMAIL_PROVIDER || "yandex";
    if (provider === "noop") {
      warnings.push(
        "EMAIL_PROVIDER=noop в production: письма (подтверждение e-mail, " +
          "уведомления о заявках) отправляться НЕ будут.",
      );
    } else if (provider === "yandex" && !(process.env.YANDEX_POSTBOX_KEY_ID && process.env.YANDEX_POSTBOX_SECRET)) {
      warnings.push("EMAIL_PROVIDER=yandex, но YANDEX_POSTBOX_KEY_ID/SECRET не заданы — письма отправляться не будут.");
    } else if (provider === "resend" && !process.env.RESEND_API_KEY) {
      warnings.push("EMAIL_PROVIDER=resend, но RESEND_API_KEY не задан — письма отправляться не будут.");
    }

    // Резервное значение "onboarding@resend.dev" — песочница Resend. В Postbox
    // это неподтверждённая идентичность, письма будут отклонены.
    const mailFrom = process.env.MAIL_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "";
    if (!mailFrom) {
      warnings.push(
        "MAIL_FROM_EMAIL не задан — используется тестовый адрес песочницы " +
          "'onboarding@resend.dev', письма будут отклонены. Укажите адрес " +
          "в подтверждённом домене.",
      );
    } else if (looksLikePlaceholder(mailFrom)) {
      blockers.push("MAIL_FROM_EMAIL содержит домен-заглушку. Укажите адрес в своём подтверждённом домене.");
    }

    if (provider === "resend") {
      warnings.push(
        "EMAIL_PROVIDER=resend — серверы в США. По 152-ФЗ это трансграничная " +
          "передача персональных данных. Рекомендуется Yandex Cloud Postbox.",
      );
    }

    if (!process.env.OWNER_EMAIL) {
      warnings.push("OWNER_EMAIL не задан — уведомления о новых заявках никуда не уйдут.");
    }
  }

  // ---------- Вывод ----------
  if (warnings.length > 0) {
    console.warn("");
    console.warn("──────────────────────────────────────────────────────────────");
    console.warn(`⚠️  Preflight: предупреждений — ${warnings.length}`);
    console.warn("──────────────────────────────────────────────────────────────");
    warnings.forEach((w, i) => console.warn(`   ${i + 1}. ${w}`));
    console.warn("");
  }

  if (blockers.length > 0) {
    console.error("");
    console.error("══════════════════════════════════════════════════════════════");
    console.error(`🚨 Preflight: запуск невозможен — критических проблем: ${blockers.length}`);
    console.error("══════════════════════════════════════════════════════════════");
    blockers.forEach((b, i) => console.error(`   ${i + 1}. ${b}`));
    console.error("");
    console.error("   Исправьте .env и запустите снова.");
    console.error("   Подробности: PRODUCTION_DEPLOYMENT_GUIDE.md");
    console.error("══════════════════════════════════════════════════════════════");
    console.error("");
    process.exit(1);
  }

  if (warnings.length === 0) {
    console.log("✅ Preflight: конфигурация в порядке");
  }
}
