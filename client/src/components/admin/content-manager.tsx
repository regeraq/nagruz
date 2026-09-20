import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Plus, Trash2, Search, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  CONTENT_GROUPS,
  CONTENT_PAGES,
  SECTION_LABELS,
  getContentFallback,
  getContentKind,
  parseFaqText,
  parseLineList,
  parseStatLines,
  parseTitleDescLines,
  serializeFaqText,
  serializeLineList,
  serializeStatLines,
  serializeTitleDescLines,
  type ContentField,
  type FaqParsedItem,
} from "@shared/content-catalog";

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

type SaveState = "idle" | "saving" | "saved" | "error";

function fieldMatches(preset: ContentField, query: string, current: string): boolean {
  if (!query) return true;
  const hay = `${preset.label} ${preset.fallback} ${current} ${preset.hint || ""}`.toLowerCase();
  return hay.includes(query);
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
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [pageId, setPageId] = useState(CONTENT_PAGES[0].id);
  const [query, setQuery] = useState("");
  const timers = useRef<Record<string, number>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const remote = byKey.get(k)?.value ?? getContentFallback(k);
        if (v !== remote) next[k] = v;
      }
      return next;
    });
  }, [byKey]);

  useEffect(() => {
    return () => {
      for (const id of Object.values(timers.current)) window.clearTimeout(id);
    };
  }, []);

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
  const baseline = (key: string): string => storedValue(key) || getContentFallback(key);
  const currentValue = (key: string): string => (key in drafts ? drafts[key] : baseline(key));
  const isDirty = (key: string): boolean => key in drafts && drafts[key] !== baseline(key);
  const isCustomized = (key: string): boolean => byKey.has(key);

  function setDraft(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setSaveState((prev) => ({ ...prev, [key]: "idle" }));
  }

  async function persist(key: string, value: string, page?: string, section?: string) {
    await apiRequest("PUT", `/api/admin/content/${encodeURIComponent(key)}`, {
      value,
      page: page || byKey.get(key)?.page || "",
      section: section || byKey.get(key)?.section || "",
    });
  }

  async function saveNow(key: string, page?: string, section?: string) {
    const value = key in draftsRef.current ? draftsRef.current[key] : currentValue(key);
    setSaveState((prev) => ({ ...prev, [key]: "saving" }));
    try {
      await persist(key, value, page, section);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      // Пока запрос шёл, админ мог продолжить печатать — такой черновик терять нельзя.
      setDrafts((prev) => {
        if (!(key in prev) || prev[key] !== value) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSaveState((prev) => ({ ...prev, [key]: "saved" }));
      window.setTimeout(() => {
        setSaveState((prev) => (prev[key] === "saved" ? { ...prev, [key]: "idle" } : prev));
      }, 1600);
    } catch (e: any) {
      setSaveState((prev) => ({ ...prev, [key]: "error" }));
      toast({ title: "Не удалось сохранить", description: e?.message || "Попробуйте ещё раз", variant: "destructive" });
    }
  }

  function scheduleSave(key: string, page?: string, section?: string) {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => {
      void saveNow(key, page, section);
    }, 700);
  }

  function onTextChange(key: string, value: string, page?: string, section?: string) {
    setDraft(key, value);
    scheduleSave(key, page, section);
  }

  async function resetOne(key: string, label: string) {
    window.clearTimeout(timers.current[key]);
    if (!byKey.has(key) && !(key in drafts)) return;
    if (!confirm(`Вернуть исходный текст для «${label}»?`)) return;
    try {
      if (byKey.has(key)) {
        await apiRequest("DELETE", `/api/admin/content/${encodeURIComponent(key)}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSaveState((prev) => ({ ...prev, [key]: "saved" }));
    } catch (e: any) {
      toast({ title: "Не удалось вернуть", description: e?.message || "Ошибка", variant: "destructive" });
    }
  }

  const q = query.trim().toLowerCase();
  const activePage = CONTENT_PAGES.find((p) => p.id === pageId) || CONTENT_PAGES[0];

  const visiblePages = useMemo(() => {
    const pages = q ? CONTENT_PAGES : [activePage];
    return pages
      .map((page) => {
        const groups = CONTENT_GROUPS.filter((g) => page.groupIds.includes(g.id))
          .map((g) => ({
            ...g,
            items: g.items.filter((item) => fieldMatches(item, q, currentValue(item.key))),
          }))
          .filter((g) => g.items.length > 0);
        return { page, groups };
      })
      .filter((entry) => entry.groups.length > 0);
  }, [activePage, q, drafts, byKey]);

  const searchHits = useMemo(() => {
    if (!q) return 0;
    let n = 0;
    for (const g of CONTENT_GROUPS) {
      for (const item of g.items) {
        if (fieldMatches(item, q, currentValue(item.key))) n += 1;
      }
    }
    return n;
  }, [q, drafts, byKey]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найдите текст, который хотите поменять — например «Получить спецификацию»"
          className="pl-9 h-11"
        />
      </div>
      {q && (
        <p className="text-sm text-muted-foreground">
          Найдено: {searchHits}. Откройте нужную страницу слева или листайте список ниже.
        </p>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1">
          {CONTENT_PAGES.map((page) => {
            const active = page.id === pageId;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setPageId(page.id)}
                className={`text-left rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="font-medium">{page.label}</div>
                <div className={`text-[11px] leading-snug ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  {page.description}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="space-y-8 min-w-0">
          {!q && (
            <div>
              <h3 className="text-lg font-semibold">{activePage.label}</h3>
              <p className="text-sm text-muted-foreground">
                Поменяли текст — он сам сохранится через секунду. «Как было» возвращает исходный вариант.
              </p>
            </div>
          )}

          {visiblePages.length === 0 && (
            <p className="text-sm text-muted-foreground">Ничего не нашли. Попробуйте другие слова с сайта.</p>
          )}

          {visiblePages.map(({ page, groups }) => (
            <div key={page.id} className="space-y-6">
              {q && <h3 className="text-lg font-semibold">{page.label}</h3>}
              {groups.map((group) => {
                const bySection = new Map<string, ContentField[]>();
                for (const item of group.items) {
                  const sid = item.section || group.id;
                  const list = bySection.get(sid) || [];
                  list.push(item);
                  bySection.set(sid, list);
                }
                return Array.from(bySection.entries()).map(([sid, fields]) => (
                  <section key={`${page.id}-${group.id}-${sid}`} className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {SECTION_LABELS[sid] || group.label}
                    </h4>
                    {fields.map((preset) => (
                      <FieldEditor
                        key={preset.key}
                        preset={preset}
                        value={currentValue(preset.key)}
                        dirty={isDirty(preset.key)}
                        customized={isCustomized(preset.key)}
                        state={saveState[preset.key] || "idle"}
                        onChange={(value) => onTextChange(preset.key, value, group.id, preset.section)}
                        onBlur={() => {
                          if (isDirty(preset.key)) void saveNow(preset.key, group.id, preset.section);
                        }}
                        onReset={() => resetOne(preset.key, preset.label)}
                      />
                    ))}
                  </section>
                ));
              })}
            </div>
          ))}

          {customItems.length > 0 && pageId === "nav" && !q && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Прочие записи</h4>
              {customItems.map((it) => (
                <FieldEditor
                  key={it.key}
                  preset={{ key: it.key, label: it.key, fallback: "" }}
                  value={currentValue(it.key)}
                  dirty={isDirty(it.key)}
                  customized
                  state={saveState[it.key] || "idle"}
                  onChange={(value) => onTextChange(it.key, value, it.page || undefined, it.section || undefined)}
                  onBlur={() => {
                    if (isDirty(it.key)) void saveNow(it.key, it.page || undefined, it.section || undefined);
                  }}
                  onReset={() => resetOne(it.key, it.key)}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveMark({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Сохраняю…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Check className="w-3 h-3" />
        Сохранено
      </span>
    );
  }
  if (state === "error") {
    return <span className="text-xs text-destructive">Не сохранилось</span>;
  }
  return null;
}

function FieldEditor({
  preset,
  value,
  dirty,
  customized,
  state,
  onChange,
  onBlur,
  onReset,
}: {
  preset: ContentField;
  value: string;
  dirty: boolean;
  customized: boolean;
  state: SaveState;
  onChange: (value: string) => void;
  onBlur: () => void;
  onReset: () => void;
}) {
  const kind = getContentKind(preset.key);
  return (
    <div className={`rounded-xl border bg-background p-4 space-y-2 ${dirty ? "border-primary/50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-sm">{preset.label}</div>
          {preset.hint && kind === "text" && (
            <p className="text-xs text-muted-foreground mt-0.5">{preset.hint.replace(/Формат:.*/i, "").trim()}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SaveMark state={state} />
          {(customized || dirty) && (
            <Button type="button" size="sm" variant="ghost" onClick={onReset} title="Вернуть исходный текст">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Как было
            </Button>
          )}
        </div>
      </div>

      {kind === "list" && (
        <ListEditor value={value} onChange={onChange} onBlur={onBlur} placeholder="Новый пункт" />
      )}
      {kind === "cards" && (
        <CardsEditor value={value} onChange={onChange} onBlur={onBlur} />
      )}
      {(kind === "stats" || kind === "stats3") && (
        <StatsEditor value={value} withDescription={kind === "stats3"} onChange={onChange} onBlur={onBlur} />
      )}
      {kind === "faq" && (
        <FaqEditor value={value} onChange={onChange} onBlur={onBlur} />
      )}
      {kind === "text" && (
        preset.multiline ? (
          <Textarea
            value={value}
            placeholder={preset.fallback || "Текст на сайте"}
            rows={preset.rows || 4}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        ) : (
          <Input
            value={value}
            placeholder={preset.fallback || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        )
      )}
    </div>
  );
}

function ListEditor({
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
}) {
  const items = parseLineList(value, true);
  const rows = items.length === 0 ? [""] : items;
  function update(next: string[]) {
    onChange(serializeLineList(next.length ? next : [""]));
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={row}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...rows];
              next[i] = e.target.value;
              update(next);
            }}
            onBlur={onBlur}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => {
              const next = rows.filter((_, idx) => idx !== i);
              update(next.length ? next : [""]);
              onBlur();
            }}
            title="Убрать пункт"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => update([...rows, ""])}>
        <Plus className="w-4 h-4 mr-1" />
        Добавить пункт
      </Button>
    </div>
  );
}

function CardsEditor({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const items = parseTitleDescLines(value, true);
  const rows = items.length === 0 ? [{ title: "", description: "" }] : items;
  function update(next: { title: string; description: string }[]) {
    onChange(serializeTitleDescLines(next));
  }
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Карточка {i + 1}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = rows.filter((_, idx) => idx !== i);
                update(next.length ? next : [{ title: "", description: "" }]);
                onBlur();
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Убрать
            </Button>
          </div>
          <Input
            value={row.title}
            placeholder="Заголовок"
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, title: e.target.value };
              update(next);
            }}
            onBlur={onBlur}
          />
          <Textarea
            value={row.description}
            placeholder="Короткое описание"
            rows={2}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, description: e.target.value };
              update(next);
            }}
            onBlur={onBlur}
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => update([...rows, { title: "", description: "" }])}
      >
        <Plus className="w-4 h-4 mr-1" />
        Добавить карточку
      </Button>
    </div>
  );
}

