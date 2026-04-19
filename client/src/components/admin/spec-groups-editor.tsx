import { useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, ListPlus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductSpecGroups, SpecBlock, SpecRow, SpecTab } from "@shared/specs";

type Props = {
  value: ProductSpecGroups;
  onChange: (next: ProductSpecGroups) => void;
};

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function slugify(input: string, fallback: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || fallback;
}

/**
 * Полноценный редактор богатых характеристик товара.
 * Поддерживает любое количество табов, блоков внутри них,
 * строк «параметр — значение» и списков индикаторов.
 * Ничего не сохраняет сам — зовёт onChange c обновлённым объектом.
 */
export function SpecGroupsEditor({ value, onChange }: Props) {
  const activeTabId = value.tabs[0]?.id || "general";
  const tabIds = useMemo(() => value.tabs.map(t => t.id), [value.tabs]);

  const patchTop = (patch: Partial<ProductSpecGroups>) => onChange({ ...value, ...patch });

  const patchTabs = (tabs: SpecTab[]) => onChange({ ...value, tabs });

  const updateTab = (index: number, updater: (t: SpecTab) => SpecTab) => {
    patchTabs(value.tabs.map((t, i) => (i === index ? updater(t) : t)));
  };

  const addTab = () => {
    const existing = new Set(tabIds);
    let id = "tab";
    let n = 1;
    while (existing.has(`${id}-${n}`)) n += 1;
    id = `${id}-${n}`;
    patchTabs([
      ...value.tabs,
      {
        id,
        label: `Вкладка ${value.tabs.length + 1}`,
        blocks: [{ title: "Новая секция", rows: [{ label: "", value: "" }] }],
      },
    ]);
  };

  const removeTab = (index: number) => {
    if (value.tabs.length <= 1) return;
    patchTabs(value.tabs.filter((_, i) => i !== index));
  };

  const moveTab = (index: number, dir: -1 | 1) => patchTabs(move(value.tabs, index, index + dir));

  const updateBlock = (tabIndex: number, blockIndex: number, updater: (b: SpecBlock) => SpecBlock) => {
    updateTab(tabIndex, (t) => ({
      ...t,
      blocks: t.blocks.map((b, i) => (i === blockIndex ? updater(b) : b)),
    }));
  };

  const addBlock = (tabIndex: number) => {
    updateTab(tabIndex, (t) => ({
      ...t,
      blocks: [...t.blocks, { title: "Новая секция", rows: [{ label: "", value: "" }] }],
    }));
  };

  const removeBlock = (tabIndex: number, blockIndex: number) => {
    updateTab(tabIndex, (t) => ({
      ...t,
      blocks: t.blocks.length > 1 ? t.blocks.filter((_, i) => i !== blockIndex) : t.blocks,
    }));
  };

  const moveBlock = (tabIndex: number, blockIndex: number, dir: -1 | 1) => {
    updateTab(tabIndex, (t) => ({ ...t, blocks: move(t.blocks, blockIndex, blockIndex + dir) }));
  };

  const addRow = (tabIndex: number, blockIndex: number) => {
    updateBlock(tabIndex, blockIndex, (b) => ({ ...b, rows: [...b.rows, { label: "", value: "" }] }));
  };

  const updateRow = (tabIndex: number, blockIndex: number, rowIndex: number, patch: Partial<SpecRow>) => {
    updateBlock(tabIndex, blockIndex, (b) => ({
      ...b,
      rows: b.rows.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)),
    }));
  };

  const removeRow = (tabIndex: number, blockIndex: number, rowIndex: number) => {
    updateBlock(tabIndex, blockIndex, (b) => ({ ...b, rows: b.rows.filter((_, i) => i !== rowIndex) }));
  };

  const moveRow = (tabIndex: number, blockIndex: number, rowIndex: number, dir: -1 | 1) => {
    updateBlock(tabIndex, blockIndex, (b) => ({ ...b, rows: move(b.rows, rowIndex, rowIndex + dir) }));
  };

  const addIndicator = (tabIndex: number, blockIndex: number) => {
    updateBlock(tabIndex, blockIndex, (b) => ({
      ...b,
      indicators: [...(b.indicators || []), ""],
    }));
  };

  const updateIndicator = (tabIndex: number, blockIndex: number, i: number, text: string) => {
    updateBlock(tabIndex, blockIndex, (b) => ({
      ...b,
      indicators: (b.indicators || []).map((it, idx) => (idx === i ? text : it)),
    }));
  };

  const removeIndicator = (tabIndex: number, blockIndex: number, i: number) => {
    updateBlock(tabIndex, blockIndex, (b) => ({
      ...b,
      indicators: (b.indicators || []).filter((_, idx) => idx !== i),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Заголовок секции</Label>
          <Input
            value={value.heading || ""}
            placeholder="Технические характеристики"
            onChange={(e) => patchTop({ heading: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Подзаголовок</Label>
          <Input
            value={value.subheading || ""}
            placeholder="Полная спецификация..."
            onChange={(e) => patchTop({ subheading: e.target.value })}
          />
        </div>
      </div>

      <Tabs defaultValue={activeTabId} key={tabIds.join("|")} className="w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="flex-wrap h-auto">
            {value.tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs">
                {t.label || t.id}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button type="button" size="sm" variant="outline" onClick={addTab}>
            <Plus className="w-3 h-3 mr-1" /> Вкладка
          </Button>
        </div>

        {value.tabs.map((tab, tabIndex) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2 items-end">
                <div>
                  <Label className="text-xs text-muted-foreground">Название вкладки</Label>
                  <Input
                    value={tab.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      updateTab(tabIndex, (t) => ({
                        ...t,
                        label,
                        // Автоматически обновляем id, пока админ не поменял вручную
                        id: t.id === slugify(t.label, t.id) || !t.id ? slugify(label, t.id || `tab-${tabIndex + 1}`) : t.id,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ID (латиница)</Label>
                  <Input
                    value={tab.id}
                    onChange={(e) => updateTab(tabIndex, (t) => ({ ...t, id: slugify(e.target.value, t.id) }))}
                  />
                </div>
                <div className="flex gap-1 justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={tabIndex === 0}
                    onClick={() => moveTab(tabIndex, -1)}
                    title="Переместить влево"
                  >
                    <ArrowUp className="w-4 h-4 -rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={tabIndex === value.tabs.length - 1}
                    onClick={() => moveTab(tabIndex, 1)}
                    title="Переместить вправо"
                  >
                    <ArrowDown className="w-4 h-4 -rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={value.tabs.length <= 1}
                    onClick={() => removeTab(tabIndex)}
                    title="Удалить вкладку"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>

            {tab.blocks.map((block, blockIndex) => (
              <div key={blockIndex} className="rounded-lg border p-4 space-y-3 bg-background">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <Input
                    className="flex-1 font-semibold"
                    placeholder="Заголовок блока (например: Общие параметры)"
                    value={block.title}
                    onChange={(e) => updateBlock(tabIndex, blockIndex, (b) => ({ ...b, title: e.target.value }))}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={blockIndex === 0}
                    onClick={() => moveBlock(tabIndex, blockIndex, -1)}
                    title="Вверх"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={blockIndex === tab.blocks.length - 1}
                    onClick={() => moveBlock(tabIndex, blockIndex, 1)}
                    title="Вниз"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={tab.blocks.length <= 1}
                    onClick={() => removeBlock(tabIndex, blockIndex)}
                    title="Удалить блок"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <Textarea
                  rows={2}
                  className="text-sm"
                  placeholder="Подзаголовок блока (не обязательно)"
                  value={block.description || ""}
                  onChange={(e) =>
                    updateBlock(tabIndex, blockIndex, (b) => ({
                      ...b,
                      description: e.target.value || undefined,
                    }))
                  }
                />

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Параметры ({block.rows.length})
                  </div>
                  {block.rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2 items-start">
                      <Input
                        placeholder="Название параметра (напр. Напряжение)"
                        value={row.label}
                        onChange={(e) => updateRow(tabIndex, blockIndex, rowIndex, { label: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Значение (напр. 230–400 В)"
                        value={row.value}
                        onChange={(e) => updateRow(tabIndex, blockIndex, rowIndex, { value: e.target.value })}
                        className="flex-1"
                      />
                      <div className="flex">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={rowIndex === 0}
                          onClick={() => moveRow(tabIndex, blockIndex, rowIndex, -1)}
                          title="Выше"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={rowIndex === block.rows.length - 1}
                          onClick={() => moveRow(tabIndex, blockIndex, rowIndex, 1)}
                          title="Ниже"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeRow(tabIndex, blockIndex, rowIndex)}
                          title="Удалить"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => addRow(tabIndex, blockIndex)}>
                    <Plus className="w-3 h-3 mr-1" /> Параметр
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Индикаторы ({(block.indicators || []).length})
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => addIndicator(tabIndex, blockIndex)}
                    >
                      <ListPlus className="w-3 h-3 mr-1" /> Добавить пункт
                    </Button>
                  </div>
                  {(block.indicators || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Список с галочками рядом со значениями (например «Токи по фазам»). Оставьте пустым, если не нужен.
                    </p>
                  ) : (
                    (block.indicators || []).map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="Например: Линейное и фазное напряжение"
                          value={item}
                          onChange={(e) => updateIndicator(tabIndex, blockIndex, i, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeIndicator(tabIndex, blockIndex, i)}
                          title="Удалить пункт"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            <Button type="button" size="sm" variant="outline" onClick={() => addBlock(tabIndex)}>
              <Plus className="w-4 h-4 mr-1" /> Добавить блок
            </Button>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
