import { buildTitle, getPageMeta, normalizePath, SITE_NAME, SITE_URL } from "@shared/page-meta";

/**
 * Подстановка SEO-тегов в index.html на стороне сервера.
 *
 * Фронтенд — SPA, и до выполнения JS у всех страниц один и тот же <title>.
 * Поисковик берёт то, что видит сразу, поэтому в выдаче страницы выглядели
 * одинаково, а юридические документы («Публичная оферта» и политики) попадали
 * в индекс наравне с главной. Здесь заголовок, описание, canonical и robots
 * проставляются до отдачи HTML.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Убираем статические теги из шаблона, чтобы не было дублей. */
function stripExistingMeta(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
}

function organizationJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "Нагрузочные устройства Voltkeeper",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/favicon-192.png`,
        image: `${SITE_URL}/og-image.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        inLanguage: "ru-RU",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
  return jsonLdScript(data);
}

/** «voltkeeper.ru › О компании» вместо голого адреса в выдаче. */
function breadcrumbJsonLd(path: string, title: string): string {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${path}` },
    ],
  });
}

function jsonLdScript(data: unknown): string {
  // </script> внутри JSON сломал бы разметку; данные наши, но проверка дешёвая.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

export function injectPageMeta(html: string, pathname: string): string {
  const path = normalizePath(pathname);
  const meta = getPageMeta(path);
  const title = buildTitle(path);
  const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    meta.noindex ? `<meta name="robots" content="noindex, follow" />` : "",
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${SITE_URL}/og-image.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    path === "/" ? organizationJsonLd() : "",
    path !== "/" && !meta.noindex ? breadcrumbJsonLd(path, meta.title) : "",
  ].filter(Boolean);

  return stripExistingMeta(html).replace("</head>", `${tags.join("\n    ")}\n  </head>`);
}

/**
 * В закрытом режиме отдаём заглушку: индексировать там нечего,
 * а «сайт закрыт» в выдаче — худшее, что может случиться.
 */
export function injectPrivateModeMeta(html: string): string {
  return stripExistingMeta(html).replace(
    "</head>",
    `<title>${SITE_NAME}</title>\n    <meta name="robots" content="noindex, nofollow" />\n  </head>`,
  );
}
