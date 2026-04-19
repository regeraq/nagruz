import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  MapPin,
  ShoppingCart,
  Heart,
  Bell,
  FileCheck,
  Inbox,
} from "lucide-react";

// Тип ответа админского rich-эндпоинта. Поля пользователя приходят без пароля.
export interface FullUserResponse {
  success: boolean;
  user: Record<string, any> | null;
  orders: any[];
  favorites: any[];
  notifications: any[];
  consents: any[];
  contactSubmissions: any[];
  summary: {
    totalOrders: number;
    paidOrders: number;
    totalSpent: number;
    favoritesCount: number;
    unreadNotifications: number;
    lastLoginAt: string | null;
    registeredAt: string | null;
  };
}

interface Props {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Человекочитаемые метки для полей, которые мы показываем в виде таблицы
// «ключ — значение». Всё что не в списке — спрячем, чтобы не светить служебное.
const PROFILE_FIELDS: Array<{ key: string; label: string; mask?: boolean }> = [
  { key: "id", label: "ID" },
  { key: "email", label: "Email" },
  { key: "firstName", label: "Имя" },
  { key: "lastName", label: "Фамилия" },
  { key: "middleName", label: "Отчество" },
  { key: "phone", label: "Телефон" },
  { key: "role", label: "Роль" },
  { key: "company", label: "Компания" },
  { key: "companyName", label: "Название компании" },
  { key: "inn", label: "ИНН" },
  { key: "kpp", label: "КПП" },
  { key: "ogrn", label: "ОГРН" },
  { key: "address", label: "Адрес" },
  { key: "city", label: "Город" },
  { key: "country", label: "Страна" },
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "bio", label: "О себе" },
  { key: "createdAt", label: "Дата регистрации" },
  { key: "updatedAt", label: "Обновлён" },
  { key: "lastLoginAt", label: "Последний вход" },
  { key: "emailVerified", label: "Email подтверждён" },
  { key: "phoneVerified", label: "Телефон подтверждён" },
  { key: "isBlocked", label: "Заблокирован" },
  { key: "twoFactorEnabled", label: "2FA" },
];

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (key === "createdAt" || key === "updatedAt" || key === "lastLoginAt") {
    try {
      return format(new Date(value as string), "dd.MM.yyyy HH:mm", { locale: ru });
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function orderStatusLabel(status: string): string {
  switch (String(status || "").toLowerCase()) {
    case "pending": return "Ожидание";
    case "paid": return "Оплачен";
    case "processing": return "В обработке";
    case "shipped": return "Отправлен";
    case "delivered": return "Доставлен";
    case "cancelled": return "Отменён";
    case "completed": return "Завершён";
    default: return status || "—";
  }
}

function orderStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "delivered" || s === "completed") return "default";
  if (s === "pending" || s === "processing" || s === "shipped") return "secondary";
  if (s === "cancelled") return "destructive";
  return "outline";
}

