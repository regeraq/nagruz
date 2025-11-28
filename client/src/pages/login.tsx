import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Пароль обязателен"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf-token", { credentials: "include" });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.token;

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Более понятные сообщения об ошибках
        let errorMessage = result.message || "Ошибка при входе";
        
        if (response.status === 401) {
          if (errorMessage.includes("пароль") || errorMessage.includes("password")) {
            errorMessage = "Неверный email или пароль. Проверьте правильность введенных данных.";
          } else if (errorMessage.includes("найден") || errorMessage.includes("not found")) {
            errorMessage = "Аккаунт с таким email не найден. Проверьте email или зарегистрируйтесь.";
          } else {
            errorMessage = "Неверный email или пароль.";
          }
        } else if (response.status === 403) {
          errorMessage = "Ваш аккаунт заблокирован. Обратитесь в поддержку.";
        } else if (response.status === 429) {
          errorMessage = "Слишком много попыток входа. Попробуйте позже.";
        }
        
        setError(errorMessage);
        return;
      }

      // Store tokens
      if (result.tokens) {
        localStorage.setItem("accessToken", result.tokens.accessToken);
        localStorage.setItem("refreshToken", result.tokens.refreshToken);
      }

      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Успешно",
        description: "Вход выполнен успешно",
      });

      // Redirect to profile or home without reload
      setLocation("/profile");
    } catch (err) {
      setError("Произошла ошибка при входе");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Войдите в свой аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register("email")}
                disabled={isLoading}
                className={errors.email ? "border-destructive" : ""}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span>•</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                disabled={isLoading}
                className={errors.password ? "border-destructive" : ""}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span>•</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Вход..." : "Войти"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Нет аккаунта? </span>
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline"
              >
                Зарегистрироваться
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

