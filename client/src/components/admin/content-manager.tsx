import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, Plus, FileText, Globe, Home as HomeIcon } from "lucide-react";

// Каталог "известных" ключей контента: человекочитаемая метка, подсказка
// и страница, к которой относится ключ. При сохранении заполняем page и
// section автоматически. Новые ключи добавлять сюда — и они сразу появятся
// в UI, в соответствующей вкладке.
export interface ContentPreset {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  section?: string;
}

export interface ContentPageGroup {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: ContentPreset[];
}

// Каталог групп. Если надо добавить ещё секцию на страницу —
// дописываем ключ здесь, без правок кода.
const DEFAULT_GROUPS: ContentPageGroup[] = [
  {
    id: "home",
    label: "Главная",
    icon: HomeIcon,
    items: [
      { key: "home_hero_title", label: "Заголовок Hero", section: "hero", placeholder: "Нагрузочные устройства…" },
      { key: "home_hero_subtitle", label: "Подзаголовок Hero", section: "hero", multiline: true, placeholder: "Короткий слоган" },
      { key: "home_hero_cta", label: "Текст кнопки Hero", section: "hero", placeholder: "Заказать" },
      { key: "home_about", label: "О продукте", section: "about", multiline: true, hint: "Крупный блок с описанием." },
      { key: "home_advantages", label: "Преимущества", section: "advantages", multiline: true, hint: "Список преимуществ; каждая строка — пункт." },
      { key: "home_seo_title", label: "SEO: title", section: "seo" },
      { key: "home_seo_description", label: "SEO: description", section: "seo", multiline: true },
    ],
  },
  {
    id: "contacts",
    label: "Контакты",
    icon: FileText,
    items: [
      { key: "contacts_intro", label: "Вступительный текст", section: "intro", multiline: true },
      { key: "contacts_working_hours", label: "Часы работы", section: "info" },
      { key: "contacts_map_caption", label: "Подпись карты", section: "map" },
    ],
  },
  {
    id: "legal",
    label: "Юридическое",
    icon: Globe,
    items: [
      { key: "legal_company_name", label: "Название юр. лица", section: "legal" },
      { key: "legal_inn", label: "ИНН", section: "legal" },
      { key: "legal_ogrn", label: "ОГРН", section: "legal" },
      { key: "legal_address", label: "Юр. адрес", section: "legal", multiline: true },
      { key: "legal_privacy_notice", label: "Короткое примечание в футере", section: "legal", multiline: true },
    ],
  },
];

interface ContentItem {
  key: string;
  value: string;
  page?: string | null;
  section?: string | null;
  updatedAt?: string | null;
}

