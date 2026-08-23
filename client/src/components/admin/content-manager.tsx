import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, Plus, FileText, Globe, Home as HomeIcon, HelpCircle, Menu, Phone, AlertCircle, LayoutTemplate } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CONTENT_GROUPS, getContentFallback, type ContentField } from "@shared/content-catalog";

const GROUP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  nav: Menu,
  home: HomeIcon,
  home_sections: LayoutTemplate,
  home_contact: Phone,
  footer: Globe,
  about: FileText,
  faq: HelpCircle,
  contacts: Phone,
  legal: FileText,
  errors: AlertCircle,
};

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

export function ContentManager({ items }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const byKey = useMemo(() => {
    const map = new Map<string, ContentItem>();
    for (const it of items || []) if (it?.key) map.set(it.key, it);
    return map;
  }, [items]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingTab, setSavingTab] = useState<string | null>(null);

  useEffect(() => {
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
    for (const g of CONTENT_GROUPS) for (const i of g.items) s.add(i.key);
    return s;
  }, []);

  const customItems = useMemo(
    () => (items || []).filter((it) => it?.key && !knownKeys.has(it.key)),
    [items, knownKeys],
  );

  const storedValue = (key: string): string => byKey.get(key)?.value ?? "";

  const currentValue = (key: string): string => {
    if (key in drafts) return drafts[key];
    const stored = storedValue(key);
    return stored || getContentFallback(key);
  };

  const isDirty = (key: string): boolean => {
    if (key in drafts) return drafts[key] !== storedValue(key);
    return !byKey.has(key) && !!getContentFallback(key);
  };

  async function persist(key: string, value: string, page?: string, section?: string) {
    await apiRequest("PUT", `/api/admin/content/${encodeURIComponent(key)}`, {
      value,
      page: page || byKey.get(key)?.page || "",
      section: section || byKey.get(key)?.section || "",
    });
  }

  async function saveOne(preset: ContentField | { key: string; section?: string }, pageId?: string) {
    const key = preset.key;
    const value = currentValue(key);
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await persist(key, value, pageId, "section" in preset ? preset.section : undefined);
      toast({ title: "Сохранено", description: `«${preset.key}» обновлён` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
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

  async function saveGroup(groupId: string) {
    const group = CONTENT_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const payload = group.items.map((item) => ({
      key: item.key,
      value: currentValue(item.key),
      page: groupId,
      section: item.section || "",
    }));
    setSavingTab(groupId);
    try {
      await apiRequest("PUT", "/api/admin/content/bulk", { items: payload });
      toast({ title: "Вкладка сохранена", description: `Обновлено полей: ${payload.length}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of group.items) delete next[item.key];
        return next;
      });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось сохранить вкладку", variant: "destructive" });
    } finally {
      setSavingTab(null);
    }
  }

  async function removeOne(key: string) {
    if (!confirm(`Удалить сохранённый текст «${key}»? На сайте снова появится исходный вариант.`)) return;
    try {
      await apiRequest("DELETE", `/api/admin/content/${encodeURIComponent(key)}`);
      toast({ title: "Сброшено", description: `«${key}» удалён, снова исходный текст` });
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

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newPage, setNewPage] = useState("");
  const [newSection, setNewSection] = useState("");

  async function saveCustom() {
    const k = newKey.trim();
    if (!k) {
      toast({ title: "Ошибка", description: "Укажите ключ", variant: "destructive" });
      return;
    }
    try {
      await persist(k, newValue, newPage, newSection);
      toast({ title: "Сохранено", description: `«${k}» создан` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setNewKey(""); setNewValue(""); setNewPage(""); setNewSection("");
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось сохранить", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Здесь можно править каждую фразу сайта. Пустое поле = исходный текст. Кнопка корзины возвращает исходный вариант.
        «Сохранить вкладку» записывает все поля сразу.
      </p>
      <Tabs defaultValue={CONTENT_GROUPS[0].id} className="w-full">
        <TabsList className="flex flex-wrap w-full justify-start h-auto">
          {CONTENT_GROUPS.map((g) => {
            const Icon = GROUP_ICONS[g.id];
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

        {CONTENT_GROUPS.map((g) => (
          <TabsContent key={g.id} value={g.id} className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => saveGroup(g.id)} disabled={savingTab === g.id}>
                <Save className="w-4 h-4 mr-1" />
                {savingTab === g.id ? "Сохранение..." : "Сохранить вкладку"}
              </Button>
            </div>
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
                            <Badge variant="outline" className="text-[10px]">исходный текст</Badge>
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
                            title="Вернуть исходный текст"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {preset.multiline ? (
                      <Textarea
                        value={currentValue(preset.key)}
                        placeholder={preset.fallback || "Исходный текст"}
                        rows={preset.rows || 4}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [preset.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <Input
                        value={currentValue(preset.key)}
                        placeholder={preset.fallback || ""}
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
                <Label className="text-xs">Содержимое</Label>
                <Textarea value={newValue} onChange={(e) => setNewValue(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveCustom} disabled={!newKey.trim()}>
                  <Save className="w-4 h-4 mr-1" />
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>

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
