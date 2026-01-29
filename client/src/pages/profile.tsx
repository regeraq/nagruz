import { useState, useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  User, Package, Heart, Bell, Settings, Edit2, Save, X, CheckCircle2, 
  XCircle, Clock, Trash2, ShoppingCart, Plus, Minus, Shield, 
  CreditCard, MapPin, Calendar, TrendingUp, Award, LogOut,
  Eye, EyeOff, Mail, Phone, Lock, ChevronRight, Sparkles,
  Download, FileText, AlertTriangle, CheckCheck, Star, Zap,
  Activity, BarChart3, Crown, Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Notification settings
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyPromotions, setNotifyPromotions] = useState(false);
  const [notifyNews, setNotifyNews] = useState(true);
  
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

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    if (!userData) return 0;
    let completed = 0;
    const total = 5;
    
    if (userData.email) completed++;
    if (userData.firstName) completed++;
    if (userData.lastName) completed++;
    if (userData.phone) completed++;
    if (userData.isEmailVerified) completed++;
    
    return Math.round((completed / total) * 100);
  }, [userData]);

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return orders.reduce((sum: number, order: any) => {
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'delivered') {
        return sum + parseFloat(order.finalAmount || 0);
      }
      return sum;
    }, 0);
  }, [orders]);

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
      let errorMsg = error.message;
      
      if (errorMsg && errorMsg.includes(": {")) {
        try {
          const jsonPart = errorMsg.substring(errorMsg.indexOf("{"));
          const parsed = JSON.parse(jsonPart);
          errorMsg = parsed.message || errorMsg;
        } catch (e) {}
      }
      
      toast({
        title: "Ошибка",
        description: errorMsg,
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

      let customerName = "Покупатель";
      const firstName = userData.firstName?.trim() || "";
      const lastName = userData.lastName?.trim() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (fullName && fullName.length >= 2) {
        customerName = fullName;
      } else {
        const emailLocalPart = userData.email.split("@")[0] || "";
        if (emailLocalPart && emailLocalPart.length >= 2) {
          customerName = emailLocalPart;
        }
      }
      
      let customerPhone = "+7 (900) 000-00-00";
      const userPhone = userData.phone?.trim() || "";
      const phoneDigits = userPhone.replace(/\D/g, "");
      if (phoneDigits.length >= 10) {
        customerPhone = userPhone;
      }

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
          customerName,
          customerEmail: userData.email,
          customerPhone,
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
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setBuyDialog(false);
      setQuantity(1);
      setAddToFav(false);
      toast({
        title: "Заказ создан",
        description: `Заказ #${data.order.id.slice(0, 8)} успешно создан`,
      });
    },
    onError: (error: Error) => {
      let errorMsg = error.message;
      
      if (errorMsg && errorMsg.includes(": {")) {
        try {
          const jsonPart = errorMsg.substring(errorMsg.indexOf("{"));
          const parsed = JSON.parse(jsonPart);
          errorMsg = parsed.message || errorMsg;
        } catch (e) {}
      }
      
      toast({
        title: "Ошибка оформления",
        description: errorMsg,
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
    if (product.stock <= 0) {
      toast({
        title: "Товар недоступен",
        description: `${product.name} полностью распродан`,
        variant: "destructive",
      });
      return;
    }
    setSelectedProduct(product);
    setBuyDialog(true);
    setQuantity(1);
    setAddToFav(false);
  };

  const handleBuyConfirm = () => {
    if (!selectedProduct) return;
    if (selectedProduct.stock <= 0) {
      toast({
        title: "Товар недоступен",
        description: `К сожалению, ${selectedProduct.name} полностью распродан`,
        variant: "destructive",
      });
      setBuyDialog(false);
      return;
    }
    if (quantity > selectedProduct.stock) {
      toast({
        title: "Недостаточно товара",
        description: `Доступно только ${selectedProduct.stock} шт.`,
        variant: "destructive",
      });
      return;
    }
    if (quantity > 0) {
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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    queryClient.clear();
    setLocation("/login");
    toast({
      title: "Выход выполнен",
      description: "Вы успешно вышли из системы",
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-64 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-32 bg-muted/50 rounded-2xl" />
                <div className="h-32 bg-muted/50 rounded-2xl" />
                <div className="h-32 bg-muted/50 rounded-2xl" />
              </div>
              <div className="h-96 bg-muted/50 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Требуется авторизация</h2>
            <p className="text-muted-foreground mb-6">Пожалуйста, войдите в систему для доступа к профилю</p>
            <Button 
              onClick={() => setLocation("/login")} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Войти в аккаунт
            </Button>
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

  const getOrderStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
      pending: { label: "Ожидает оплаты", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", icon: Clock },
      paid: { label: "Оплачен", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle2 },
      processing: { label: "В обработке", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Activity },
      shipped: { label: "Отправлен", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", icon: Package },
      delivered: { label: "Доставлен", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCheck },
      cancelled: { label: "Отменен", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", icon: XCircle },
    };
    return configs[status] || { label: status, color: "text-gray-600", bgColor: "bg-gray-100", icon: Clock };
  };

  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      {/* Hero Profile Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 dark:from-blue-800 dark:via-indigo-800 dark:to-violet-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative container mx-auto px-4 py-8 pt-24 pb-32">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500" />
                <Avatar className="relative w-28 h-28 lg:w-36 lg:h-36 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={userData.avatar || undefined} className="object-cover" />
                  <AvatarFallback className="text-3xl lg:text-4xl font-bold bg-gradient-to-br from-white/20 to-white/5 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex-1 text-white">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl lg:text-4xl font-bold">
                    {userData.firstName && userData.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : userData.email.split('@')[0]}
                  </h1>
                  {userData.isEmailVerified && (
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Подтверждён
                    </Badge>
                  )}
                </div>
                <p className="text-white/70 text-sm lg:text-base mb-4">{userData.email}</p>
                
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 lg:gap-6">
                  <div className="flex items-center gap-2 text-white/80">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">С {format(new Date(userData.createdAt), "MMMM yyyy", { locale: ru })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">{orders.length} заказов</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">{favorites.length} в избранном</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2 lg:flex-col">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="bg-white/10 border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 backdrop-blur-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path 
              d="M0 100V50C240 80 480 20 720 50C960 80 1200 20 1440 50V100H0Z" 
              className="fill-slate-50 dark:fill-slate-950"
            />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
        <div className="max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Profile Completion */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {profileCompletion}%
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Заполнение профиля</p>
                <Progress value={profileCompletion} className="h-2" />
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {orders.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Всего заказов</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orders.filter((o: any) => o.paymentStatus === 'pending').length} ожидают оплаты
                </p>
              </CardContent>
            </Card>

            {/* Total Spent */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold">{totalSpent.toLocaleString('ru-RU')} ₽</p>
                <p className="text-sm font-medium text-muted-foreground">Сумма покупок</p>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer" onClick={() => setActiveTab("notifications")}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative">
                    <Bell className="w-6 h-6 text-white" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                        {unreadNotifications}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Уведомления</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unreadNotifications > 0 ? `${unreadNotifications} непрочитанных` : "Нет новых"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl mb-6">
              <CardContent className="p-2">
                <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-transparent p-0">
                  {[
                    { value: "overview", icon: User, label: "Профиль" },
                    { value: "orders", icon: Package, label: "Заказы", badge: orders.length },
                    { value: "favorites", icon: Heart, label: "Избранное", badge: favorites.length },
                    { value: "notifications", icon: Bell, label: "Уведомления", badge: unreadNotifications },
                    { value: "security", icon: Shield, label: "Безопасность" },
                    { value: "settings", icon: Settings, label: "Настройки" },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 min-w-[100px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-xl py-3 px-4 transition-all duration-300"
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <Badge 
                          variant={tab.value === "notifications" ? "destructive" : "secondary"} 
                          className="ml-2 h-5 min-w-[20px] text-xs"
                        >
                          {tab.badge}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardContent>
            </Card>

            {/* Profile Tab */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal Info Card */}
                <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          Личные данные
                        </CardTitle>
                        <CardDescription>Управление информацией профиля</CardDescription>
                      </div>
                      {!isEditing && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-medium">
                            <User className="w-4 h-4 text-muted-foreground" />
                            Имя
                          </Label>
                          {isEditing ? (
                            <>
                              <Input
                                id="firstName"
                                {...register("firstName")}
                                placeholder="Введите имя"
                                disabled={updateProfile.isPending}
                                className="h-12 bg-muted/50 border-0 focus:ring-2 focus:ring-blue-500"
                              />
                              {errors.firstName && (
                                <p className="text-sm text-destructive">{errors.firstName.message}</p>
                              )}
                            </>
                          ) : (
                            <div className="h-12 flex items-center px-4 rounded-lg bg-muted/30">
                              <span className={userData.firstName ? "font-medium" : "text-muted-foreground"}>
                                {userData.firstName || "Не указано"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="flex items-center gap-2 text-sm font-medium">
                            <User className="w-4 h-4 text-muted-foreground" />
                            Фамилия
                          </Label>
                          {isEditing ? (
                            <>
                              <Input
                                id="lastName"
                                {...register("lastName")}
                                placeholder="Введите фамилию"
                                disabled={updateProfile.isPending}
                                className="h-12 bg-muted/50 border-0 focus:ring-2 focus:ring-blue-500"
                              />
                              {errors.lastName && (
                                <p className="text-sm text-destructive">{errors.lastName.message}</p>
                              )}
                            </>
                          ) : (
                            <div className="h-12 flex items-center px-4 rounded-lg bg-muted/30">
                              <span className={userData.lastName ? "font-medium" : "text-muted-foreground"}>
                                {userData.lastName || "Не указано"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email
                        </Label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-12 flex items-center px-4 rounded-lg bg-muted/30">
                            <span className="font-medium">{userData.email}</span>
                          </div>
                          {userData.isEmailVerified ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 h-8">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Подтверждён
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 text-amber-600 h-8">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                              Не подтверждён
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          Телефон
                        </Label>
                        {isEditing ? (
                          <>
                            <Input
                              id="phone"
                              {...register("phone")}
                              placeholder="+7 (999) 123-45-67"
                              disabled={updateProfile.isPending}
                              className="h-12 bg-muted/50 border-0 focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.phone && (
                              <p className="text-sm text-destructive">{errors.phone.message}</p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-12 flex items-center px-4 rounded-lg bg-muted/30">
                              <span className={userData.phone ? "font-medium" : "text-muted-foreground"}>
                                {userData.phone || "Не указан"}
                              </span>
                            </div>
                            {userData.phone && (
                              userData.isPhoneVerified ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 h-8">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Подтверждён
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-300 text-amber-600 h-8">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                  Не подтверждён
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {isEditing && (
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                          <Button
                            type="submit"
                            disabled={updateProfile.isPending || !isDirty}
                            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateProfile.isPending ? "Сохранение..." : "Сохранить изменения"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={updateProfile.isPending}
                            className="h-12"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Отмена
                          </Button>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      Быстрые действия
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-14 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 group"
                      onClick={() => setActiveTab("orders")}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Мои заказы</p>
                        <p className="text-xs text-muted-foreground">{orders.length} заказов</p>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-14 hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:border-pink-300 group"
                      onClick={() => setActiveTab("favorites")}
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Избранное</p>
                        <p className="text-xs text-muted-foreground">{favorites.length} товаров</p>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-14 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 group"
                      onClick={() => setActiveTab("security")}
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Безопасность</p>
                        <p className="text-xs text-muted-foreground">Пароль и защита</p>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </Button>

                    <Separator className="my-4" />

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocation("/")}
                    >
                      <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                      На главную
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Account Info */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    Информация об аккаунте
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Дата регистрации</p>
                          <p className="font-semibold">{format(new Date(userData.createdAt), "d MMM yyyy", { locale: ru })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Статус аккаунта</p>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">Активен</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
                      <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Роль</p>
                          <p className="font-semibold capitalize">{userData.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                      <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Членство</p>
                          <p className="font-semibold">{formatDistanceToNow(new Date(userData.createdAt), { locale: ru })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-0">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        История заказов
                      </CardTitle>
                      <CardDescription>Все ваши заказы в одном месте</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrderSort(orderSort === "newest" ? "oldest" : "newest")}
                      className="h-9"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {orderSort === "newest" ? "Сначала новые" : "Сначала старые"}
                    </Button>
                  </div>
                  
                  {orders.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-4">
                      {[
                        { value: "all", label: "Все", count: orders.length },
                        { value: "pending", label: "Ожидают", count: orders.filter((o: any) => o.paymentStatus === "pending").length },
                        { value: "paid", label: "Оплачены", count: orders.filter((o: any) => o.paymentStatus === "paid").length },
                        { value: "processing", label: "В обработке", count: orders.filter((o: any) => o.paymentStatus === "processing").length },
                        { value: "shipped", label: "Отправлены", count: orders.filter((o: any) => o.paymentStatus === "shipped").length },
                        { value: "delivered", label: "Доставлены", count: orders.filter((o: any) => o.paymentStatus === "delivered").length },
                        { value: "cancelled", label: "Отменены", count: orders.filter((o: any) => o.paymentStatus === "cancelled").length },
                      ].map((filter) => (
                        <Button
                          key={filter.value}
                          variant={orderFilter === filter.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter(filter.value)}
                          className={`h-8 ${orderFilter === filter.value ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : ''}`}
                        >
                          {filter.label}
                          {filter.count > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 text-xs bg-white/20">
                              {filter.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                        <Package className="w-10 h-10 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Заказов пока нет</h3>
                      <p className="text-muted-foreground mb-6">Ваши заказы появятся здесь после оформления</p>
                      <Button onClick={() => setLocation("/")} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                        Перейти к покупкам
                      </Button>
                    </div>
                  ) : sortedOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Нет заказов с выбранным фильтром</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedOrders.map((order: any) => {
                        const statusConfig = getOrderStatusConfig(order.paymentStatus);
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                          <Card key={order.id} className="border hover:shadow-lg transition-all duration-300 overflow-hidden">
                            <div className={`h-1 ${statusConfig.bgColor}`} />
                            <CardContent className="p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center`}>
                                    <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                                  </div>
                                  <div>
                                    <p className="font-semibold">Заказ #{order.id.slice(0, 8)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Товар</p>
                                  <p className="font-medium text-sm">{order.productName || "Товар"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Цена</p>
                                  <p className="font-medium text-sm">{order.productPrice} ₽</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Количество</p>
                                  <p className="font-medium text-sm">{order.quantity} шт.</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Итого</p>
                                  <p className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {parseFloat(order.finalAmount).toLocaleString('ru-RU')} ₽
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="mt-0">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-white" />
                    </div>
                    Избранное
                  </CardTitle>
                  <CardDescription>Сохранённые товары для быстрого доступа</CardDescription>
                </CardHeader>
                <CardContent>
                  {favorites.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center justify-center">
                        <Heart className="w-10 h-10 text-pink-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Список пуст</h3>
                      <p className="text-muted-foreground mb-6">Добавляйте товары в избранное, чтобы не потерять их</p>
                      <Button onClick={() => setLocation("/")} className="bg-gradient-to-r from-pink-600 to-rose-600">
                        Смотреть товары
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {favorites.map((favorite: any) => (
                        <Card key={favorite.productId} className="border hover:shadow-lg transition-all duration-300 group">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-1 truncate">{favorite.product?.name || "Товар"}</h3>
                                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                  {favorite.product?.price} ₽
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Package className="w-4 h-4" />
                                  <span>В наличии: {favorite.product?.stock || 0} шт.</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Добавлено {format(new Date(favorite.createdAt), "d MMMM yyyy", { locale: ru })}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleBuy(favorite.product)}
                                  disabled={!favorite.product || favorite.product.stock === 0}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                                >
                                  <ShoppingCart className="w-4 h-4 mr-1" />
                                  Купить
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => removeFavorite.mutate(favorite.productId)}
                                  disabled={removeFavorite.isPending}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Удалить
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

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="mt-0">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                          <Bell className="w-4 h-4 text-white" />
                        </div>
                        Уведомления
                      </CardTitle>
                      <CardDescription>Центр уведомлений</CardDescription>
                    </div>
                    {notifications.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => clearNotifications.mutate()}
                        disabled={clearNotifications.isPending}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Очистить все
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                        <Bell className="w-10 h-10 text-amber-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Нет уведомлений</h3>
                      <p className="text-muted-foreground">Здесь будут появляться важные сообщения</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification: any) => (
                        <Card
                          key={notification.id}
                          className={`border cursor-pointer transition-all duration-300 hover:shadow-md ${
                            !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : ''
                          }`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markNotificationRead.mutate(notification.id);
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{notification.title}</h4>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {format(new Date(notification.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {!notification.isRead && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationRead.mutate(notification.id);
                                    }}
                                    className="h-8 w-8"
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
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
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

            {/* Security Tab */}
            <TabsContent value="security" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                      Пароль
                    </CardTitle>
                    <CardDescription>Управление паролем аккаунта</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-xl bg-muted/30 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">Пароль установлен</p>
                          <p className="text-sm text-muted-foreground">Последнее изменение: неизвестно</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowPasswordDialog(true)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Изменить пароль
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      Верификация
                    </CardTitle>
                    <CardDescription>Статус подтверждения данных</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`p-4 rounded-xl ${userData.isEmailVerified ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className={`w-5 h-5 ${userData.isEmailVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                          <div>
                            <p className="font-medium">Email</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{userData.email}</p>
                          </div>
                        </div>
                        {userData.isEmailVerified ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Подтверждён
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 text-amber-600">
                            Не подтверждён
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl ${userData.phone && userData.isPhoneVerified ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Телефон</p>
                            <p className="text-sm text-muted-foreground">{userData.phone || "Не указан"}</p>
                          </div>
                        </div>
                        {userData.phone ? (
                          userData.isPhoneVerified ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Подтверждён
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 text-amber-600">
                              Не подтверждён
                            </Badge>
                          )
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            Добавить
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      Активность аккаунта
                    </CardTitle>
                    <CardDescription>Информация о вашей учётной записи</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">ID аккаунта</p>
                        <p className="font-mono text-sm">{userData.id.slice(0, 12)}...</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Дата создания</p>
                        <p className="font-medium">{format(new Date(userData.createdAt), "d MMMM yyyy", { locale: ru })}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Роль в системе</p>
                        <p className="font-medium capitalize">{userData.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-white" />
                      </div>
                      Настройки уведомлений
                    </CardTitle>
                    <CardDescription>Управление email-уведомлениями</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Статус заказов</p>
                          <p className="text-sm text-muted-foreground">Уведомления об изменениях статуса</p>
                        </div>
                      </div>
                      <Switch checked={notifyOrders} onCheckedChange={setNotifyOrders} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-pink-500" />
                        <div>
                          <p className="font-medium">Акции и скидки</p>
                          <p className="text-sm text-muted-foreground">Информация о специальных предложениях</p>
                        </div>
                      </div>
                      <Switch checked={notifyPromotions} onCheckedChange={setNotifyPromotions} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        <div>
                          <p className="font-medium">Новости компании</p>
                          <p className="text-sm text-muted-foreground">Обновления и важные события</p>
                        </div>
                      </div>
                      <Switch checked={notifyNews} onCheckedChange={setNotifyNews} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                        <Download className="w-4 h-4 text-white" />
                      </div>
                      Данные аккаунта
                    </CardTitle>
                    <CardDescription>Экспорт и управление данными</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start h-14">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Скачать данные</p>
                        <p className="text-xs text-muted-foreground">Экспорт всех ваших данных</p>
                      </div>
                    </Button>

                    <Button variant="outline" className="w-full justify-start h-14">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3">
                        <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">История заказов</p>
                        <p className="text-xs text-muted-foreground">Скачать в формате CSV</p>
                      </div>
                    </Button>

                    <Separator />

                    <Button variant="outline" className="w-full justify-start h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Удалить аккаунт</p>
                        <p className="text-xs text-muted-foreground">Это действие необратимо</p>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Buy Dialog */}
      <Dialog open={buyDialog} onOpenChange={setBuyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Оформление покупки
            </DialogTitle>
            <DialogDescription>{selectedProduct?.name}</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Цена</p>
                    <p className="font-semibold text-lg">{selectedProduct.price} ₽</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">В наличии</p>
                    <p className="font-semibold text-lg">{selectedProduct.stock} шт.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Количество</Label>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={selectedProduct?.stock || 99}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(selectedProduct?.stock || 99, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="text-center w-20 h-10"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(Math.min(selectedProduct?.stock || 99, quantity + 1))}
                    disabled={!selectedProduct || quantity >= (selectedProduct?.stock || 99)}
                    className="h-10 w-10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">Итого к оплате</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
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
                  className="rounded"
                />
                <Label htmlFor="addToFav" className="cursor-pointer flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Добавить в избранное
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBuyDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleBuyConfirm} 
              disabled={createOrder.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {createOrder.isPending ? "Оформление..." : "Оформить заказ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              Изменить пароль
            </DialogTitle>
            <DialogDescription>
              Введите текущий пароль и задайте новый
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Текущий пароль</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  placeholder="Введите текущий пароль"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  placeholder="Минимум 8 символов"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Пароль должен содержать минимум 8 символов
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Подтвердите пароль</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="Повторите новый пароль"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForm({ current: "", new: "", confirm: "" });
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={changePassword.isPending || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
              className="bg-gradient-to-r from-emerald-600 to-teal-600"
            >
              {changePassword.isPending ? "Изменение..." : "Изменить пароль"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
