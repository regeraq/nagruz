import { useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRODUCT_ADVANTAGE_ICONS,
  type ProductAdvantage,
} from "@shared/schema";
import {
  PRODUCT_ADVANTAGE_ICON_MAP,
  PRODUCT_ADVANTAGE_ICON_LABELS,
  getAdvantageIcon,
} from "@/lib/product-advantages";

const MAX_ADVANTAGES = 12;
const NO_ICON_VALUE = "__none__";

export interface AdvantagesEditorProps {
  value: ProductAdvantage[];
  onChange: (next: ProductAdvantage[]) => void;
  /** Для data-testid — уникальный префикс в рамках страницы. */
  testIdPrefix?: string;
}

export function AdvantagesEditor({
  value,
  onChange,
  testIdPrefix = "advantage",
}: AdvantagesEditorProps) {
  const items = value ?? [];
  const iconOptions = useMemo(
    () =>
      PRODUCT_ADVANTAGE_ICONS.map((name) => ({
        value: name,
        label: PRODUCT_ADVANTAGE_ICON_LABELS[name] ?? name,
        Icon: PRODUCT_ADVANTAGE_ICON_MAP[name] ?? HelpCircle,
      })),
    [],
  );

  const updateAt = (index: number, patch: Partial<ProductAdvantage>) => {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = items.slice();
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const next = items.slice();
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const addNew = () => {
    if (items.length >= MAX_ADVANTAGES) return;
    onChange([
      ...items,
      {
        title: "",
        description: "",
        icon: null,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Карточки, которые отображаются в блоке «Ключевые преимущества устройства»
            на главной странице при выборе этого товара.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Если оставить пустым — для товара блок будет скрыт, и покажется только
            общая секция с дефолтными преимуществами (если она включена в настройках сайта).
          </p>
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {items.length} / {MAX_ADVANTAGES}
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Пока нет преимуществ. Нажмите «Добавить преимущество» ниже.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => {
          const SelectedIcon = getAdvantageIcon(item.icon);
          return (
            <div
              key={idx}
              className="rounded-lg border bg-card p-4 space-y-3"
              data-testid={`${testIdPrefix}-card-${idx}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    {SelectedIcon ? (
                      <SelectedIcon className="w-5 h-5 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{idx + 1}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    Преимущество #{idx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    aria-label="Переместить вверх"
                    data-testid={`${testIdPrefix}-up-${idx}`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                    aria-label="Переместить вниз"
                    data-testid={`${testIdPrefix}-down-${idx}`}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAt(idx)}
                    aria-label="Удалить преимущество"
                    data-testid={`${testIdPrefix}-remove-${idx}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <div>
                  <Label className="text-xs">Заголовок *</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateAt(idx, { title: e.target.value })}
                    placeholder="Например: 20 ступеней нагрузки"
                    maxLength={120}
                    data-testid={`${testIdPrefix}-title-${idx}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Иконка</Label>
                  <Select
                    value={item.icon ?? NO_ICON_VALUE}
                    onValueChange={(v) =>
                      updateAt(idx, { icon: v === NO_ICON_VALUE ? null : v })
                    }
                  >
                    <SelectTrigger data-testid={`${testIdPrefix}-icon-${idx}`}>
                      <SelectValue placeholder="Без иконки" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ICON_VALUE}>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <HelpCircle className="w-4 h-4" />
                          Без иконки
                        </span>
                      </SelectItem>
                      {iconOptions.map(({ value: v, label, Icon }) => (
                        <SelectItem key={v} value={v}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Описание *</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateAt(idx, { description: e.target.value })}
                  placeholder="Кратко — что это даёт клиенту, 1–2 предложения"
                  maxLength={600}
                  rows={2}
                  data-testid={`${testIdPrefix}-description-${idx}`}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {item.description.length} / 600
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addNew}
        disabled={items.length >= MAX_ADVANTAGES}
        data-testid={`${testIdPrefix}-add`}
      >
        <Plus className="w-4 h-4 mr-2" />
        Добавить преимущество
        {items.length >= MAX_ADVANTAGES && ` (достигнут лимит ${MAX_ADVANTAGES})`}
      </Button>
    </div>
  );
}
