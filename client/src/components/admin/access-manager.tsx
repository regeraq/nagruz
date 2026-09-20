import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock, Globe, UserPlus, Loader2 } from "lucide-react";

const DEFAULT_NOTICE = "Сайт временно закрыт: идут технические работы.";

interface Props {
  settings: { key: string; value?: string | null }[];
  registeredUsers: number;
}

function readBool(settings: Props["settings"], key: string, fallback: boolean): boolean {
  const row = settings.find((s) => s.key === key);
  if (!row || row.value == null || String(row.value).trim() === "") return fallback;
  const v = String(row.value).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function AccessManager({ settings, registeredUsers }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [privateMode, setPrivateMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [notice, setNotice] = useState(DEFAULT_NOTICE);
  const [busy, setBusy] = useState(false);
  const hydrated = useRef(false);

  // Форма заполняется один раз: последующие refetch не должны затирать ввод.
  useEffect(() => {
    if (hydrated.current || !settings?.length) return;
    setPrivateMode(readBool(settings, "site_private_mode", false));
    setRegistrationEnabled(readBool(settings, "registration_enabled", true));
    const savedNotice = settings.find((s) => s.key === "site_private_notice")?.value;
    if (savedNotice && String(savedNotice).trim()) setNotice(String(savedNotice));
    hydrated.current = true;
  }, [settings]);

  async function save(next: { privateMode?: boolean; registrationEnabled?: boolean; notice?: string }) {
    const payload = {
      privateMode: next.privateMode ?? privateMode,
      registrationEnabled: next.registrationEnabled ?? registrationEnabled,
      notice: (next.notice ?? notice).trim() || DEFAULT_NOTICE,
    };
    setBusy(true);
    try {
      await apiRequest("PUT", "/api/admin/settings", {
        settings: [
          {
            key: "site_private_mode",
            value: payload.privateMode ? "true" : "false",
            type: "boolean",
            description: "Закрытый режим: сайт виден только вошедшим пользователям",
          },
          {
            key: "registration_enabled",
            value: payload.registrationEnabled ? "true" : "false",
            type: "boolean",
            description: "Разрешить регистрацию новых пользователей",
          },
          {
            key: "site_private_notice",
            value: payload.notice,
            type: "string",
            description: "Текст на экране закрытого сайта",
          },
        ],
      });
      setPrivateMode(payload.privateMode);
      setRegistrationEnabled(payload.registrationEnabled);
      setNotice(payload.notice);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-access"] });
      toast({ title: "Сохранено", description: payload.privateMode ? "Сайт закрыт" : "Сайт открыт" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось сохранить", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="text-sm">
          Закрытый режим прячет весь сайт от посторонних: вместо страниц показывается окно входа.
          Зайти смогут вы и те, кто уже зарегистрирован. Новую регистрацию при этом создать нельзя.
          Сейчас аккаунтов: <strong>{registeredUsers}</strong>.
        </AlertDescription>
      </Alert>

      <Card className={privateMode ? "border-amber-500/60" : ""}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 min-w-0">
              <div className="mt-0.5">
                {privateMode ? (
                  <Lock className="w-5 h-5 text-amber-600" />
                ) : (
                  <Globe className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="min-w-0">
                <Label className="text-base font-semibold">
                  {privateMode ? "Сайт закрыт" : "Сайт открыт для всех"}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {privateMode
                    ? "Посторонние видят только окно входа. Поисковикам сайт закрыт."
                    : "Любой человек из поиска видит сайт целиком и может зарегистрироваться."}
                </p>
              </div>
            </div>
            <Switch
              checked={privateMode}
              disabled={busy}
              onCheckedChange={(checked) => save({ privateMode: checked })}
            />
          </div>

          <div className="pt-2 border-t space-y-2">
            <Label className="text-sm">Что увидит посетитель на экране входа</Label>
            <Textarea
              value={notice}
              rows={2}
              onChange={(e) => setNotice(e.target.value)}
              placeholder={DEFAULT_NOTICE}
            />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => save({})}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Сохранить текст
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 min-w-0">
              <UserPlus className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div className="min-w-0">
                <Label className="text-base font-semibold">Регистрация новых пользователей</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {privateMode
                    ? "В закрытом режиме регистрация запрещена в любом случае."
                    : registrationEnabled
                      ? "Новый человек может создать аккаунт на сайте."
                      : "Кнопка регистрации скрыта, создать аккаунт нельзя."}
                </p>
              </div>
            </div>
            <Switch
              checked={registrationEnabled && !privateMode}
              disabled={busy || privateMode}
              onCheckedChange={(checked) => save({ registrationEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Проверить можно так: откройте сайт в окне «инкогнито». Если режим включён — там будет только форма входа.
      </p>
    </div>
  );
}
