/**
 * Единый каталог текстов сайта.
 * Админка показывает эти поля, публичные страницы читают сохранённое значение
 * или fallback — текущий текст сайта.
 */

export type ContentField = {
  key: string;
  label: string;
  fallback: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  section?: string;
};

export type ContentGroupDef = {
  id: string;
  label: string;
  items: ContentField[];
};

export type ContentKind = "text" | "list" | "cards" | "stats" | "stats3" | "faq";

export type ContentPageDef = {
  id: string;
  label: string;
  description: string;
  groupIds: string[];
};

/** Страницы так, как их видит человек на сайте — не технические блоки. */
export const CONTENT_PAGES: ContentPageDef[] = [
  { id: "home", label: "Главная", description: "Первая страница, сверху вниз", groupIds: ["home", "home_sections", "home_contact"] },
  { id: "about", label: "О компании", description: "Страница «О компании»", groupIds: ["about"] },
  { id: "faq", label: "Вопросы и ответы", description: "Страница с вопросами", groupIds: ["faq"] },
  { id: "contacts", label: "Контакты", description: "Страница «Контакты»", groupIds: ["contacts"] },
  { id: "nav", label: "Меню сверху", description: "Кнопки в шапке на всех страницах", groupIds: ["nav"] },
  { id: "footer", label: "Подвал", description: "Низ каждой страницы", groupIds: ["footer"] },
  { id: "legal", label: "Документы", description: "Политики и оферта", groupIds: ["legal"] },
  { id: "errors", label: "Страница не найдена", description: "Что видит человек, если ссылка битая", groupIds: ["errors"] },
];

export const SECTION_LABELS: Record<string, string> = {
  nav: "Пункты меню",
  hero: "Самый верх страницы",
  purpose: "Блок «Назначение»",
  benefits: "Преимущества",
  specs: "Характеристики",
  delivery: "Что входит в комплект",
  docs: "Документы и сертификаты",
  gallery: "Фотографии",
  apps: "Где применяют",
  about: "О компании",
  contact: "Форма заявки",
  footer: "Подвал",
  intro: "Заголовок страницы",
  cards: "Карточки",
  map: "Карта",
  info: "Режим работы и доп. контакты",
  form: "Форма на странице",
  privacy: "Политика конфиденциальности",
  processing: "Политика обработки данных",
  offer: "Публичная оферта",
  "404": "Сообщение об ошибке",
  faq: "Список вопросов",
};

const KIND_BY_KEY: Record<string, ContentKind> = {
  home_purpose_params: "list",
  home_advantages: "cards",
  home_delivery_equipment: "list",
  home_delivery_docs: "list",
  home_docs_certs: "cards",
  home_applications: "cards",
  home_about_stats: "stats",
  about_values: "list",
  about_stats: "stats3",
  about_clients_industries: "list",
  faq_items: "faq",
};

export function getContentKind(key: string): ContentKind {
  return KIND_BY_KEY[key] || "text";
}

