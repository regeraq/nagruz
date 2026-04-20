import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

function setMeta(name: string, content: string | null | undefined, attr: "name" | "property" = "name") {
  if (typeof document === "undefined") return;
  if (!content) {
    const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (existing) existing.setAttribute("content", "");
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

/**
 * Hook для динамического обновления <title> и SEO meta-тэгов из настроек сайта.
 * На главной (/) <title> не трогаем — там он зависит от выбранного устройства.
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
    const settings = (settingsData?.settings || []) as Array<{ key: string; value?: string }>;
    const byKey = (k: string) => settings.find((s) => s.key === k)?.value || "";

    const siteTitle = byKey("site_title");
    const seoTitle = byKey("seo_title");
    const seoDescription = byKey("seo_description") || byKey("site_description");
    const seoKeywords = byKey("seo_keywords");

    // <title>: на главной не трогаем
    if (location !== "/") {
      const title = seoTitle || siteTitle || "Нагрузочные устройства";
      if (document.title !== title) document.title = title;
    }

    // SEO meta — глобально, для всех страниц
    setMeta("description", seoDescription);
    setMeta("keywords", seoKeywords);

    // Open Graph (для шаринга)
    setMeta("og:title", seoTitle || siteTitle, "property");
    setMeta("og:description", seoDescription, "property");
    setMeta("og:type", "website", "property");
  }, [settingsData, location]);
}
