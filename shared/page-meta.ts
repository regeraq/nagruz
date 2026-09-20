/**
 * Заголовки и описания страниц для поисковиков.
 *
 * Сайт — SPA, поэтому теги подставляет сервер при отдаче HTML
 * (см. server/pageMeta.ts). Иначе робот видит один и тот же заголовок
 * на всех страницах, и в выдаче получается каша.
 */

export const SITE_NAME = "Voltkeeper";
export const SITE_URL = "https://voltkeeper.ru";

export type PageMetaDef = {
  /** Заголовок без названия сайта — суффикс добавляется отдельно. */
  title: string;
  description: string;
  /** Страница не должна попадать в поисковую выдачу. */
  noindex?: boolean;
};

export const DEFAULT_DESCRIPTION =
  "Нагрузочные устройства НУ-100, НУ-200 и НУ-30 для испытаний дизель-генераторов, ГПУ, ГТУ, ИБП и аккумуляторных батарей. Поставка по России.";

const PAGE_META: Record<string, PageMetaDef> = {
  "/": {
    title: "Нагрузочные устройства для испытаний генераторов и ИБП",
    description: DEFAULT_DESCRIPTION,
  },
  "/about": {
    title: "О компании",
    description:
      "Поставляем испытательное оборудование предприятиям атомной энергетики, нефтегазовой отрасли и критической инфраструктуры. Более 15 лет на рынке.",
  },
  "/faq": {
    title: "Вопросы и ответы",
    description:
      "Ответы на частые вопросы о нагрузочных устройствах: мощность, условия эксплуатации, доставка, гарантия, документация и сертификация.",
  },
  "/contacts": {
    title: "Контакты",
    description:
      "Телефон, электронная почта и адрес для заказа нагрузочных устройств. Отвечаем на заявки в течение рабочего дня.",
  },

  // Юридические страницы нужны людям на сайте, но в поиске они только мешают:
  // по запросу о компании выдача забивалась «Публичной офертой» и политиками.
  "/privacy-policy": {
    title: "Политика конфиденциальности",
    description: "Политика конфиденциальности сайта.",
    noindex: true,
  },
  "/data-processing-policy": {
    title: "Политика обработки персональных данных",
    description: "Политика обработки персональных данных.",
    noindex: true,
  },
  "/public-offer": {
    title: "Публичная оферта",
    description: "Условия публичной оферты.",
    noindex: true,
  },

  // Личные разделы и технические редиректы.
  "/login": { title: "Вход", description: "Вход в личный кабинет.", noindex: true },
  "/register": { title: "Регистрация", description: "Создание учётной записи.", noindex: true },
  "/profile": { title: "Личный кабинет", description: "Личный кабинет.", noindex: true },
  "/admin": { title: "Админ-панель", description: "Панель управления сайтом.", noindex: true },
  "/applications": { title: "Применение", description: "Сферы применения нагрузочных устройств.", noindex: true },
  "/specifications": { title: "Характеристики", description: "Технические характеристики.", noindex: true },
  "/documentation": { title: "Документация", description: "Документация и сертификаты.", noindex: true },
};

/** Страницы, которые имеет смысл отдавать в sitemap.xml. */
export const INDEXABLE_PATHS = Object.keys(PAGE_META).filter((p) => !PAGE_META[p].noindex);

export function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const clean = pathname.split("?")[0].split("#")[0];
  const trimmed = clean.replace(/\/+$/, "");
  return trimmed || "/";
}

export function getPageMeta(pathname: string): PageMetaDef {
  const meta = PAGE_META[normalizePath(pathname)];
  if (meta) return meta;
  // Неизвестный адрес — это 404, в индексе ему делать нечего.
  return { title: "Страница не найдена", description: DEFAULT_DESCRIPTION, noindex: true };
}

/** «О компании — Voltkeeper»: так поисковик показывает бренд в конце строки. */
export function buildTitle(pathname: string, siteName = SITE_NAME): string {
  return `${getPageMeta(pathname).title} — ${siteName}`;
}