export const CONTENT_GROUPS: ContentGroupDef[] = [
  {
    id: "nav",
    label: "Меню",
    items: [
      { key: "nav_home", label: "Главная", fallback: "Главная", section: "nav" },
      { key: "nav_specifications", label: "Характеристики", fallback: "Характеристики", section: "nav" },
      { key: "nav_gallery", label: "Галерея", fallback: "Галерея", section: "nav" },
      { key: "nav_applications", label: "Применение", fallback: "Применение", section: "nav" },
      { key: "nav_documentation", label: "Документация", fallback: "Документация", section: "nav" },
      { key: "nav_contacts", label: "Контакты", fallback: "Контакты", section: "nav" },
      { key: "nav_device_fallback", label: "Подпись, если модель не выбрана", fallback: "Устройство", section: "nav" },
      { key: "nav_profile", label: "Профиль", fallback: "Профиль", section: "nav" },
      { key: "nav_admin", label: "Админ-панель", fallback: "Админ-панель", section: "nav" },
      { key: "nav_logout", label: "Выйти", fallback: "Выйти", section: "nav" },
      { key: "nav_login", label: "Войти", fallback: "Войти", section: "nav" },
      { key: "nav_register", label: "Регистрация", fallback: "Регистрация", section: "nav" },
    ],
  },
  {
    id: "home",
    label: "Главная — герой и назначение",
    items: [
      { key: "home_hero_badge", label: "Бейдж над заголовком", fallback: "Новое оборудование 2025 года", section: "hero" },
      { key: "home_hero_cta", label: "Кнопка «получить спецификацию»", fallback: "Получить спецификацию", section: "hero" },
      { key: "home_hero_cta_secondary", label: "Кнопка «характеристики»", fallback: "Технические характеристики", section: "hero" },
      { key: "home_hero_buy", label: "Кнопка «Купить»", fallback: "Купить", section: "hero" },
      { key: "home_hero_scroll", label: "Подсказка прокрутки", fallback: "Прокрутите вниз", section: "hero" },
      { key: "home_hero_unit_kw", label: "Единица мощности", fallback: "кВт", section: "hero" },
      { key: "home_purpose_badge", label: "Бейдж «Назначение»", fallback: "Назначение", section: "purpose" },
      { key: "home_purpose_title", label: "Заголовок назначения", fallback: "Точная имитация нагрузки", section: "purpose" },
      {
        key: "home_purpose_p1",
        label: "Абзац 1",
        fallback: "Устройство предназначено для точной имитации реальной нагрузки, полностью контролируемой и стабильной, в отличие от непредсказуемой реальной нагрузки.",
        section: "purpose",
        multiline: true,
      },
      {
        key: "home_purpose_p2",
        label: "Абзац 2",
        fallback: "Оборудование позволяет тестировать качество вырабатываемой электроэнергии и оценивать работоспособность источников питания под различными нагрузками.",
        section: "purpose",
        multiline: true,
      },
      { key: "home_purpose_params_heading", label: "Заголовок параметров", fallback: "Тестируемые параметры:", section: "purpose" },
      {
        key: "home_purpose_params",
        label: "Параметры (по одному в строке)",
        fallback: "Мощность\nТок и напряжение\nГармоники и форма сигнала\nКоэффициент мощности",
        section: "purpose",
        multiline: true,
        hint: "Каждая строка — отдельный пункт.",
      },
    ],
  },
  {
    id: "home_sections",
    label: "Главная — блоки",
    items: [
      { key: "home_benefits_badge", label: "Бейдж преимуществ", fallback: "Преимущества", section: "benefits" },
      { key: "home_benefits_title", label: "Заголовок преимуществ", fallback: "Ключевые преимущества устройства", section: "benefits" },
      { key: "home_benefits_subtitle", label: "Подзаголовок преимуществ", fallback: "Профессиональное решение для комплексного тестирования электрооборудования", section: "benefits", multiline: true },
      {
        key: "home_advantages",
        label: "Карточки преимуществ, если у товара нет своих",
        fallback: "20 ступеней нагрузки | Точная регулировка от 5 до 100 кВт с шагом 5 кВт, формируемых комбинациями 7 кнопок\nAC/DC совместимость | Работа с переменным током (230-400 В, 50 Гц) и постоянным током (110-220 В)\nОбъединение устройств | Возможность подключения нескольких устройств для увеличения суммарной мощности\nВысокий cos φ ≥ 0.99 | Оптимальный коэффициент мощности для точного моделирования реальной нагрузки\nСистема защиты | Защита от перегрева, отсутствия охлаждения, перегрузки и короткого замыкания\nКлиматическое исполнение | Работа на улице и в помещении при температуре от −40°C до +40°C",
        section: "benefits",
        multiline: true,
        rows: 8,
        hint: "Формат: заголовок | описание. По одной карточке в строке. Если у товара заполнены преимущества в разделе «Товары» — они важнее.",
      },
      { key: "home_specs_badge", label: "Бейдж характеристик", fallback: "Характеристики", section: "specs" },
      { key: "home_specs_title", label: "Заголовок характеристик", fallback: "Технические характеристики", section: "specs" },
      { key: "home_specs_subtitle", label: "Подзаголовок характеристик", fallback: "Полная спецификация нагрузочного устройства {device}", section: "specs", hint: "{device} заменяется на название модели." },
      { key: "home_specs_order", label: "Кнопка заказа в характеристиках", fallback: "Заказать {device}", section: "specs" },
      { key: "home_delivery_badge", label: "Бейдж комплектации", fallback: "Комплектация", section: "delivery" },
      { key: "home_delivery_title", label: "Заголовок комплектации", fallback: "Комплект поставки", section: "delivery" },
      { key: "home_delivery_subtitle", label: "Подзаголовок комплектации", fallback: "Полная комплектация оборудования и документации", section: "delivery" },
      { key: "home_delivery_equipment_title", label: "Заголовок списка оборудования", fallback: "Оборудование", section: "delivery" },
      {
        key: "home_delivery_equipment",
        label: "Список оборудования",
        fallback: "2 блока переменного тока (AC)\n2 блока постоянного тока (DC)\nКабель 4×50 мм²\nКабель 2×185 мм²\nКабель 3×1.5 мм²\nКомплекты колёс для транспортировки",
        section: "delivery",
        multiline: true,
        hint: "По одному пункту в строке.",
      },
      { key: "home_delivery_docs_title", label: "Заголовок списка документов", fallback: "Документация", section: "delivery" },
      {
        key: "home_delivery_docs",
        label: "Список документов",
        fallback: "Методика поверки (копия)\nАттестат и протокол аттестации\nСвидетельство об утверждении типа СИ\nСвидетельство о первичной поверке",
        section: "delivery",
        multiline: true,
      },
      { key: "home_docs_badge", label: "Бейдж сертификации", fallback: "Соответствие", section: "docs" },
      { key: "home_docs_title", label: "Заголовок сертификации", fallback: "Документы и сертификация", section: "docs" },
      { key: "home_docs_subtitle", label: "Подзаголовок сертификации", fallback: "Полное соответствие стандартам и требованиям безопасности", section: "docs" },
      {
        key: "home_docs_certs",
        label: "Карточки сертификатов",
        fallback: "ГОСТ РФ | Соответствие ГОСТам\nБезопасность | Требования РФ\nФИФ | Внесено в фонд\nПоверка | Первичная поверка",
        section: "docs",
        multiline: true,
        hint: "Формат: заголовок | описание",
      },
      { key: "home_docs_cta_title", label: "Заголовок CTA сертификации", fallback: "Новое оборудование 2025 года выпуска", section: "docs" },
      { key: "home_docs_cta_text", label: "Текст CTA сертификации", fallback: "Соответствие всем современным стандартам качества и безопасности", section: "docs", multiline: true },
      { key: "home_docs_cta_button", label: "Кнопка CTA сертификации", fallback: "Узнать больше", section: "docs" },
      { key: "home_gallery_badge", label: "Бейдж галереи", fallback: "Фотогалерея", section: "gallery" },
      { key: "home_gallery_title", label: "Заголовок галереи", fallback: "Фотографии устройства {device}", section: "gallery" },
      { key: "home_gallery_subtitle", label: "Подзаголовок галереи", fallback: "Ознакомьтесь с фотографиями нагрузочного устройства", section: "gallery" },
      { key: "home_gallery_loading", label: "Текст загрузки фото", fallback: "Загрузка фотографий...", section: "gallery" },
      { key: "home_gallery_empty", label: "Текст, если фото нет", fallback: "Фотографии устройства скоро появятся", section: "gallery" },
      { key: "home_apps_badge", label: "Бейдж применения", fallback: "Применение", section: "apps" },
      { key: "home_apps_title", label: "Заголовок применения", fallback: "Сферы применения", section: "apps" },
      { key: "home_apps_subtitle", label: "Подзаголовок применения", fallback: "Профессиональное тестирование широкого спектра энергетического оборудования", section: "apps" },
      {
        key: "home_applications",
        label: "Карточки применения",
        fallback: "Дизель-генераторы | Испытания и проверка работоспособности дизель-генераторных установок\nГазопоршневые установки | Тестирование ГПУ под различными режимами нагрузки\nГазотурбинные установки | Проверка параметров ГТУ в реальных условиях эксплуатации\nИсточники ИБП | Испытания систем бесперебойного питания\nАккумуляторные батареи | Проверка ёмкости и работоспособности батарей\nКачество электроэнергии | Тестирование параметров электроэнергии различных источников",
        section: "apps",
        multiline: true,
        rows: 8,
        hint: "Формат: заголовок | описание",
      },
      { key: "home_about_badge", label: "Бейдж «О компании» на главной", fallback: "О компании", section: "about" },
      { key: "home_about_title", label: "Заголовок «О компании» на главной", fallback: "Надёжный партнёр в энергетике", section: "about" },
      {
        key: "home_about",
        label: "Текст о компании на главной",
        fallback: "Мы специализируемся на поставке профессионального испытательного оборудования для крупных промышленных заказчиков, включая предприятия атомной энергетики, нефтегазовой отрасли и критической инфраструктуры.",
        section: "about",
        multiline: true,
      },
      {
        key: "home_about_stats",
        label: "Цифры на главной",
        fallback: "15+|Лет опыта\n500+|Проектов\n50+|Отраслей",
        section: "about",
        multiline: true,
        hint: "Формат: значение|подпись",
      },
    ],
  },
  {
    id: "home_contact",
    label: "Главная — форма заявки",
    items: [
      { key: "home_contact_badge", label: "Бейдж формы", fallback: "Контакты", section: "contact" },
      { key: "home_contact_title", label: "Заголовок формы", fallback: "Получить коммерческое предложение", section: "contact" },
      { key: "home_contact_subtitle", label: "Подзаголовок формы", fallback: "Заполните форму, и мы свяжемся с вами в ближайшее время", section: "contact" },
      { key: "home_contact_name", label: "Подпись поля имени", fallback: "Имя и фамилия *", section: "contact" },
      { key: "home_contact_name_ph", label: "Подсказка имени", fallback: "Иван Иванов", section: "contact" },
      { key: "home_contact_phone", label: "Подпись телефона", fallback: "Телефон *", section: "contact" },
      { key: "home_contact_email", label: "Подпись email", fallback: "Email *", section: "contact" },
      { key: "home_contact_company", label: "Подпись компании", fallback: "Компания *", section: "contact" },
      { key: "home_contact_company_ph", label: "Подсказка компании", fallback: "ООО 'Название компании'", section: "contact" },
      { key: "home_contact_message", label: "Подпись сообщения", fallback: "Сообщение *", section: "contact" },
      { key: "home_contact_message_ph", label: "Подсказка сообщения", fallback: "Опишите ваши требования и вопросы...", section: "contact" },
      { key: "home_contact_files", label: "Подпись файлов", fallback: "Прикрепить файлы (опционально)", section: "contact" },
      { key: "home_contact_files_hint", label: "Подсказка выбора файлов", fallback: "Нажмите для выбора файлов", section: "contact" },
      { key: "home_contact_files_limits", label: "Ограничения файлов", fallback: "До 10 МБ каждый, до 50 МБ общий размер", section: "contact" },
      { key: "home_contact_consent_pd", label: "Согласие на обработку ПД", fallback: "Я даю согласие на обработку персональных данных *", section: "contact", multiline: true },
      { key: "home_contact_submit", label: "Кнопка отправки", fallback: "Получить коммерческое предложение", section: "contact" },
      { key: "home_contact_sending", label: "Текст во время отправки", fallback: "Отправка...", section: "contact" },
      { key: "home_contact_info_title", label: "Заголовок блока контактов", fallback: "Контактная информация", section: "contact" },
      { key: "home_contact_phone_label", label: "Подпись телефона в блоке", fallback: "Телефон", section: "contact" },
      { key: "home_contact_email_label", label: "Подпись email в блоке", fallback: "Email", section: "contact" },
      { key: "home_contact_telegram_label", label: "Подпись Telegram в блоке", fallback: "Telegram", section: "contact" },
      { key: "home_contact_address_label", label: "Подпись адреса в блоке", fallback: "Адрес", section: "contact" },
      { key: "home_contact_response_title", label: "Заголовок «время ответа»", fallback: "Время ответа", section: "contact" },
      { key: "home_contact_response_text", label: "Текст «время ответа»", fallback: "Мы отвечаем на заявки в течение 24 часов в рабочие дни", section: "contact", multiline: true },
    ],
  },
  {
    id: "footer",
    label: "Подвал",
    items: [
      { key: "footer_brand_mark", label: "Буквы в логотипе", fallback: "НУ", section: "footer" },
      { key: "footer_tagline_short", label: "Короткое название рядом с моделью", fallback: "Нагрузочное устройство", section: "footer" },
      { key: "footer_tagline", label: "Описание в подвале", fallback: "Профессиональное оборудование для тестирования электрогенераторов и ИБП", section: "footer", multiline: true },
      { key: "footer_nav_title", label: "Заголовок колонки навигации", fallback: "Навигация", section: "footer" },
      { key: "footer_contacts_title", label: "Заголовок колонки контактов", fallback: "Контакты", section: "footer" },
      { key: "footer_copyright", label: "Копирайт", fallback: "© {year} {device}. Все права защищены.", section: "footer", hint: "{year} и {device} подставляются автоматически." },
      { key: "footer_privacy", label: "Ссылка на политику конфиденциальности", fallback: "Политика конфиденциальности", section: "footer" },
      { key: "footer_processing", label: "Ссылка на политику обработки", fallback: "Политика обработки данных", section: "footer" },
      { key: "footer_offer", label: "Ссылка на оферту", fallback: "Публичная оферта", section: "footer" },
    ],
  },
  {
    id: "about",
    label: "О компании",
    items: [
      { key: "about_crumb", label: "Хлебные крошки", fallback: "О нас", section: "about" },
      { key: "about_badge", label: "Бейдж", fallback: "О компании", section: "about" },
      { key: "about_title", label: "Заголовок", fallback: "Надёжный партнёр в энергетике", section: "about" },
      {
        key: "about_intro",
        label: "Вступление",
        fallback: "Мы специализируемся на поставке профессионального испытательного оборудования для крупных промышленных заказчиков",
        section: "about",
        multiline: true,
      },
      { key: "about_mission_title", label: "Заголовок миссии", fallback: "Наша миссия", section: "about" },
      {
        key: "about_mission",
        label: "Текст миссии",
        fallback: "Обеспечить промышленные предприятия надёжным и точным оборудованием для тестирования энергетических систем, способствуя повышению надёжности и безопасности критической инфраструктуры.",
        section: "about",
        multiline: true,
      },
      { key: "about_values_title", label: "Заголовок ценностей", fallback: "Наши ценности", section: "about" },
      {
        key: "about_values",
        label: "Ценности (по строке)",
        fallback: "Надёжность и безопасность превыше всего\nИнновации в каждом решении\nПартнёрство с клиентами\nВысокое качество продукции",
        section: "about",
        multiline: true,
      },
      { key: "about_history_title", label: "Заголовок истории", fallback: "Наша история", section: "about" },
      {
        key: "about_history_p1",
        label: "История, абзац 1",
        fallback: "Компания была основана более 15 лет назад с целью обеспечения промышленных предприятий качественным испытательным оборудованием. За годы работы мы зарекомендовали себя как надёжный поставщик для предприятий атомной энергетики, нефтегазовой отрасли и критической инфраструктуры.",
        section: "about",
        multiline: true,
      },
      {
        key: "about_history_p2",
        label: "История, абзац 2",
        fallback: "Наша команда состоит из опытных инженеров и специалистов, которые понимают специфику работы с энергетическим оборудованием. Мы не просто продаём оборудование — мы предоставляем комплексные решения и поддержку на всех этапах внедрения.",
        section: "about",
        multiline: true,
      },
      {
        key: "about_stats",
        label: "Цифры",
        fallback: "15+|Лет опыта|Более 15 лет работы на рынке испытательного оборудования\n500+|Проектов|Успешно реализованных проектов по всей России\n50+|Отраслей|Работаем с предприятиями различных отраслей промышленности",
        section: "about",
        multiline: true,
        hint: "Формат: число|заголовок|описание",
      },
      { key: "about_clients_title", label: "Заголовок клиентов", fallback: "Наши клиенты", section: "about" },
      { key: "about_clients_industries_title", label: "Заголовок отраслей", fallback: "Ключевые отрасли:", section: "about" },
      {
        key: "about_clients_industries",
        label: "Отрасли",
        fallback: "Атомная энергетика\nНефтегазовая отрасль\nКритическая инфраструктура\nПромышленные предприятия\nЭнергоснабжающие компании",
        section: "about",
        multiline: true,
      },
      { key: "about_clients_geo_title", label: "Заголовок географии", fallback: "География:", section: "about" },
      {
        key: "about_clients_geo",
        label: "Текст географии",
        fallback: "Мы работаем с клиентами по всей территории Российской Федерации, обеспечивая поставку оборудования и техническую поддержку независимо от региона.",
        section: "about",
        multiline: true,
      },
    ],
  },
  {
    id: "faq",
    label: "FAQ",
    items: [
      { key: "faq_crumb", label: "Хлебные крошки", fallback: "Помощь", section: "faq" },
      { key: "faq_badge", label: "Бейдж", fallback: "Помощь", section: "faq" },
      { key: "faq_title", label: "Заголовок", fallback: "Часто задаваемые вопросы", section: "faq" },
      { key: "faq_subtitle", label: "Подзаголовок", fallback: "Найдите ответы на популярные вопросы о нашем оборудовании", section: "faq" },
      {
        key: "faq_items",
        label: "Вопросы и ответы",
        fallback:
          "# Общие вопросы\nЧто такое нагрузочное устройство? || Нагрузочное устройство — это оборудование для имитации электрической нагрузки при тестировании генераторов, ИБП и других источников питания. Оно позволяет создавать контролируемую нагрузку для проверки работоспособности оборудования.\nДля чего используется нагрузочное устройство? || Устройство используется для тестирования дизель-генераторов, газопоршневых установок, ИБП, аккумуляторных батарей и проверки качества вырабатываемой электроэнергии. Оно обеспечивает точную имитацию реальной нагрузки.\n# Технические характеристики\nКакая максимальная мощность устройств? || Мы предлагаем два варианта: НУ-100 (до 100 кВт) и НУ-30 (до 30 кВт). Оба устройства поддерживают работу с переменным (AC) и постоянным (DC) током.\nМожно ли объединить несколько устройств? || Да, несколько устройств можно подключить параллельно для увеличения суммарной мощности. Это позволяет масштабировать систему под конкретные требования.\nКакие условия эксплуатации? || Устройства работают на улице и в помещении при температуре от −40°C до +40°C, при влажности до 80% при 25°С. Охлаждение — воздушное принудительное.\n# Покупка и доставка\nКак оформить заказ? || Вы можете оформить заказ через форму на сайте, выбрав нужную модель и количество. Также можно связаться с нами по телефону или email для получения коммерческого предложения.\nКакие способы оплаты доступны? || Мы принимаем оплату банковскими картами и через СБП (QR-код). Возможна оплата по договору для юридических лиц.\nКакова стоимость доставки? || Стоимость доставки рассчитывается индивидуально в зависимости от региона и способа доставки. Мы работаем с надёжными транспортными компаниями по всей России.\n# Гарантия и обслуживание\nКакая гарантия на оборудование? || На все оборудование предоставляется гарантия производителя. Срок гарантии и условия обслуживания уточняются при оформлении заказа.\nПредоставляется ли техническая поддержка? || Да, мы предоставляем техническую поддержку на всех этапах: от консультации при выборе оборудования до помощи в эксплуатации. Наши специалисты всегда готовы ответить на ваши вопросы.\nКакая документация входит в комплект? || В комплект входит паспорт изделия, руководство по эксплуатации, методика поверки, аттестат и протокол аттестации, свидетельство об утверждении типа СИ, свидетельство о первичной поверке.\n# Соответствие и сертификация\nСоответствует ли оборудование ГОСТам? || Да, все оборудование соответствует требованиям ГОСТ РФ, имеет необходимые сертификаты и внесено в фонд измерительных приборов (ФИФ).",
        section: "faq",
        multiline: true,
        rows: 16,
        hint: "Строка «# Категория» начинает раздел. Вопрос и ответ разделяйте « || ».",
      },
      { key: "faq_cta_title", label: "Заголовок CTA", fallback: "Не нашли ответ на свой вопрос?", section: "faq" },
      { key: "faq_cta_text", label: "Текст CTA", fallback: "Свяжитесь с нами, и мы с радостью поможем вам", section: "faq" },
      { key: "faq_cta_button", label: "Ссылка CTA", fallback: "Связаться с нами →", section: "faq" },
    ],
  },
  {
    id: "contacts",
    label: "Контакты",
    items: [
      { key: "contacts_crumb", label: "Хлебные крошки", fallback: "Контакты", section: "intro" },
      { key: "contacts_badge", label: "Бейдж", fallback: "Контакты", section: "intro" },
      { key: "contacts_title", label: "Заголовок", fallback: "Свяжитесь с нами", section: "intro" },
      { key: "contacts_intro", label: "Вступительный текст", fallback: "Мы всегда готовы ответить на ваши вопросы и помочь с выбором оборудования", section: "intro", multiline: true },
      { key: "contacts_phone_title", label: "Карточка телефона", fallback: "Телефон", section: "cards" },
      { key: "contacts_phone_action", label: "Кнопка «Позвонить»", fallback: "Позвонить", section: "cards" },
      { key: "contacts_email_title", label: "Карточка email", fallback: "Email", section: "cards" },
      { key: "contacts_email_hint", label: "Подпись email", fallback: "Ответим в течение 24 часов", section: "cards" },
      { key: "contacts_email_action", label: "Кнопка «Написать»", fallback: "Написать", section: "cards" },
      { key: "contacts_address_title", label: "Карточка адреса", fallback: "Адрес", section: "cards" },
      { key: "contacts_map_caption", label: "Подпись карты", fallback: "", section: "map" },
      { key: "contacts_map_action", label: "Кнопка карты", fallback: "Открыть карту", section: "map" },
      { key: "contacts_hours_title", label: "Заголовок режима работы", fallback: "Режим работы", section: "info" },
      { key: "contacts_working_hours", label: "Часы работы", fallback: "Пн-Пт: 9:00 - 18:00 МСК", section: "info", hint: "Если пусто — берётся значение из Настройки → Контактные данные." },
      { key: "contacts_extra_title", label: "Заголовок доп. контактов", fallback: "Дополнительные контакты", section: "info" },
      { key: "contacts_form_title", label: "Заголовок формы", fallback: "Форма обратной связи", section: "form" },
      { key: "contacts_form_submit", label: "Кнопка отправки", fallback: "Отправить заявку", section: "form" },
    ],
  },
  {
    id: "legal",
    label: "Юридические страницы",
    items: [
      { key: "legal_privacy_title", label: "Заголовок политики конфиденциальности", fallback: "Политика конфиденциальности", section: "privacy" },
      {
        key: "legal_privacy_body",
        label: "Полный текст политики конфиденциальности",
        fallback: "",
        section: "privacy",
        multiline: true,
        rows: 14,
        hint: "Если пусто — на сайте остаётся стандартный текст. Можно вставить свой: абзацы через пустую строку, заголовок с «# » или «1. », списки с «- ». Подстановки: {{operator_name}}, {{operator_inn}}, {{operator_ogrn}}, {{responsible_person}}, {{contact_email}}, {{contact_phone}}, {{contact_address}}.",
      },
      { key: "legal_processing_title", label: "Заголовок политики обработки ПД", fallback: "Политика обработки персональных данных", section: "processing" },
      {
        key: "legal_processing_body",
        label: "Полный текст политики обработки ПД",
        fallback: "",
        section: "processing",
        multiline: true,
        rows: 14,
        hint: "Если пусто — стандартный текст. Те же подстановки {{operator_name}} и т.д.",
      },
      { key: "legal_offer_title", label: "Заголовок оферты", fallback: "Публичная оферта", section: "offer" },
      {
        key: "legal_offer_body",
        label: "Полный текст оферты",
        fallback: "",
        section: "offer",
        multiline: true,
        rows: 14,
        hint: "Если пусто — стандартный текст. Те же подстановки.",
      },
    ],
  },
  {
    id: "errors",
    label: "404 и служебные",
    items: [
      { key: "error_404_code", label: "Код ошибки", fallback: "404", section: "404" },
      { key: "error_404_title", label: "Заголовок 404", fallback: "Страница не найдена", section: "404" },
      { key: "error_404_text", label: "Текст 404", fallback: "Запрашиваемая страница не существует или была перемещена.", section: "404" },
      { key: "error_404_button", label: "Кнопка 404", fallback: "Вернуться на главную", section: "404" },
    ],
  },
];