interface Props {
  items: ContentItem[];
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function ContentManager({ items }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Кэш существующих значений по ключу — чтобы инпуты стартовали с текущего.
  const byKey = useMemo(() => {
    const map = new Map<string, ContentItem>();
    for (const it of items || []) if (it?.key) map.set(it.key, it);
    return map;
  }, [items]);

  // Локальный черновик всех значений. Сохраняем только изменённые.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // При изменении items сбрасываем только те черновики, которые совпали
    // с "облачным" значением — пусть неотправленные правки не теряются.
    setDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const remote = byKey.get(k)?.value ?? "";
        if (v !== remote) next[k] = v;
      }
      return next;
    });
  }, [byKey]);

  const knownKeys = useMemo(() => {
    const s = new Set<string>();
    for (const g of DEFAULT_GROUPS) for (const i of g.items) s.add(i.key);
    return s;
  }, []);

  const customItems = useMemo(
    () => (items || []).filter((it) => it?.key && !knownKeys.has(it.key)),
    [items, knownKeys],
  );

  const currentValue = (key: string): string => {
    if (key in drafts) return drafts[key];
    return byKey.get(key)?.value || "";
  };

  const isDirty = (key: string): boolean => {
    if (!(key in drafts)) return false;
    return drafts[key] !== (byKey.get(key)?.value || "");
  };

  async function saveOne(preset: ContentPreset | { key: string; section?: string }, pageId?: string) {
    const key = preset.key;
    const value = currentValue(key);
    if (!value.trim()) {
      toast({ title: "Пусто", description: "Нельзя сохранить пустое значение", variant: "destructive" });
      return;
    }
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch(`/api/admin/content/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          value,
          page: pageId || byKey.get(key)?.page || "",
          section: preset.section || byKey.get(key)?.section || "",
        }),
      });
      if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
      toast({ title: "Сохранено", description: `«${key}» обновлён` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      // убираем draft, т.к. теперь это совпадает с remote
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось сохранить", variant: "destructive" });
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  async function removeOne(key: string) {
    if (!confirm(`Удалить контент «${key}»?`)) return;
    try {
      const res = await fetch(`/api/admin/content/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
      toast({ title: "Удалено", description: `«${key}» удалён` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось удалить", variant: "destructive" });
    }
  }

  // Форма добавления произвольного ключа
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newPage, setNewPage] = useState("");
  const [newSection, setNewSection] = useState("");

  async function saveCustom() {
    const k = newKey.trim();
    if (!k || !newValue.trim()) {
      toast({ title: "Ошибка", description: "Заполните ключ и содержимое", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/admin/content/${encodeURIComponent(k)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ value: newValue, page: newPage || "", section: newSection || "" }),
      });
      if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
      toast({ title: "Сохранено", description: `«${k}» создан` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      setNewKey(""); setNewValue(""); setNewPage(""); setNewSection("");
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось сохранить", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={DEFAULT_GROUPS[0].id} className="w-full">
        <TabsList className="flex flex-wrap w-full justify-start h-auto">
          {DEFAULT_GROUPS.map((g) => {
            const Icon = g.icon;
            const itemCount = g.items.filter((it) => byKey.has(it.key)).length;
            return (
              <TabsTrigger key={g.id} value={g.id} className="gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {g.label}
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {itemCount}/{g.items.length}
                </Badge>
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="__custom" className="gap-1.5">
            Свои ключи
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {customItems.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {DEFAULT_GROUPS.map((g) => (
          <TabsContent key={g.id} value={g.id} className="space-y-3 mt-4">
            {g.items.map((preset) => {
              const existing = byKey.get(preset.key);
              const dirty = isDirty(preset.key);
              return (
                <Card key={preset.key} className={dirty ? "border-primary/40" : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Label className="text-sm font-semibold">{preset.label}</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1 items-center text-xs">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{preset.key}</code>
                          {preset.section && <Badge variant="outline" className="text-[10px]">{preset.section}</Badge>}
                          {existing ? (
                            <Badge variant="secondary" className="text-[10px]">сохранён</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">не задан</Badge>
                          )}
                          {dirty && <Badge className="text-[10px]">есть изменения</Badge>}
                        </div>
                        {preset.hint && (
                          <p className="text-xs text-muted-foreground mt-1">{preset.hint}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => saveOne(preset, g.id)}
                          disabled={!!saving[preset.key] || !dirty}
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Сохранить
                        </Button>
                        {existing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeOne(preset.key)}
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {preset.multiline ? (
                      <Textarea
                        value={currentValue(preset.key)}
                        placeholder={preset.placeholder}
                        rows={4}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [preset.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <Input
                        value={currentValue(preset.key)}
                        placeholder={preset.placeholder}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [preset.key]: e.target.value }))
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}

        <TabsContent value="__custom" className="space-y-3 mt-4">
          {/* Добавить произвольный ключ */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Добавить произвольный ключ
              </CardTitle>
              <CardDescription>
                Для продвинутых сценариев. Используй ключи вида <code>page_section_field</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Ключ *</Label>
                  <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="custom_key" />
                </div>
                <div>
                  <Label className="text-xs">Страница</Label>
                  <Input value={newPage} onChange={(e) => setNewPage(e.target.value)} placeholder="home" />
                </div>
                <div>
                  <Label className="text-xs">Раздел</Label>
                  <Input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="hero" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Содержимое *</Label>
                <Textarea value={newValue} onChange={(e) => setNewValue(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveCustom} disabled={!newKey.trim() || !newValue.trim()}>
                  <Save className="w-4 h-4 mr-1" />
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Уже существующие пользовательские ключи */}
          {customItems.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Произвольных ключей нет.
            </div>
          ) : (
            customItems.map((it) => {
              const dirty = isDirty(it.key);
              return (
                <Card key={it.key} className={dirty ? "border-primary/40" : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <code className="text-sm font-semibold break-all">{it.key}</code>
                        <div className="flex flex-wrap gap-1.5 mt-1 items-center text-xs">
                          {it.page && <Badge variant="outline" className="text-[10px]">page: {it.page}</Badge>}
                          {it.section && <Badge variant="outline" className="text-[10px]">{it.section}</Badge>}
                          {dirty && <Badge className="text-[10px]">есть изменения</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => saveOne({ key: it.key, section: it.section || undefined }, it.page || undefined)}
                          disabled={!!saving[it.key] || !dirty}
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Сохранить
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => removeOne(it.key)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={currentValue(it.key)}
                      rows={3}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [it.key]: e.target.value }))
                      }
                    />
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
