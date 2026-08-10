/**
 * Единая работа с CSRF-токеном на клиенте.
 *
 * Сервер использует double-submit cookie: токен лежит в не-httpOnly cookie
 * `csrf-token`, и его же надо продублировать в заголовке `x-csrf-token`
 * для любого POST/PUT/PATCH/DELETE к /api.
 */

const COOKIE_NAME = "csrf-token";
const HEADER_NAME = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function readCsrfTokenFromCookie(): string | null {
  for (const cookie of document.cookie.split(";")) {
    const trimmed = cookie.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== COOKIE_NAME) continue;
    const value = trimmed.slice(eq + 1).trim();
    if (value) return value;
  }
  return null;
}

export function readCsrfToken(): string | null {
  // Cookie — источник истины: именно с ним сервер сравнивает заголовок.
  // Meta-тег может устареть, если cookie была перевыпущена.
  const fromCookie = readCsrfTokenFromCookie();
  if (fromCookie) return fromCookie;

  const meta = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content")
    ?.trim();
  return meta || null;
}

/** Запрашивает у сервера установку cookie с токеном и возвращает его. */
export async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCsrfToken();
  if (existing) return existing;

  try {
    await fetch("/api/csrf-token", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    return null;
  }
  return readCsrfToken();
}

function isSameOriginApiUrl(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.origin);
    return resolved.origin === window.location.origin && resolved.pathname.startsWith("/api");
  } catch {
    return false;
  }
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

let installed = false;

/**
 * Оборачивает window.fetch так, чтобы CSRF-заголовок и cookie-сессия
 * добавлялись автоматически ко всем изменяющим запросам к собственному API.
 */
export function installCsrfFetchInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

    if (!MUTATING_METHODS.has(method)) {
      return originalFetch(input, init);
    }

    const url = resolveRequestUrl(input);
    if (!isSameOriginApiUrl(url)) {
      return originalFetch(input, init);
    }

    const token = await ensureCsrfToken();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has(HEADER_NAME)) {
      headers.set(HEADER_NAME, token);
    }

    return originalFetch(input, {
      ...init,
      method,
      headers,
      // Cookie с токеном обязана уехать вместе с запросом.
      credentials: init?.credentials ?? "include",
    });
  };
}
