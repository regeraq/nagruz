import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Package, Heart, Bell, Settings, Edit2, Save, X, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";

interface UserData {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  phone?: string | null;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

const profileSchema = z.object({
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа").optional().or(z.literal("")),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа").optional().or(z.literal("")),
  phone: z.string().min(10, "Введите корректный номер телефона").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery<UserData>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      return data.user;
    },
  });

  // Mock data for orders
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders/user"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      // This would be a real API call
      return [];
    },
    enabled: !!userData,
  });

  // Mock data for favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      return [];
    },
    enabled: !!userData,
  });

  // Mock data for notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      return [];
    },
    enabled: !!userData,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      phone: userData?.phone || "",
    },
  });
  useEffect(() => {
    if (userData) {
      reset({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phone: userData.phone || "",
      });
    }
  }, [userData, reset]);

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Ошибка при обновлении профиля");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
      toast({
        title: "Успешно",
        description: "Профиль обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfile.mutate(data);
  };

  const handleCancel = () => {
    reset({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      phone: userData?.phone || "",
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertDescription>Пользователь не найден. Пожалуйста, войдите в систему.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getUserInitials = () => {
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    }
    return userData.email[0].toUpperCase();
  };

  const getOrderStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Ожидает оплаты", variant: "outline" },
      paid: { label: "Оплачен", variant: "default" },
      processing: { label: "В обработке", variant: "secondary" },
      shipped: { label: "Отправлен", variant: "secondary" },
      delivered: { label: "Доставлен", variant: "default" },
      cancelled: { label: "Отменен", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={userData.avatar || undefined} />
                  <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>
                    {userData.firstName && userData.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : userData.email}
                  </CardTitle>
                  <CardDescription>{userData.email}</CardDescription>
                </div>
              <Button variant="ghost" onClick={() => setLocation("/")}>
                <User className="w-4 h-4 mr-2" />
                На главную
              </Button>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">
                  <User className="w-4 h-4 mr-2" />
                  Профиль
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <Package className="w-4 h-4 mr-2" />
                  Заказы
                  {orders.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {orders.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  <Heart className="w-4 h-4 mr-2" />
                  Избранное
                  {favorites.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {favorites.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="w-4 h-4 mr-2" />
                  Уведомления
                  {notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {notifications.filter((n: any) => !n.isRead).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Личные данные</CardTitle>
                    <CardDescription>Управление вашими личными данными</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Имя</Label>
                          {isEditing ? (
                            <>
                              <Input
                                id="firstName"
                                {...register("firstName")}
                                placeholder="Введите имя"
                                disabled={updateProfile.isPending}
                              />
                              {errors.firstName && (
                                <p className="text-sm text-destructive">{errors.firstName.message}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">
                              {userData.firstName || "Не указано"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName">Фамилия</Label>
                          {isEditing ? (
                            <>
                              <Input
                                id="lastName"
                                {...register("lastName")}
                                placeholder="Введите фамилию"
                                disabled={updateProfile.isPending}
                              />
                              {errors.lastName && (
                                <p className="text-sm text-destructive">{errors.lastName.message}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">
                              {userData.lastName || "Не указано"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground py-2 flex-1">{userData.email}</p>
                          {userData.isEmailVerified ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Подтвержден
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Не подтвержден
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Телефон</Label>
                        {isEditing ? (
                          <>
                            <Input
                              id="phone"
                              {...register("phone")}
                              placeholder="+7 (999) 123-45-67"
                              disabled={updateProfile.isPending}
                            />
                            {errors.phone && (
                              <p className="text-sm text-destructive">{errors.phone.message}</p>
                            )}
                            {userData.phone && !userData.isPhoneVerified && (
                              <p className="text-xs text-yellow-600">
                                Телефон не подтвержден. Отправьте код подтверждения.
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground py-2 flex-1">
                              {userData.phone || "Не указан"}
                            </p>
                            {userData.phone && (
                              userData.isPhoneVerified ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Подтвержден
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Не подтвержден
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {isEditing && (
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="submit"
                            disabled={updateProfile.isPending || !isDirty}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateProfile.isPending ? "Сохранение..." : "Сохранить"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={updateProfile.isPending}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Отмена
                          </Button>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>История заказов</CardTitle>
                    <CardDescription>Все ваши заказы в одном месте</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">У вас пока нет заказов</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order: any) => (
                          <Card key={order.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">Заказ #{order.id.slice(0, 8)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                                  </p>
                                </div>
                                {getOrderStatusBadge(order.paymentStatus)}
                              </div>
                              <Separator className="my-4" />
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Сумма</p>
                                  <p className="font-semibold">{order.finalAmount} ₽</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Способ оплаты</p>
                                  <p className="font-semibold">{order.paymentMethod}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="favorites" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Избранное</CardTitle>
                    <CardDescription>Сохраненные товары</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {favorites.length === 0 ? (
                      <div className="text-center py-12">
                        <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">У вас пока нет избранных товаров</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {favorites.map((favorite: any) => (
                          <Card key={favorite.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">{favorite.productName || "Товар"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Добавлено {format(new Date(favorite.createdAt), "d MMMM yyyy", { locale: ru })}
                                  </p>
                                </div>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Уведомления</CardTitle>
                        <CardDescription>Центр уведомлений</CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        Отметить все как прочитанные
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">У вас нет уведомлений</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notification: any) => (
                          <Card
                            key={notification.id}
                            className={!notification.isRead ? "border-primary" : ""}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold">{notification.title}</p>
                                    {!notification.isRead && (
                                      <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(notification.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
