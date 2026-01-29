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
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  confirmPassword: z.string(),
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа").optional(),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа").optional(),
  phone: z.string().min(10, "Введите корректный номер телефона").optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf-token", { credentials: "include" });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.token;

      const { confirmPassword, ...registerData } = data;

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(registerData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Более понятные сообщения об ошибках
        let errorMessage = result.message || "Ошибка при регистрации";
        
        if (response.status === 409) {
          if (errorMessage.includes("email")) {
            errorMessage = "Пользователь с таким email уже существует. Используйте другой email или войдите в существующий аккаунт.";
          } else if (errorMessage.includes("телефон") || errorMessage.includes("phone")) {
            errorMessage = "Пользователь с таким номером телефона уже существует.";
          } else {
            errorMessage = "Пользователь с такими данными уже существует.";
          }
        } else if (response.status === 400) {
          if (result.errors) {
            const firstError = result.errors[0];
            errorMessage = firstError.message || "Проверьте правильность введенных данных.";
          }
        }
        
        setError(errorMessage);
        return;
      }

      // Store tokens
      if (result.tokens) {
        localStorage.setItem("accessToken", result.tokens.accessToken);
        localStorage.setItem("refreshToken", result.tokens.refreshToken);
      }

      // Invalidate and refetch user data (don't await - do it in background)
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      // Redirect immediately
      setLocation("/profile");
      
      // Show toast after redirect
      toast({
        title: "Успешно",
        description: "Регистрация успешна. Добро пожаловать!",
      });
    } catch (err) {
      setError("Произошла ошибка при регистрации");
      console.error("Register error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6 sm:py-12 pt-20 sm:pt-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl">Регистрация</CardTitle>
          <CardDescription className="text-sm">Создайте новый аккаунт</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="firstName" className="text-sm">Имя</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  disabled={isLoading}
                  className="h-11 sm:h-12"
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="lastName" className="text-sm">Фамилия</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  disabled={isLoading}
                  className="h-11 sm:h-12"
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register("email")}
                disabled={isLoading}
                className="h-11 sm:h-12"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="phone" className="text-sm">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                {...register("phone")}
                disabled={isLoading}
                className="h-11 sm:h-12"
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm">Пароль *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 8 символов"
                {...register("password")}
                disabled={isLoading}
                className={`h-11 sm:h-12 ${errors.password ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>•</span>
                  {errors.password.message}
                </p>
              )}
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Минимум 8 символов
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Подтвердите пароль *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                {...register("confirmPassword")}
                disabled={isLoading}
                className={`h-11 sm:h-12 ${errors.confirmPassword ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>•</span>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2.5 sm:space-y-3 pt-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent-personal-data-register"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="consent-personal-data-register" className="text-xs sm:text-sm leading-relaxed cursor-pointer">
                  Я даю согласие на обработку персональных данных *
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent-data-processing-register"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="consent-data-processing-register" className="text-xs sm:text-sm leading-relaxed cursor-pointer">
                  Я принимаю условия{" "}
                  <a href="/data-processing-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Политики обработки данных
                  </a>{" "}
                  и{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Политики конфиденциальности
                  </a> *
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Уже есть аккаунт? </span>
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-primary hover:underline font-medium"
              >
                Войти
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

