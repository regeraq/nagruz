// Единая точка отправки e-mail для проекта.
//
// Провайдер выбирается через переменную окружения EMAIL_PROVIDER:
//   yandex  - Yandex Cloud Postbox через SMTP (рекомендуется, РФ, 152-ФЗ)
//   resend  - Resend через REST API (legacy, оставлен для fallback)
//   noop    - не отправлять ничего (для dev-окружения / CI)
//
// Обратно-совместимый API:
//   sendEmail(to, subject, html)
//   sendEmailWithAttachment({ from?, to, subject, html, text?, attachments?, reply_to? })
// обе возвращают { success, data?, error?, message?, requiresDomainVerification? }.

import { createHmac } from "crypto";
import nodemailer, { type Transporter } from "nodemailer";

type EmailProvider = "yandex" | "resend" | "noop";

export interface EmailAttachment {
  filename: string;
  /** Base64-string БЕЗ префикса data URL. */
  content: string;
  contentType?: string;
}

export interface SendEmailWithAttachmentInput {
  /** Переопределяет MAIL_FROM_EMAIL/MAIL_FROM_NAME, если задан. */
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  reply_to?: string;
}

export interface EmailResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  /** Для Resend: домен не подтверждён. Для Postbox: аналогичная ситуация в sandbox. */
  requiresDomainVerification?: boolean;
}

// -------- Конфиг --------
const PROVIDER: EmailProvider =
  (process.env.EMAIL_PROVIDER as EmailProvider | undefined) || "yandex";

const MAIL_FROM_EMAIL =
  process.env.MAIL_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "onboarding@resend.dev";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Loaddevice";
const DEFAULT_FROM = `${MAIL_FROM_NAME} <${MAIL_FROM_EMAIL}>`;

const API_TIMEOUT_MS = 10_000;

// -------- Публичный API --------

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  return sendEmailWithAttachment({ to, subject, html });
}

export async function sendEmailWithAttachment(
  input: SendEmailWithAttachmentInput,
): Promise<EmailResult> {
  switch (PROVIDER) {
    case "yandex":
      return sendViaYandex(input);
    case "resend":
      return sendViaResend(input);
    case "noop":
      return sendViaNoop(input);
    default:
      console.error(`[email] Unknown EMAIL_PROVIDER="${PROVIDER}", falling back to noop`);
      return sendViaNoop(input);
  }
}

// ============================================================
//  Yandex Cloud Postbox (SMTP, nodemailer)
// ============================================================

let cachedYandexTransport: Transporter | null = null;

function buildYandexTransport(): Transporter | null {
  const keyId = process.env.YANDEX_POSTBOX_KEY_ID;
  const secret = process.env.YANDEX_POSTBOX_SECRET;

  if (!keyId || !secret) {
    return null;
  }

  const region = process.env.YANDEX_POSTBOX_REGION || "ru-central1";
  const host = process.env.YANDEX_POSTBOX_HOST || "postbox.cloud.yandex.net";
  const port = Number(process.env.YANDEX_POSTBOX_PORT || "465");
  const secure = port === 465;

  const smtpPassword = deriveYandexSmtpPassword(secret, region);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: keyId,
      pass: smtpPassword,
    },
    connectionTimeout: API_TIMEOUT_MS,
    socketTimeout: API_TIMEOUT_MS,
    greetingTimeout: API_TIMEOUT_MS,
  });
}

function getYandexTransport(): Transporter | null {
  if (!cachedYandexTransport) {
    cachedYandexTransport = buildYandexTransport();
  }
  return cachedYandexTransport;
}

