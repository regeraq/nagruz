import { useQuery } from "@tanstack/react-query";

export type SiteAccess = {
  privateMode: boolean;
  registrationEnabled: boolean;
  notice: string;
};

const FALLBACK: SiteAccess = {
  privateMode: false,
  registrationEnabled: true,
  notice: "Сайт временно закрыт: идут технические работы.",
};

export const SITE_ACCESS_QUERY_KEY = ["/api/site-access"];

/**
 * Состояние «сайт открыт / закрыт». Запрос дешёвый и обязан работать до входа,
 * поэтому идёт напрямую, без общего queryFn с обработкой 401.
 */
export function useSiteAccess() {
  const { data, isLoading } = useQuery<SiteAccess>({
    queryKey: SITE_ACCESS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/site-access", { credentials: "include" });
      if (!res.ok) return FALLBACK;
      const json = await res.json();
      return {
        privateMode: Boolean(json?.privateMode),
        registrationEnabled: json?.registrationEnabled !== false,
        notice: String(json?.notice || FALLBACK.notice),
      };
    },
    staleTime: 30 * 1000,
  });

  return { access: data ?? FALLBACK, isLoading };
}
