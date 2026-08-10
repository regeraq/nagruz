/**
 * Управление опциональными cookies / аналитикой.
 * Необходимые cookies (HttpOnly session, CSRF) работают всегда.
 */

export type CookieConsent = "accepted" | "declined" | null;

export function getCookieConsent(): CookieConsent {
  try {
    const v = localStorage.getItem("cookie-consent");
    if (v === "accepted" || v === "declined") return v;
  } catch {
    // ignore
  }
  return null;
}

/** true только если пользователь явно принял опциональные cookies. */
export function allowsOptionalCookies(): boolean {
  return getCookieConsent() === "accepted";
}

/**
 * Вызвать колбэк только при согласии. Если согласие ещё не дано —
 * подписаться на событие из cookie-banner.
 */
export function whenOptionalCookiesAllowed(load: () => void): () => void {
  if (allowsOptionalCookies()) {
    load();
    return () => {};
  }
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail === "accepted") load();
  };
  window.addEventListener("cookie-consent-changed", handler);
  return () => window.removeEventListener("cookie-consent-changed", handler);
}