const FALLBACK_BY_KEY = new Map<string, string>();
const FIELD_BY_KEY = new Map<string, ContentField>();
for (const group of CONTENT_GROUPS) {
  for (const item of group.items) {
    FALLBACK_BY_KEY.set(item.key, item.fallback);
    FIELD_BY_KEY.set(item.key, item);
  }
}

export function getContentFallback(key: string): string {
  return FALLBACK_BY_KEY.get(key) ?? "";
}

export function getContentField(key: string): ContentField | undefined {
  return FIELD_BY_KEY.get(key);
}

export function interpolate(
  text: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}|\{([a-z0-9_]+)\}/gi, (_m, brace2, brace1) => {
    const name = String(brace2 || brace1 || "");
    const value = vars[name];
    return value == null ? "" : String(value);
  });
}

export function parseLineList(text: string, keepEmpty = false): string[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim());
  if (keepEmpty) return rows.length ? rows : [""];
  return rows.filter(Boolean);
}

export function parseTitleDescLines(text: string, keepEmpty = false): { title: string; description: string }[] {
  const source = keepEmpty
    ? (text.length ? text.split(/\r?\n/) : [""])
    : parseLineList(text);
  const rows = source.map((line) => {
    const sep = line.includes(" | ") ? " | " : "|";
    const [title, ...rest] = line.split(sep);
    return { title: (title || "").trim(), description: rest.join(sep).trim() };
  });
  if (keepEmpty) return rows.length ? rows : [{ title: "", description: "" }];
  return rows.filter((row) => row.title);
}

