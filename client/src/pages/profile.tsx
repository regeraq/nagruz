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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Package, Heart, Bell, Settings, Edit2, Save, X, CheckCircle2, XCircle, Clock, Trash2, ShoppingCart, Plus, Minus } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  description: string;
  specifications: string;
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
  const [buyDialog, setBuyDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addToFav, setAddToFav] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
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

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders/user"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      const res = await fetch("/api/orders/user", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userData,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      const res = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userData,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userData,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      return res.json();
    },
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
        firstName: userData.firstName?.toString() || "",
        lastName: userData.lastName?.toString() || "",
        phone: userData.phone?.toString() || "",
      });
    }
  }, [userData?.id, reset]);

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

  const createOrder = useMutation({
    mutationFn: async (productId: string) => {
      if (!userData || !selectedProduct) {
        throw new Error("Данные пользователя или товара недоступны");
      }

      const productPrice = parseFloat(selectedProduct.price);
      const totalAmount = productPrice * quantity;
      const finalAmount = totalAmount;

      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId,
          productPrice: selectedProduct.price,
          quantity,
          totalAmount: totalAmount.toString(),
          discountAmount: "0",
          finalAmount: finalAmount.toString(),
          paymentMethod: "Банковская карта",
          customerName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email.split("@")[0],
          customerEmail: userData.email,
          customerPhone: userData.phone || "+7 (999) 000-00-00",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Ошибка при создании заказа");
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (addToFav && selectedProduct) {
        addFavorite.mutate(selectedProduct.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/orders/user"] });
      setBuyDialog(false);
      setQuantity(1);
      setAddToFav(false);
      toast({
        title: "Заказ создан",
        description: `Заказ #${data.order.id.slice(0, 8)} успешно создан`,
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

  const addFavorite = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) throw new Error("Ошибка при добавлении в избранное");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Добавлено в избранное",
        description: "Товар добавлен в вашу коллекцию",
      });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/favorites/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Ошибка при удалении");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Удалено из избранного",
        description: "Товар удален из коллекции",
      });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Ошибка при удалении");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Удалено",
        description: "Уведомление удалено",
      });
    },
  });

  const clearNotifications = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/notifications/clear", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Ошибка при очистке");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Уведомления очищены",
        description: "Все уведомления удалены",
      });
    },
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Ошибка при обновлении");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Ошибка при смене пароля");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно обновлен",
      });
    },
    onError: (error: any) => {
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

  const handleBuy = (product: Product) => {
    setSelectedProduct(product);
    setBuyDialog(true);
    setQuantity(1);
    setAddToFav(false);
  };

  const handleBuyConfirm = () => {
    if (selectedProduct && quantity > 0 && quantity <= 99) {
      createOrder.mutate(selectedProduct.id);
    }
  };

  const handlePasswordChange = () => {
    if (!passwordForm.new || passwordForm.new.length < 8) {
      toast({
        title: "Ошибка",
        description: "Новый пароль должен содержать минимум 8 символов",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    changePassword.mutate({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.new,
    });
  };

  const filteredOrders = orders.filter((order: any) => {
    if (orderFilter === "all") return true;
    return order.paymentStatus === orderFilter;
  });

  const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
    if (orderSort === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

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
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile" data-testid="tab-profile">
                  <User className="w-4 h-4 mr-2" />
                  Профиль
                </TabsTrigger>
                <TabsTrigger value="orders" data-testid="tab-orders">
                  <Package className="w-4 h-4 mr-2" />
                  Заказы
                  {orders.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {orders.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="favorites" data-testid="tab-favorites">
                  <Heart className="w-4 h-4 mr-2" />
                  Избранное
                  {favorites.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {favorites.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notifications" data-testid="tab-notifications">
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
                                data-testid="input-first-name"
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
                                data-testid="input-last-name"
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
                            <Badge variant="default" className="gap-1" data-testid="badge-email-verified">
                              <CheckCircle2 className="w-3 h-3" />
                              Подтвержден
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1" data-testid="badge-email-unverified">
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
                              data-testid="input-phone"
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
                            <p className="text-sm text-muted-foreground py-2 flex-1" data-testid="text-phone">
                              {userData.phone || "Не указан"}
                            </p>
                            {userData.phone && (
                              userData.isPhoneVerified ? (
                                <Badge variant="default" className="gap-1" data-testid="badge-phone-verified">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Подтвержден
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1" data-testid="badge-phone-unverified">
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
                            data-testid="button-save-profile"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateProfile.isPending ? "Сохранение..." : "Сохранить"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={updateProfile.isPending}
                            data-testid="button-cancel-profile"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Отмена
                          </Button>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPasswordDialog(true)}
                            data-testid="button-change-password"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Изменить пароль
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>История заказов</CardTitle>
                        <CardDescription>Все ваши заказы в одном месте</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOrderSort(orderSort === "newest" ? "oldest" : "newest")}
                          data-testid="button-sort-orders"
                        >
                          {orderSort === "newest" ? "Сначала новые" : "Сначала старые"}
                        </Button>
                      </div>
                    </div>
                    {orders.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-4">
                        <Button
                          variant={orderFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("all")}
                          data-testid="filter-all"
                        >
                          Все ({orders.length})
                        </Button>
                        <Button
                          variant={orderFilter === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("pending")}
                          data-testid="filter-pending"
                        >
                          Ожидают оплаты ({orders.filter((o: any) => o.paymentStatus === "pending").length})
                        </Button>
                        <Button
                          variant={orderFilter === "paid" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("paid")}
                          data-testid="filter-paid"
                        >
                          Оплачены ({orders.filter((o: any) => o.paymentStatus === "paid").length})
                        </Button>
                        <Button
                          variant={orderFilter === "processing" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("processing")}
                          data-testid="filter-processing"
                        >
                          В обработке ({orders.filter((o: any) => o.paymentStatus === "processing").length})
                        </Button>
                        <Button
                          variant={orderFilter === "shipped" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("shipped")}
                          data-testid="filter-shipped"
                        >
                          Отправлены ({orders.filter((o: any) => o.paymentStatus === "shipped").length})
                        </Button>
                        <Button
                          variant={orderFilter === "delivered" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("delivered")}
                          data-testid="filter-delivered"
                        >
                          Доставлены ({orders.filter((o: any) => o.paymentStatus === "delivered").length})
                        </Button>
                        <Button
                          variant={orderFilter === "cancelled" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter("cancelled")}
                          data-testid="filter-cancelled"
                        >
                          Отменены ({orders.filter((o: any) => o.paymentStatus === "cancelled").length})
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">У вас пока нет заказов</p>
                        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/products"] })} data-testid="button-view-products">
                          Просмотреть товары
                        </Button>
                      </div>
                    ) : sortedOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Нет заказов с выбранным фильтром</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedOrders.map((order: any) => (
                          <Card key={order.id} data-testid={`card-order-${order.id}`}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <p className="font-semibold" data-testid={`text-order-id-${order.id}`}>Заказ #{order.id.slice(0, 8)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                                  </p>
                                </div>
                                {getOrderStatusBadge(order.paymentStatus)}
                              </div>
                              <Separator className="my-4" />
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Товар</p>
                                  <p className="font-semibold" data-testid={`text-product-name-${order.id}`}>{order.productName || "Товар"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Цена за единицу</p>
                                  <p className="font-semibold" data-testid={`text-product-price-${order.id}`}>{order.productPrice} ₽</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Количество</p>
                                  <p className="font-semibold" data-testid={`text-quantity-${order.id}`}>{order.quantity} шт.</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Итого</p>
                                  <p className="font-semibold" data-testid={`text-total-${order.id}`}>{order.finalAmount} ₽</p>
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
                          <Card key={favorite.productId} data-testid={`card-favorite-${favorite.productId}`}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold" data-testid={`text-favorite-name-${favorite.productId}`}>{favorite.product?.name || "Товар"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {favorite.product?.price} ₽
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    На складе: {favorite.product?.stock || 0} шт.
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Добавлено {format(new Date(favorite.createdAt), "d MMMM yyyy", { locale: ru })}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => handleBuy(favorite.product)}
                                    disabled={!favorite.product || favorite.product.stock === 0}
                                    data-testid={`button-buy-favorite-${favorite.productId}`}
                                  >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Купить
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeFavorite.mutate(favorite.productId)}
                                    disabled={removeFavorite.isPending}
                                    data-testid={`button-delete-favorite-${favorite.productId}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
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

              <TabsContent value="notifications" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Уведомления</CardTitle>
                        <CardDescription>Центр уведомлений</CardDescription>
                      </div>
                      {notifications.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => clearNotifications.mutate()}
                          disabled={clearNotifications.isPending}
                          data-testid="button-clear-notifications"
                        >
                          Очистить все
                        </Button>
                      )}
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
                            className={!notification.isRead ? "border-primary cursor-pointer" : "cursor-pointer"}
                            data-testid={`card-notification-${notification.id}`}
                            onClick={() => {
                              if (!notification.isRead) {
                                markNotificationRead.mutate(notification.id);
                              }
                            }}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold" data-testid={`text-notification-title-${notification.id}`}>{notification.title}</p>
                                    {!notification.isRead && (
                                      <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" data-testid={`badge-unread-${notification.id}`} />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(notification.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  {!notification.isRead && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markNotificationRead.mutate(notification.id);
                                      }}
                                      disabled={markNotificationRead.isPending}
                                      data-testid={`button-mark-read-${notification.id}`}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification.mutate(notification.id);
                                    }}
                                    disabled={deleteNotification.isPending}
                                    data-testid={`button-delete-notification-${notification.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
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

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Доступные товары</CardTitle>
                <CardDescription>Выберите товар для покупки</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product: Product) => (
                    <Card key={product.id} data-testid={`card-product-${product.id}`}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <p className="font-semibold text-lg" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">{product.specifications}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold" data-testid={`text-product-price-${product.id}`}>{product.price} ₽</p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-product-stock-${product.id}`}>
                                В наличии: {product.stock}
                              </p>
                            </div>
                            <Button 
                              onClick={() => handleBuy(product)}
                              disabled={product.stock === 0}
                              data-testid={`button-buy-${product.id}`}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Купить
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CardContent>

          <div className="flex justify-end gap-2 p-4 border-t">
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
              На главную
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={buyDialog} onOpenChange={setBuyDialog}>
        <DialogContent data-testid="dialog-buy">
          <DialogHeader>
            <DialogTitle>Оформление покупки</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Цена</p>
                    <p className="font-semibold" data-testid="text-dialog-price">{selectedProduct.price} ₽</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">В наличии</p>
                    <p className="font-semibold" data-testid="text-dialog-stock">{selectedProduct.stock} шт.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Количество</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="button-quantity-minus"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="text-center w-16"
                    data-testid="input-quantity"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuantity(Math.min(99, quantity + 1))}
                    data-testid="button-quantity-plus"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Итого</p>
                  <p className="text-2xl font-bold" data-testid="text-dialog-total">
                    {(parseFloat(selectedProduct.price) * quantity).toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addToFav"
                  checked={addToFav}
                  onChange={(e) => setAddToFav(e.target.checked)}
                  data-testid="checkbox-add-to-favorites"
                />
                <Label htmlFor="addToFav" className="cursor-pointer">
                  Добавить в избранное
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialog(false)} data-testid="button-dialog-cancel">
              Отмена
            </Button>
            <Button onClick={handleBuyConfirm} disabled={createOrder.isPending} data-testid="button-dialog-buy">
              {createOrder.isPending ? "Оформление..." : "Оформить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent data-testid="dialog-change-password">
          <DialogHeader>
            <DialogTitle>Изменить пароль</DialogTitle>
            <DialogDescription>
              Введите текущий пароль и новый пароль
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Текущий пароль</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                placeholder="Введите текущий пароль"
                data-testid="input-current-password"
              />
            </div>

            <div>
              <Label htmlFor="new-password">Новый пароль</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                placeholder="Минимум 8 символов"
                data-testid="input-new-password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Пароль должен содержать минимум 8 символов
              </p>
            </div>

            <div>
              <Label htmlFor="confirm-password">Подтвердите новый пароль</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="Повторите новый пароль"
                data-testid="input-confirm-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForm({ current: "", new: "", confirm: "" });
              }}
              data-testid="button-cancel-password"
            >
              Отмена
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={changePassword.isPending || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
              data-testid="button-confirm-password"
            >
              {changePassword.isPending ? "Изменение..." : "Изменить пароль"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
