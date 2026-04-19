import {
  Activity,
  Award,
  Battery,
  Cable,
  CheckCircle2,
  Cpu,
  Gauge,
  Layers,
  Settings,
  Shield,
  Sparkles,
  Thermometer,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Маппинг строкового идентификатора иконки (см. PRODUCT_ADVANTAGE_ICONS
 * в `shared/schema.ts`) в конкретный компонент lucide-react.
 * Используется и на витрине (home.tsx), и в админке (advantages-editor.tsx).
 */
export const PRODUCT_ADVANTAGE_ICON_MAP: Record<string, LucideIcon> = {
  Gauge,
  Cable,
  Zap,
  Cpu,
  Shield,
  Thermometer,
  Wrench,
  Battery,
  Activity,
  Settings,
  CheckCircle2,
  Award,
  Sparkles,
  Layers,
};

/** Человекочитаемые подписи для селекта иконок в админке. */
export const PRODUCT_ADVANTAGE_ICON_LABELS: Record<string, string> = {
  Gauge: "Счётчик / скорость",
  Cable: "Кабель / подключение",
  Zap: "Энергия / мощность",
  Cpu: "Процессор / точность",
  Shield: "Защита",
  Thermometer: "Температура",
  Wrench: "Обслуживание",
  Battery: "Аккумулятор",
  Activity: "Активность / мониторинг",
  Settings: "Настройки",
  CheckCircle2: "Проверено",
  Award: "Сертификат / награда",
  Sparkles: "Особенность",
  Layers: "Слои / универсальность",
};

/** Возвращает lucide-компонент по имени или null, если имя неизвестно/не задано. */
export function getAdvantageIcon(icon?: string | null): LucideIcon | null {
  if (!icon) return null;
  return PRODUCT_ADVANTAGE_ICON_MAP[icon] ?? null;
}
