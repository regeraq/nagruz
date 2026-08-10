import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ensureCsrfToken } from "./csrf";
import { clearLegacyTokens, refreshSession } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = "Произошла ошибка";
    
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json.message) {
            errorMessage = json.message;
            if (json.message.includes('CSRF')) {
              errorMessage = "Ошибка безопасности. Пожалуйста, обновите страницу и попробуйте снова";
            }
          } else {
            if (res.status === 401) {
              errorMessage = "Требуется авторизация";
            } else if (res.status === 403) {
              errorMessage = "Доступ запрещен. Пожалуйста, обновите страницу";
            } else if (res.status === 404) {
              errorMessage = "Ресурс не найден";
            } else if (res.status === 400) {
              errorMessage = "Неверный запрос";
            } else if (res.status >= 500) {
              errorMessage = "Ошибка сервера. Попробуйте позже";
            }
          }
        } catch {
          if (res.status === 401) {
            errorMessage = "Требуется авторизация";
          } else if (res.status === 403) {
            errorMessage = "Доступ запрещен. Пожалуйста, обновите страницу";
          } else if (res.status === 404) {
            errorMessage = "Ресурс не найден";
          } else if (res.status >= 500) {
            errorMessage = "Ошибка сервера. Попробуйте позже";
          }
        }
      }
    } catch {
      if (res.status === 401) {
        errorMessage = "Требуется авторизация";
      } else if (res.status === 403) {
        errorMessage = "Доступ запрещен. Пожалуйста, обновите страницу";
      } else if (res.status === 404) {
        errorMessage = "Ресурс не найден";
      } else if (res.status >= 500) {
        errorMessage = "Ошибка сервера. Попробуйте позже";
      }
    }
    
    const error: any = new Error(errorMessage);
    error.status = res.status;
    error.response = { status: res.status };
    throw error;
  }
}

/** fetch с credentials + однократный refresh при 401. */
async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method || "GET").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken && !headers.has("x-csrf-token")) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  const first = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (first.status !== 401) return first;

  // Не пытаемся refresh'ить сам refresh/logout — иначе цикл.
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/auth/refresh") || url.includes("/api/auth/logout") || url.includes("/api/auth/login")) {
    clearLegacyTokens();
    return first;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    clearLegacyTokens();
    return first;
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  const res = await authFetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await authFetch(queryKey.join("/") as string, {
      method: "GET",
    });

    if (res.status === 401) {
      clearLegacyTokens();
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export { authFetch };
