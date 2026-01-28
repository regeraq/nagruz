import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = "Произошла ошибка";
    
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          // Use server-provided message if available
          if (json.message) {
            errorMessage = json.message;
          } else {
            // Map status codes to user-friendly messages
            if (res.status === 401) {
              errorMessage = "Требуется авторизация";
            } else if (res.status === 403) {
              errorMessage = "Доступ запрещен";
            } else if (res.status === 404) {
              errorMessage = "Ресурс не найден";
            } else if (res.status === 400) {
              errorMessage = "Неверный запрос";
            } else if (res.status >= 500) {
              errorMessage = "Ошибка сервера. Попробуйте позже";
            }
          }
        } catch {
          // If JSON parsing fails, use status-based message
          if (res.status === 401) {
            errorMessage = "Требуется авторизация";
          } else if (res.status === 403) {
            errorMessage = "Доступ запрещен";
          } else if (res.status === 404) {
            errorMessage = "Ресурс не найден";
          } else if (res.status >= 500) {
            errorMessage = "Ошибка сервера. Попробуйте позже";
          }
        }
      }
    } catch {
      // Fallback to status-based message
      if (res.status === 401) {
        errorMessage = "Требуется авторизация";
      } else if (res.status === 403) {
        errorMessage = "Доступ запрещен";
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

/**
 * Gets CSRF token from cookie or fetches from server
 * CSRF token is set by server in cookie and should be sent in header
 */
function getCsrfToken(): string | null {
  // Try to get token from meta tag (set by server)
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (metaToken) return metaToken;
  
  // Fallback: try to read from cookie (for development)
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return value;
    }
  }
  return null;
}

/**
 * Fetch CSRF token from server
 */
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/csrf-token", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token || null;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add JWT token if available
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let csrfToken = getCsrfToken();
    
    // If no token found, try to fetch it from server
    if (!csrfToken) {
      csrfToken = await fetchCsrfToken();
    }
    
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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
    const headers: Record<string, string> = {};
    
    // Add JWT token if available
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
      staleTime: 5 * 60 * 1000, // 5 minutes - keep data fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer (formerly cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
