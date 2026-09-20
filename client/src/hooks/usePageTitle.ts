import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildTitle, getPageMeta, normalizePath, SITE_NAME, SITE_URL } from "@shared/page-meta";

function setMeta(name: string, content: string | null | undefined, attr: "name" | "property" = "name") {
  if (typeof document === "undefined") return;
  if (!content) {
    const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (existing) existing.remove();
    return;
  }
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(href: string) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Держит <title> и SEO-теги в актуальном состоянии при переходах внутри SPA.
 *
 * Первый ответ сервера уже содержит правильные теги (server/pageMeta.ts) —
 * этот хук нужен для навигации без перезагрузки, когда HTML не запрашивается
 * заново. Источник заголовков общий: shared/page-meta.ts.
 *
 * На главной <title> не трогаем — там он зависит от выбранного устройства.
 */
export function usePageTitle() {
  const [location] = useLocation();
  const { data: settingsData } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const path = normalizePath(location);
    const isHome = path === "/";
    const page = getPageMeta(path);

    const settings = (settingsData?.settings || []) as Array<{ key: string; value?: string }>;
    const byKey = (k: string) => settings.find((s) => s.key === k)?.value || "";

    // Настройками из админки можно переопределить только главную:
    // у внутренних страниц заголовок должен отличаться, иначе выдача
    // превращается в список одинаковых строк.
    const title = isHome
      ? byKey("seo_title") || byKey("site_title") || buildTitle("/")
      : buildTitle(path);
    const description = isHome
      ? byKey("seo_description") || byKey("site_description") || page.description
      : page.description;

    if (document.title !== title) document.title = title;

    setMeta("description", description);
    setMeta("keywords", byKey("seo_keywords"));
    setMeta("robots", page.noindex ? "noindex, follow" : null);
    setCanonical(`${SITE_URL}${isHome ? "/" : path}`);

    setMeta("og:type", "website", "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", `${SITE_URL}${isHome ? "/" : path}`, "property");
  }, [settingsData, location]);
}