async function sendViaYandex(
  input: SendEmailWithAttachmentInput,
): Promise<EmailResult> {
  const transport = getYandexTransport();
  if (!transport) {
    console.warn(
      "[email:yandex] YANDEX_POSTBOX_KEY_ID or YANDEX_POSTBOX_SECRET not set - skipping send",
    );
    return {
      success: false,
      message: "Yandex Postbox credentials not configured",
    };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const from = input.from || DEFAULT_FROM;

  const attachments = (input.attachments || []).map((a) => ({
    filename: a.filename,
    content: a.content,
    encoding: "base64" as const,
    contentType: a.contentType,
  }));

  try {
    console.log("[email:yandex] sending", {
      to: recipients,
      subject: input.subject,
      from,
      attachments: attachments.length,
    });

    const info = await transport.sendMail({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.reply_to,
      attachments: attachments.length ? attachments : undefined,
    });

    console.log("[email:yandex] sent", { messageId: info.messageId, to: recipients });
    return {
      success: true,
      data: { messageId: info.messageId, response: info.response },
    };
  } catch (error) {
    return handleYandexError(error, input);
  }
}

function handleYandexError(
  error: unknown,
  input: SendEmailWithAttachmentInput,
): EmailResult {
  const err = error as {
    message?: string;
    code?: string;
    responseCode?: number;
    response?: string;
  };
  const msg = err.message || "Unknown SMTP error";
  const code = err.code || "UNKNOWN";
  console.error("[email:yandex] send failed", {
    to: input.to,
    subject: input.subject,
    code,
    responseCode: err.responseCode,
    message: msg,
    response: err.response,
  });

  // 554/550 + упоминание identity/sandbox = домен/email не подтверждён в Postbox.
  const response = (err.response || "").toLowerCase();
  const requiresDomainVerification =
    err.responseCode === 554 ||
    response.includes("not verified") ||
    response.includes("identity") ||
    response.includes("sandbox");

  if (requiresDomainVerification) {
    console.error(
      "[email:yandex] identity/domain not verified OR account is in sandbox. " +
        "Confirm domain in Postbox console and request sandbox exit.",
    );
  }

  return {
    success: false,
    error: msg,
    requiresDomainVerification,
  };
}

/**
 * Вычисление SMTP-пароля для Yandex Cloud Postbox.
 *
 * Yandex Postbox использует тот же алгоритм, что и AWS SES: secret access key
 * превращается в SMTP-пароль через цепочку HMAC-SHA256 (SigV4 derivation) +
 * version byte 0x04 + base64.
 *
 * Источник: https://yandex.cloud/ru/docs/postbox/operations/smtp-credentials
 */
export function deriveYandexSmtpPassword(
  secretAccessKey: string,
  region = "ru-central1",
): string {
  const DATE = "11111111";
  const SERVICE = "ses";
  const TERMINAL = "aws4_request";
  const MESSAGE = "SendRawEmail";
  const VERSION = Buffer.from([0x04]);

  const hmac = (key: string | Buffer, data: string): Buffer =>
    createHmac("sha256", key).update(data, "utf8").digest();

  let sig: Buffer = hmac("AWS4" + secretAccessKey, DATE);
  sig = hmac(sig, region);
  sig = hmac(sig, SERVICE);
  sig = hmac(sig, TERMINAL);
  sig = hmac(sig, MESSAGE);

  return Buffer.concat([VERSION, sig]).toString("base64");
}

// ============================================================
//  Resend (legacy fallback, REST API)
// ============================================================

async function sendViaResend(
  input: SendEmailWithAttachmentInput,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email:resend] RESEND_API_KEY not set - skipping send");
    return { success: false, message: "Resend API key not configured" };
  }

  const from = input.from || process.env.RESEND_FROM_EMAIL || MAIL_FROM_EMAIL;
  const to = Array.isArray(input.to) ? input.to : [input.to];

  const payload: Record<string, unknown> = {
    from,
    to,
    subject: input.subject,
    html: input.html,
  };
  if (input.text) payload.text = input.text;
  if (input.reply_to) payload.reply_to = input.reply_to;
  if (input.attachments?.length) {
    payload.attachments = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType ? { contentType: a.contentType } : {}),
    }));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log("[email:resend] sending", {
      to,
      subject: input.subject,
      from,
      attachments: input.attachments?.length || 0,
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      console.error("[email:resend] API error", {
        status: response.status,
        message: data.message,
      });
      const requiresDomainVerification = Boolean(
        data.message &&
          (data.message.includes("domain is not verified") ||
            data.message.includes("You can only send testing emails")),
      );
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
        data,
        requiresDomainVerification,
      };
    }

    console.log("[email:resend] sent", { id: data.id, to });
    return { success: true, data };
  } catch (error) {
    clearTimeout(timeoutId);
    const err = error as { name?: string; message?: string };
    if (err.name === "AbortError") {
      console.error("[email:resend] timeout");
      return { success: false, error: "Timeout" };
    }
    console.error("[email:resend] send failed", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ============================================================
//  noop (ничего не отправляем)
// ============================================================

async function sendViaNoop(
  input: SendEmailWithAttachmentInput,
): Promise<EmailResult> {
  console.log("[email:noop] skipping send", {
    to: input.to,
    subject: input.subject,
    attachments: input.attachments?.length || 0,
  });
  return { success: true, data: { skipped: true } };
}

// ============================================================
//  Диагностика / health
// ============================================================

export function getEmailProviderStatus() {
  const status = {
    provider: PROVIDER,
    fromEmail: MAIL_FROM_EMAIL,
    fromName: MAIL_FROM_NAME,
    yandex: {
      configured: Boolean(
        process.env.YANDEX_POSTBOX_KEY_ID && process.env.YANDEX_POSTBOX_SECRET,
      ),
      region: process.env.YANDEX_POSTBOX_REGION || "ru-central1",
      host: process.env.YANDEX_POSTBOX_HOST || "postbox.cloud.yandex.net",
      port: Number(process.env.YANDEX_POSTBOX_PORT || "465"),
    },
    resend: {
      configured: Boolean(process.env.RESEND_API_KEY),
    },
  };
  return status;
}

/** Принудительно сбросить кэш nodemailer-транспорта (для тестов). */
export function resetEmailTransport() {
  cachedYandexTransport = null;
}
