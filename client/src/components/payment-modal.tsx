import { useState, useEffect } from "react";
import { 
  X, Plus, Minus, CreditCard, QrCode, Clock, CheckCircle2, AlertCircle, Loader2, 
  Package, Info, User, Heart, ShoppingBag, ArrowRight, ArrowLeft, Sparkles,
  Mail, Phone, MapPin, Shield, Gift, Star, Truck, Check, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import { SiVisa, SiMastercard } from "react-icons/si";

// Custom MIR logo component (since react-icons doesn't have SiMir)
const MirLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 16" className={className} fill="currentColor">
    <path d="M8.5 2L5.3 14H2.7L0 2h2.4l1.8 9.2L6.1 2h2.4l2 9.2L12.2 2H8.5zM17.8 2v12h-2.3V2h2.3zM26.5 2c2.3 0 3.8 1.5 3.8 3.8v4.4c0 2.3-1.5 3.8-3.8 3.8h-4.8V2h4.8zm1.5 3.8c0-1-.7-1.7-1.7-1.7h-2.3v7.8h2.3c1 0 1.7-.7 1.7-1.7V5.8z"/>
  </svg>
);


interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

type PaymentMethod = "card" | "sbp";
type PaymentStatus = "idle" | "processing" | "success" | "error";
type Step = "product" | "contact" | "payment" | "confirm";

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "product", label: "Товар", icon: Package },
  { key: "contact", label: "Контакты", icon: User },
  { key: "payment", label: "Оплата", icon: CreditCard },
  { key: "confirm", label: "Подтверждение", icon: CheckCircle2 },
];