export function parseStatLines(text: string, keepEmpty = false): { value: string; label: string; description?: string }[] {
  const source = keepEmpty
    ? (text.length ? text.split(/\r?\n/) : [""])
    : parseLineList(text);
  const rows = source.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    return { value: parts[0] || "", label: parts[1] || "", description: parts[2] };
  });
  if (keepEmpty) return rows.length ? rows : [{ value: "", label: "", description: "" }];
  return rows.filter((row) => row.value || row.label);
}

export type FaqParsedItem = { category: string; question: string; answer: string };

export function serializeLineList(items: string[]): string {
  return items.map((s) => s.replace(/^\s*[-•]\s*/, "")).join("\n");
}

export function serializeTitleDescLines(items: { title: string; description: string }[]): string {
  return items
    .map((row) => `${(row.title || "").trim()} | ${(row.description || "").trim()}`)
    .join("\n");
}

export function serializeStatLines(items: { value: string; label: string; description?: string }[], withDescription = false): string {
  return items
    .map((row) => {
      const value = (row.value || "").trim();
      const label = (row.label || "").trim();
      const description = (row.description || "").trim();
      const parts = [value, label];
      if (withDescription || description) parts.push(description);
      return parts.join("|");
    })
    .join("\n");
}

export function serializeFaqText(items: FaqParsedItem[]): string {
  const lines: string[] = [];
  let lastCategory = "";
  for (const item of items) {
    const category = (item.category || "").trim() || "Общие вопросы";
    const question = (item.question || "").trim();
    const answer = (item.answer || "").trim();
    if (category !== lastCategory) {
      lines.push(`# ${category}`);
      lastCategory = category;
    }
    lines.push(`${question} || ${answer}`);
  }
  return lines.join("\n");
}

export function parseFaqText(text: string, keepEmpty = false): FaqParsedItem[] {
  const items: FaqParsedItem[] = [];
  let category = "Общие вопросы";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      category = line.replace(/^#\s*/, "").trim() || category;
      continue;
    }
    const sep = line.includes(" || ") ? " || " : "||";
    const [question, ...rest] = line.split(sep);
    const answer = rest.join(sep).trim();
    if (question?.trim() && answer) {
      items.push({ category, question: question.trim(), answer });
    } else if (keepEmpty) {
      items.push({ category, question: (question || "").trim(), answer });
    }
  }
  if (keepEmpty && items.length === 0) {
    items.push({ category: "Общие вопросы", question: "", answer: "" });
  }
  return items;
}