function StatsEditor({
  value,
  withDescription,
  onChange,
  onBlur,
}: {
  value: string;
  withDescription: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const items = parseStatLines(value, true);
  const rows = items.length === 0 ? [{ value: "", label: "", description: "" }] : items;
  function update(next: { value: string; label: string; description?: string }[]) {
    onChange(serializeStatLines(next, withDescription));
  }
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Цифра {i + 1}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = rows.filter((_, idx) => idx !== i);
                update(next.length ? next : [{ value: "", label: "", description: "" }]);
                onBlur();
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Убрать
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              value={row.value}
              placeholder="15+"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, value: e.target.value };
                update(next);
              }}
              onBlur={onBlur}
            />
            <Input
              value={row.label}
              placeholder="Лет опыта"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, label: e.target.value };
                update(next);
              }}
              onBlur={onBlur}
            />
          </div>
          {withDescription && (
            <Input
              value={row.description || ""}
              placeholder="Короткое пояснение"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, description: e.target.value };
                update(next);
              }}
              onBlur={onBlur}
            />
          )}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => update([...rows, { value: "", label: "", description: "" }])}
      >
        <Plus className="w-4 h-4 mr-1" />
        Добавить цифру
      </Button>
    </div>
  );
}

function FaqEditor({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const items = parseFaqText(value, true);
  const rows: FaqParsedItem[] = items.length === 0 ? [{ category: "Общие вопросы", question: "", answer: "" }] : items;
  function update(next: FaqParsedItem[]) {
    onChange(serializeFaqText(next));
  }
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex justify-between items-center gap-2">
            <Input
              value={row.category}
              placeholder="Раздел, например «Покупка»"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, category: e.target.value };
                update(next);
              }}
              onBlur={onBlur}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = rows.filter((_, idx) => idx !== i);
                update(next.length ? next : [{ category: "Общие вопросы", question: "", answer: "" }]);
                onBlur();
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Убрать
            </Button>
          </div>
          <Input
            value={row.question}
            placeholder="Вопрос"
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, question: e.target.value };
              update(next);
            }}
            onBlur={onBlur}
          />
          <Textarea
            value={row.answer}
            placeholder="Ответ"
            rows={3}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, answer: e.target.value };
              update(next);
            }}
            onBlur={onBlur}
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          update([...rows, { category: rows[rows.length - 1]?.category || "Общие вопросы", question: "", answer: "" }])
        }
      >
        <Plus className="w-4 h-4 mr-1" />
        Добавить вопрос
      </Button>
    </div>
  );
}