export function PaymentModal({ isOpen, onClose, product }: PaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("product");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentPublicOffer, setConsentPublicOffer] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatedPromoCode, setValidatedPromoCode] = useState<{ code: string; discountPercent: number } | null>(null);
  const [addToFavorites, setAddToFavorites] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch user's favorites
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
    enabled: !!userData?.success,
  });

  // Fetch user's recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["/api/orders/user"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      const res = await fetch("/api/orders/user", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.slice(0, 3); // Last 3 orders
    },
    enabled: !!userData?.success,
  });

  const isLoggedIn = userData?.success && userData?.user;
  const user = userData?.user;

  // Check if product is in favorites
  useEffect(() => {
    if (product && favorites.length > 0) {
      const inFav = favorites.some((f: any) => f.productId === product.id);
      setIsInFavorites(inFav);
    }
  }, [product, favorites]);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, timeLeft]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setDiscount(0);
      setPaymentStatus("idle");
      setTimeLeft(15 * 60);
      setPromoCodeInput("");
      setValidatedPromoCode(null);
      setCurrentStep("product");
      setAddToFavorites(false);
      
      if (isLoggedIn && user) {
        setCustomerName(`${user.firstName || ""} ${user.lastName || ""}`.trim());
        setCustomerEmail(user.email || "");
        setCustomerPhone(user.phone || "");
      } else {
        setCustomerName("");
        setCustomerEmail("");
        setCustomerPhone("");
      }
      setConsentPersonalData(false);
      setConsentDataProcessing(false);
      setConsentPublicOffer(false);
    }
  }, [isOpen, isLoggedIn, user]);

  // Add to favorites mutation
  const addFavoriteMutation = useMutation({
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
      setIsInFavorites(true);
      toast({
        title: "Добавлено в избранное",
        description: "Товар сохранён в вашем профиле",
      });
    },
  });

  // Validate promo code mutation
  const validatePromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Промокод недействителен");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.promoCode) {
        setValidatedPromoCode({
          code: data.promoCode.code,
          discountPercent: data.promoCode.discountPercent,
        });
        setDiscount(data.promoCode.discountPercent);
        toast({
          title: "Промокод применён!",
          description: `Скидка ${data.promoCode.discountPercent}%`,
        });
      }
    },
    onError: (error: any) => {
      setValidatedPromoCode(null);
      setDiscount(0);
      toast({
        title: "Промокод недействителен",
        description: error.message || "Проверьте правильность ввода",
        variant: "destructive",
      });
    },
  });

  // Debounce promo code validation
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setValidatedPromoCode(null);
      setDiscount(0);
      return;
    }

    const timeoutId = setTimeout(() => {
      const normalizedCode = promoCodeInput.trim().toUpperCase();
      if (normalizedCode.length > 0) {
        validatePromoCodeMutation.mutate(normalizedCode);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [promoCodeInput]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      setPaymentStatus("success");
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/user'] });
      
      // Add to favorites if checked
      if (addToFavorites && product && !isInFavorites && isLoggedIn) {
        addFavoriteMutation.mutate(product.id);
      }
      
      toast({
        title: "Заказ оформлен!",
        description: "Мы свяжемся с вами для подтверждения",
      });
    },
    onError: (error: any) => {
      setPaymentStatus("error");
      let errorMessage = error.message || "Попробуйте позже";
      
      if (errorMessage.includes(": {")) {
        try {
          const jsonPart = errorMessage.substring(errorMessage.indexOf("{"));
          const parsed = JSON.parse(jsonPart);
          errorMessage = parsed.message || errorMessage;
        } catch (e) {}
      }
      
      toast({
        title: "Ошибка оформления",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (!product || !isOpen) return null;

  const price = parseFloat(product.price);
  const totalAmount = price * quantity;
  const discountAmount = validatedPromoCode ? (totalAmount * validatedPromoCode.discountPercent) / 100 : 0;
  const finalAmount = totalAmount - discountAmount;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleQuantityChange = (delta: number) => {
    const maxStock = product?.stock || 99;
    setQuantity((prev) => Math.min(maxStock, Math.max(1, prev + delta)));
  };

  const getStepIndex = (step: Step) => STEPS.findIndex(s => s.key === step);
  const currentStepIndex = getStepIndex(currentStep);
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceedToNext = () => {
    switch (currentStep) {
      case "product":
        return quantity > 0 && quantity <= (product?.stock || 99);
      case "contact":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return customerName.trim().length >= 2 && 
               emailRegex.test(customerEmail.trim()) && 
               customerPhone.trim().length >= 10;
      case "payment":
        return consentPersonalData && consentDataProcessing && consentPublicOffer;
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  const handlePayment = () => {
    if (paymentStatus === "processing") return;

    setPaymentStatus("processing");

    const orderData = {
      productId: product.id,
      quantity,
      totalAmount: totalAmount.toString(),
      discountAmount: discountAmount.toString(),
      finalAmount: finalAmount.toString(),
      promoCode: validatedPromoCode?.code || null,
      paymentMethod,
      paymentStatus: "pending",
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim() || null,
      paymentDetails: JSON.stringify({ method: paymentMethod }),
    };

    createOrderMutation.mutate(orderData);
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-scale">
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/70 via-slate-900/60 to-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-700 dark:via-indigo-700 dark:to-violet-700 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Оформление заказа
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-white/70" />
                    <span className={`text-sm font-medium ${timeLeft < 60 ? "text-red-200" : "text-white/80"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  {isLoggedIn && (
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Авторизован
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Step Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                const isSuccess = paymentStatus === "success" && step.key === "confirm";
                
                return (
                  <div key={step.key} className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                      ${isSuccess ? "bg-emerald-500 scale-110" : ""}
                      ${isActive && !isSuccess ? "bg-white text-blue-600 scale-110 shadow-lg" : ""}
                      ${isCompleted ? "bg-white/30 text-white" : ""}
                      ${!isActive && !isCompleted && !isSuccess ? "bg-white/10 text-white/50" : ""}
                    `}>
                      {isCompleted || isSuccess ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`hidden sm:block w-12 h-0.5 mx-2 transition-all duration-300 ${
                        isCompleted ? "bg-white/60" : "bg-white/20"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <Progress value={progressPercent} className="h-1 bg-white/20 [&>div]:bg-white" />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] p-4 sm:p-6">
          {/* Step 1: Product */}
          {currentStep === "product" && (
            <div className="space-y-6 animate-fade-in">
              {/* User Quick Card (if logged in) */}
              {isLoggedIn && (
                <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                        <AvatarImage src={user?.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate">
                          {user?.firstName || user?.email?.split('@')[0]}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Heart className="w-3 h-3 mr-1" />
                            {favorites.length} в избранном
                          </Badge>
                          {recentOrders.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {recentOrders.length} заказов
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">Данные заполнены</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Product Card */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-slate-100 to-blue-100/50 dark:from-slate-800 dark:to-blue-900/30 p-1">
                  <Badge variant="secondary" className="text-xs">
                    <Package className="w-3 h-3 mr-1" />
                    Артикул: {product.sku}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <Package className="w-10 h-10 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className={`${product.stock > 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Price */}
                  <div className="mt-6 p-4 rounded-xl bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Количество</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(-1)}
                            disabled={quantity <= 1}
                            className="h-10 w-10 rounded-full"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                              const maxStock = product?.stock || 99;
                              setQuantity(Math.min(maxStock, Math.max(1, parseInt(e.target.value) || 1)));
                            }}
                            className="text-center w-16 h-10 font-bold text-lg"
                            min={1}
                            max={product?.stock || 99}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(1)}
                            disabled={quantity >= (product?.stock || 99)}
                            className="h-10 w-10 rounded-full"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Цена за единицу</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {formatPrice(price)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="mt-4">
                    <Label className="text-sm flex items-center gap-2">
                      <Gift className="w-4 h-4 text-pink-500" />
                      Промокод
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="Введите промокод"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          className="pr-10"
                        />
                        {validatePromoCodeMutation.isPending && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {validatedPromoCode && (
                        <Badge className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600">
                          <Check className="w-4 h-4 mr-1" />
                          -{validatedPromoCode.discountPercent}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Add to Favorites */}
                  {isLoggedIn && !isInFavorites && (
                    <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30">
                      <Checkbox
                        id="addToFav"
                        checked={addToFavorites}
                        onCheckedChange={(checked) => setAddToFavorites(checked === true)}
                      />
                      <Label htmlFor="addToFav" className="cursor-pointer flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-pink-500" />
                        Добавить в избранное после оформления
                      </Label>
                    </div>
                  )}
                  {isInFavorites && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-pink-600 dark:text-pink-400">
                      <Heart className="w-4 h-4 fill-current" />
                      Этот товар уже в вашем избранном
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-indigo-950/20">
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Сумма ({quantity} шт.)</span>
                      <span className="font-medium">{formatPrice(totalAmount)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                        <span>Скидка ({discount}%)</span>
                        <span className="font-medium">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Итого</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatPrice(finalAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === "contact" && (
            <div className="space-y-6 animate-fade-in">
              {isLoggedIn && (
                <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                    Данные заполнены автоматически из вашего профиля. Вы можете их изменить.
                  </AlertDescription>
                </Alert>
              )}

              <Card className="border-0 shadow-lg">
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Ваше имя *
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Иван Иванов"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email *
                    </Label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="example@mail.ru"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-500" />
                      Телефон *
                    </Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="79001234567"
                      maxLength={11}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      Адрес доставки
                    </Label>
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Город, улица, дом (опционально)"
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Оставьте пустым, если заберёте самовывозом
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Мы свяжемся с вами для подтверждения заказа и уточнения деталей доставки
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === "payment" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-5">
                  <Label className="text-base font-semibold mb-4 block">Способ оплаты</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                    <div className="space-y-3">
                      <div 
                        className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                          paymentMethod === "card" 
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
                            : "border-muted hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                        }`}
                        onClick={() => setPaymentMethod("card")}
                      >
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex-1 flex items-center gap-3 cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium">Банковская карта</span>
                            <p className="text-xs text-muted-foreground">Visa, Mastercard, МИР</p>
                          </div>
                          <div className="flex gap-1.5 items-center">
                            <SiVisa className="w-8 h-5 opacity-60" />
                            <SiMastercard className="w-8 h-5 opacity-60" />
                            <MirLogo className="w-8 h-5 opacity-60" />
                          </div>
                        </Label>
                      </div>

                      <div 
                        className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                          paymentMethod === "sbp" 
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
                            : "border-muted hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                        }`}
                        onClick={() => setPaymentMethod("sbp")}
                      >
                        <RadioGroupItem value="sbp" id="sbp" />
                        <Label htmlFor="sbp" className="flex-1 flex items-center gap-3 cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium">СБП (QR-код)</span>
                            <p className="text-xs text-muted-foreground">Система быстрых платежей</p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Consents */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-5 space-y-4">
                  <Label className="text-base font-semibold">Согласия</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id="consent-personal-data"
                        checked={consentPersonalData}
                        onCheckedChange={(checked) => setConsentPersonalData(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="consent-personal-data" className="text-sm leading-relaxed cursor-pointer">
                        Я даю согласие на обработку персональных данных <span className="text-destructive">*</span>
                      </Label>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id="consent-data-processing"
                        checked={consentDataProcessing}
                        onCheckedChange={(checked) => setConsentDataProcessing(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="consent-data-processing" className="text-sm leading-relaxed cursor-pointer">
                        Я принимаю условия{" "}
                        <a href="/data-processing-policy" target="_blank" className="text-blue-600 hover:underline">
                          Политики обработки данных
                        </a>{" "}
                        и{" "}
                        <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">
                          Политики конфиденциальности
                        </a>{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id="consent-public-offer"
                        checked={consentPublicOffer}
                        onCheckedChange={(checked) => setConsentPublicOffer(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="consent-public-offer" className="text-sm leading-relaxed cursor-pointer">
                        Я принимаю условия{" "}
                        <a href="/public-offer" target="_blank" className="text-blue-600 hover:underline">
                          Публичной оферты
                        </a>{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Info */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Ваши данные защищены. Платёжная информация передаётся по защищённому каналу.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === "confirm" && (
            <div className="space-y-6 animate-fade-in">
              {paymentStatus === "success" ? (
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg animate-bounce-slow">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Заказ успешно оформлен!</h3>
                  <p className="text-muted-foreground mb-6">
                    Мы свяжемся с вами в ближайшее время для подтверждения
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={onClose} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                      Закрыть
                    </Button>
                    {isLoggedIn && (
                      <Button variant="outline" onClick={() => window.location.href = '/profile'}>
                        Мои заказы
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : paymentStatus === "error" ? (
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-red-600">Ошибка оформления</h3>
                  <p className="text-muted-foreground mb-6">
                    Попробуйте ещё раз или свяжитесь с нами
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => setPaymentStatus("idle")}>
                      Попробовать снова
                    </Button>
                    <Button onClick={onClose}>
                      Закрыть
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Order Summary */}
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                      <h3 className="text-white font-semibold text-lg">Проверьте данные заказа</h3>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      {/* Product Info */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                          <Package className="w-7 h-7 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">Количество: {quantity} шт.</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {formatPrice(finalAmount)}
                          </p>
                          {discount > 0 && (
                            <p className="text-sm text-emerald-600">Скидка: {formatPrice(discountAmount)}</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Contact Info */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Контактные данные</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-blue-500" />
                            <span>{customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span className="truncate">{customerEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-blue-500" />
                            <span>{customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                            <span>{paymentMethod === "card" ? "Банковская карта" : "СБП"}</span>
                          </div>
                        </div>
                        {deliveryAddress && (
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <span>{deliveryAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery Info */}
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-amber-600" />
                          <div>
                            <p className="font-medium text-amber-700 dark:text-amber-300">Информация о доставке</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                              Детали доставки будут согласованы с менеджером
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {paymentStatus !== "success" && paymentStatus !== "error" && (
          <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {currentStepIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={goToPrevStep}
                  className="sm:flex-1 h-12"
                  disabled={paymentStatus === "processing"}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>
              )}
              
              {currentStepIndex === 0 && (
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="sm:flex-1 h-12"
                >
                  Отмена
                </Button>
              )}

              {currentStep === "confirm" ? (
                <Button
                  onClick={handlePayment}
                  disabled={paymentStatus === "processing" || timeLeft === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base font-semibold"
                >
                  {paymentStatus === "processing" ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Оформление...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Подтвердить заказ — {formatPrice(finalAmount)}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={goToNextStep}
                  disabled={!canProceedToNext()}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base font-semibold"
                >
                  Далее
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
