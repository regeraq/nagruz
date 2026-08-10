/**
 * Клиентская сессия живёт в HttpOnly cookies (access_token / refresh_token).
 * JS не читает токены — это защита от кражи через XSS.
 */

/** Удалить устаревшие токены из localStorage (миграция со старой схемы). */
export function clearLegacyTokens(): void {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  } catch {
    // private mode / disabled storage
  }
}

/** Обновить access cookie по refresh cookie. Возвращает true при успехе. */
export async function refreshSession(): Promise<boolean> {
  try {
    const { ensureCsrfToken } = await import("./csrf");
    const csrf = await ensureCsrfToken();
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Выход: отзыв серверной сессии + очистка cookie + legacy localStorage. */
export async function logoutSession(): Promise<void> {
  clearLegacyTokens();
  try {
    const { ensureCsrfToken } = await import("./csrf");
    const csrf = await ensureCsrfToken();
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: "{}",
    });
  } catch {
    // ignore
  }
}