export function UserDetailDialog({ userId, open, onOpenChange }: Props) {
  // fetch only when dialog открыт и есть id.
  const { data, isLoading, isError, error } = useQuery<FullUserResponse>({
    queryKey: ["/api/admin/users", userId, "full"],
    enabled: !!userId && open,
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Ошибка ${res.status}`);
      }
      return (await res.json()) as FullUserResponse;
    },
  });

  const user = data?.user || null;
  const summary = data?.summary;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "—";
  const initials = ((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase() || (user?.email?.[0] || "?").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Карточка пользователя</DialogTitle>
          <DialogDescription>
            Полная информация о пользователе: профиль, заказы, активность, согласия
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-destructive">
            Не удалось загрузить пользователя: {error instanceof Error ? error.message : "неизвестная ошибка"}
          </div>
        ) : !user ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Пользователь не найден</div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Шапка с аватаркой и ключевыми счётчиками */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b pb-4 mb-4">
              <Avatar className="w-16 h-16">
                {user.avatar ? <AvatarImage src={user.avatar} alt={name} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold truncate">{name}</h3>
                  <Badge variant={user.role === "superadmin" ? "default" : user.role === "admin" ? "secondary" : "outline"}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role || "user"}
                  </Badge>
                  {user.isBlocked && <Badge variant="destructive">Заблокирован</Badge>}
                  {user.emailVerified ? (
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                      Email ✓
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  {user.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
                  )}
                  {user.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>
                  )}
                  {(user.city || user.country) && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[user.city, user.country].filter(Boolean).join(", ")}</span>
                  )}
                  {user.createdAt && (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> с {formatValue("createdAt", user.createdAt)}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">Заказов</div>
                  <div className="text-lg font-semibold">{summary?.totalOrders ?? 0}</div>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">Оплачено</div>
                  <div className="text-lg font-semibold">{summary?.paidOrders ?? 0}</div>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">Потрачено</div>
                  <div className="text-lg font-semibold">{Number(summary?.totalSpent || 0).toLocaleString("ru-RU")} ₽</div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="profile">Профиль</TabsTrigger>
                <TabsTrigger value="orders">
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Заказы ({data?.orders.length || 0})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Bell className="w-3 h-3 mr-1" />
                  Активность
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  <Inbox className="w-3 h-3 mr-1" />
                  Заявки ({data?.contactSubmissions.length || 0})
                </TabsTrigger>
                <TabsTrigger value="consents">
                  <FileCheck className="w-3 h-3 mr-1" />
                  Согласия
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-3 pr-2">
                <TabsContent value="profile" className="mt-0">
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                    {PROFILE_FIELDS.filter((f) => user[f.key] !== undefined && user[f.key] !== null && user[f.key] !== "").map((f) => (
                      <div key={f.key} className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5">
                        <span className="text-xs text-muted-foreground">{f.label}</span>
                        <span className="text-sm text-right break-words">{formatValue(f.key, user[f.key])}</span>
                      </div>
                    ))}
                  </div>

                  {/* Всё остальное — в "сыром" виде, чтобы админ видел даже
                      поля, о которых UI не знает (кастомные миграции и т.п.) */}
                  {(() => {
                    const knownKeys = new Set(PROFILE_FIELDS.map((f) => f.key).concat([
                      "password", "passwordHash", "avatar", "refreshTokens",
                    ]));
                    const extra = Object.entries(user).filter(([k, v]) => !knownKeys.has(k) && v !== null && v !== undefined && v !== "");
                    if (!extra.length) return null;
                    return (
                      <details className="mt-4 rounded-lg border p-3 bg-muted/30">
                        <summary className="cursor-pointer text-xs font-medium">Все поля ({extra.length})</summary>
                        <div className="mt-2 text-xs grid grid-cols-1 gap-1">
                          {extra.map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-3">
                              <code className="text-muted-foreground">{k}</code>
                              <span className="break-all text-right max-w-[60%] truncate">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="orders" className="mt-0 space-y-2">
                  {(data?.orders.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">Заказов нет</div>
                  ) : (
                    (data?.orders || []).map((o: any) => (
                      <div key={o.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {o.productName || o.productTitle || o.productId || "Заказ"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{String(o.id || "").slice(0, 8)}
                            {o.createdAt ? ` · ${format(new Date(o.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}` : ""}
                            {o.quantity ? ` · кол-во: ${o.quantity}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={orderStatusVariant(o.paymentStatus)}>
                            {orderStatusLabel(o.paymentStatus)}
                          </Badge>
                          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {Number(o.finalAmount || o.amount || 0).toLocaleString("ru-RU")} ₽
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-0 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-xs text-muted-foreground">Избранное</div>
                      <div className="text-lg font-semibold flex items-center gap-1">
                        <Heart className="w-4 h-4 text-rose-500" />
                        {summary?.favoritesCount ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-xs text-muted-foreground">Уведомлений</div>
                      <div className="text-lg font-semibold">{data?.notifications.length ?? 0}</div>
                    </div>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-xs text-muted-foreground">Непрочитано</div>
                      <div className="text-lg font-semibold">{summary?.unreadNotifications ?? 0}</div>
                    </div>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-xs text-muted-foreground">Последний вход</div>
                      <div className="text-sm font-semibold">
                        {summary?.lastLoginAt ? format(new Date(summary.lastLoginAt), "dd.MM.yyyy HH:mm", { locale: ru }) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold mt-2">Последние уведомления</h4>
                    {(data?.notifications.length || 0) === 0 ? (
                      <div className="text-xs text-muted-foreground py-3 text-center">Уведомлений нет</div>
                    ) : (
                      (data?.notifications || []).slice(0, 15).map((n: any) => (
                        <div key={n.id} className={`rounded-lg border p-2.5 text-sm ${n.read || n.isRead ? "" : "bg-primary/5 border-primary/30"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{n.title || n.subject || "Уведомление"}</div>
                              {n.message || n.body ? (
                                <div className="text-xs text-muted-foreground line-clamp-2">{n.message || n.body}</div>
                              ) : null}
                            </div>
                            {n.createdAt ? (
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(n.createdAt), "dd.MM HH:mm", { locale: ru })}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold mt-4">Избранные товары</h4>
                    {(data?.favorites.length || 0) === 0 ? (
                      <div className="text-xs text-muted-foreground py-3 text-center">Нет избранных</div>
                    ) : (
                      (data?.favorites || []).slice(0, 20).map((f: any) => (
                        <div key={f.id || f.productId} className="rounded-lg border p-2 text-sm flex items-center justify-between">
                          <span className="truncate">{f.productName || f.name || f.productId || "Товар"}</span>
                          {f.createdAt && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(f.createdAt), "dd.MM.yyyy", { locale: ru })}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="mt-0 space-y-2">
                  {(data?.contactSubmissions.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">Заявок от пользователя нет</div>
                  ) : (
                    (data?.contactSubmissions || []).map((c: any) => (
                      <div key={c.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium truncate">{c.subject || c.topic || "Заявка"}</div>
                          {c.createdAt && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(c.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}
                            </div>
                          )}
                        </div>
                        {c.message && (
                          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{c.message}</div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="consents" className="mt-0 space-y-2">
                  {(data?.consents.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">Согласий нет</div>
                  ) : (
                    (data?.consents || []).map((c: any) => (
                      <div key={c.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium">{c.consentType || c.type || "Согласие"}</div>
                          <Badge variant={c.revoked ? "destructive" : "default"}>
                            {c.revoked ? "Отозвано" : "Действует"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {c.givenAt && <div>Дано: {format(new Date(c.givenAt), "dd.MM.yyyy HH:mm", { locale: ru })}</div>}
                          {c.revokedAt && <div>Отозвано: {format(new Date(c.revokedAt), "dd.MM.yyyy HH:mm", { locale: ru })}</div>}
                          {c.ipAddress && <div>IP: {c.ipAddress}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
