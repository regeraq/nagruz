import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { SITE_ACCESS_QUERY_KEY } from "@/hooks/useSiteAccess";

/**
 * Заглушка закрытого сайта: только вход, без навигации, каталога и регистрации.
 * Показывается, пока в админке включён режим «Доступ к сайту → закрыт».
 */
export function SiteLocked({ notice }: { notice: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "Сайт закрыт — вход";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const csrfRes = await fetch("/api/csrf-token", { credentials: "include" });
      const csrfData = await csrfRes.json().catch(() => ({}));

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfData?.token || "",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) setError("Неверный email или пароль.");
        else if (res.status === 403) setError("Этот аккаунт заблокирован.");
        else if (res.status === 429) setError("Слишком много попыток. Попробуйте позже.");
        else setError(result?.message || "Не удалось войти.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: SITE_ACCESS_QUERY_KEY });
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Доступ по входу</CardTitle>
          <CardDescription className="text-sm">{notice}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="locked-email" className="text-sm">Email</Label>
              <Input
                id="locked-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11"
                autoComplete="email"
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locked-password" className="text-sm">Пароль</Label>
              <Input
                id="locked-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? "Вход..." : "Войти"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Регистрация закрыта. Войти могут только те, у кого уже есть аккаунт.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
