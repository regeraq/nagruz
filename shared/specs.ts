import { z } from "zod";

/**
 * Формат богатых характеристик товара.
 * Хранится внутри текстового поля `products.specifications` как JSON.
 * Если поле не JSON — работает fallback на старый «Ключ: значение»-формат.
 *
 * version поле оставлено для будущих миграций структуры.
 */
export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecBlock {
  /** Заголовок карточки (напр. «Общие параметры», «Габариты и масса»). */
  title: string;
  /** Описание карточки (опционально, выводится серым шрифтом). */
  description?: string;
  /** Табличные строки «параметр — значение». */
  rows: SpecRow[];
  /** Необязательный список пунктов-индикаторов (с галочкой). */
  indicators?: string[];
}

export interface SpecTab {
  /** Уникальный id таба, напр. `general`, `ac`, `dc`, либо пользовательский. */
  id: string;
  /** Подпись таба в навигации вверху. */
  label: string;
  /** Один или несколько блоков внутри таба. */
  blocks: SpecBlock[];
}

export interface ProductSpecGroups {
  version: 1;
  /** Заголовок секции (над табами). По умолчанию «Технические характеристики». */
  heading?: string;
  /** Подзаголовок. По умолчанию «Полная спецификация {name}». */
  subheading?: string;
  tabs: SpecTab[];
}

const specRowSchema = z.object({
  label: z.string().trim().min(1, "Название параметра обязательно").max(200),
  value: z.string().trim().min(0).max(500),
});

const specBlockSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  rows: z.array(specRowSchema).max(50),
  indicators: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
});

const specTabSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9][a-z0-9-_]*$/i, "Только латиница, цифры, -_"),
  label: z.string().trim().min(1).max(80),
  blocks: z.array(specBlockSchema).min(1).max(10),
});

export const productSpecGroupsSchema = z.object({
  version: z.literal(1),
  heading: z.string().trim().max(200).optional(),
  subheading: z.string().trim().max(400).optional(),
  tabs: z.array(specTabSchema).min(1).max(8),
});

/**
 * Пытается распарсить поле `specifications` как JSON богатой структуры.
 * Возвращает null, если это обычный текст.
 */
export function parseSpecGroups(raw: string | null | undefined): ProductSpecGroups | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const result = productSpecGroupsSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Безопасная сериализация. */
export function serializeSpecGroups(groups: ProductSpecGroups): string {
  return JSON.stringify(groups);
}

/**
 * Генерирует разумный дефолтный набор табов на основе старого текстового
 * формата «Ключ: значение». Используется, когда админ впервые открывает
 * редактор и хочет быстро мигрировать контент.
 */
export function buildDefaultSpecGroups(productName: string, rawText?: string | null): ProductSpecGroups {
  const generalRows: SpecRow[] = [];
  if (rawText) {
    const lines = rawText.split(/\r?\n|,/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^([^:–—-]+)[:\u2013\u2014-]\s*(.+)$/);
      if (m) {
        generalRows.push({ label: m[1].trim(), value: m[2].trim() });
      } else {
        generalRows.push({ label: line, value: "" });
      }
    }
  }

  return {
    version: 1,
    heading: "Технические характеристики",
    subheading: `Полная спецификация нагрузочного устройства ${productName}`.trim(),
    tabs: [
      {
        id: "general",
        label: "Общие",
        blocks: [
          {
            title: "Общие параметры",
            rows: generalRows.length
              ? generalRows
              : [
                  { label: "Суммарная мощность", value: "" },
                  { label: "Режим работы", value: "Непрерывный" },
                  { label: "Частота (AC)", value: "50 Гц ±1%" },
                  { label: "Фазность", value: "3 фазы" },
                  { label: "Условия эксплуатации", value: "+1…+40 °C" },
                  { label: "Охлаждение", value: "Воздушное принудительное" },
                ],
          },
          {
            title: "Габариты и масса",
            rows: [
              { label: "Размеры", value: "1400 × 1100 × 1400 мм" },
              { label: "Масса", value: "До 350 кг" },
              { label: "Питание", value: "220 В ±10%" },
            ],
          },
        ],
      },
      {
        id: "ac",
        label: "Блок AC",
        blocks: [
          {
            title: "Блок переменного тока (AC)",
            description: "Параметры работы с трёхфазным переменным током",
            rows: [
              { label: "Напряжение", value: "230–400 В" },
              { label: "Частота", value: "50 Гц ±1%" },
              { label: "Коэффициент мощности", value: "cos φ ≥ 0.99" },
            ],
            indicators: [
              "Линейное и фазное напряжение",
              "Токи по фазам (A, B, C)",
              "Активная, реактивная и полная мощность",
              "Коэффициент мощности cos φ",
            ],
          },
        ],
      },
      {
        id: "dc",
        label: "Блок DC",
        blocks: [
          {
            title: "Блок постоянного тока (DC)",
            description: "Параметры работы с постоянным током",
            rows: [
              { label: "Напряжение", value: "110–220 В" },
              { label: "Режим работы", value: "Непрерывный" },
            ],
            indicators: [
              "Напряжение постоянного тока",
              "Сила тока",
              "Мощность",
              "Счётчики потреблённой энергии",
            ],
          },
        ],
      },
    ],
  };
}
