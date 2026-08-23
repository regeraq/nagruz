import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getContentFallback,
  interpolate,
  parseFaqText,
  parseLineList,
  parseStatLines,
  parseTitleDescLines,
} from "@shared/content-catalog";

type ContentRow = { key: string; value?: string | null };

export function useSiteContent() {
  const { data } = useQuery<{ success?: boolean; content?: ContentRow[] }>({
    queryKey: ["/api/content"],
    queryFn: async () => {
      const res = await fetch("/api/content");
      if (!res.ok) return { success: true, content: [] };
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of data?.content || []) {
      if (row?.key && row.value != null && String(row.value).trim() !== "") {
        m.set(row.key, String(row.value));
      }
    }
    return m;
  }, [data]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number | undefined | null>) => {
      const raw = map.get(key) ?? getContentFallback(key);
      return vars ? interpolate(raw, vars) : raw;
    },
    [map],
  );

  const lines = useCallback((key: string) => parseLineList(t(key)), [t]);
  const pairs = useCallback((key: string) => parseTitleDescLines(t(key)), [t]);
  const stats = useCallback((key: string) => parseStatLines(t(key)), [t]);
  const faq = useCallback((key: string) => parseFaqText(t(key)), [t]);

  return { t, lines, pairs, stats, faq, map };
}
