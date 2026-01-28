import { useState, useEffect } from "react";
import { X, Plus, Minus, CreditCard, QrCode, Clock, CheckCircle2, AlertCircle, Loader2, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import { SiVisa, SiMastercard } from "react-icons/si";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

type PaymentMethod = "card" | "sbp";
type PaymentStatus = "idle" | "processing" | "success" | "error";

export function PaymentModal({ isOpen, onClose, product }: PaymentModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentPublicOffer, setConsentPublicOffer] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatedPromoCode, setValidatedPromoCode] = useState<{ code: string; discountPercent: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

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
      
      if (userData?.success && userData?.user) {
        const user = userData.user;
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
  }, [isOpen, userData]);

  // Validate promo code mutation
  const validatePromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          title: "Промокод применен!",
          description: `Скидка ${data.promoCode.discountPercent}%`,
          variant: "default",
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
      toast({
        title: "Заказ оформлен!",
        description: "Мы свяжемся с вами для подтверждения",
        variant: "default",
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
        } catch (e) {
          // Keep original if parsing fails
        }
      }
      
      if (errorMessage.startsWith("401")) {
        toast({
          title: "Авторизация требуется",
          description: "Пожалуйста, авторизуйтесь для оформления заказа",
          variant: "default",
        });
      } else {
        toast({
          title: "Ошибка оформления",
          description: errorMessage,
          variant: "destructive",
        });
      }
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

  const handleProposal = () => {
    onClose();
    setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handlePayment = () => {
    if (paymentStatus === "processing") return;

    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim();
    const trimmedPhone = customerPhone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все контактные данные",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите корректный email адрес",
        variant: "destructive",
      });
      return;
    }

    if (!consentPersonalData || !consentDataProcessing || !consentPublicOffer) {
      toast({
        title: "Ошибка",
        description: "Необходимо дать согласие на обработку персональных данных и принять условия публичной оферты",
        variant: "destructive",
      });
      return;
    }

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
      customerName: trimmedName,
      customerEmail: trimmedEmail,
      customerPhone: trimmedPhone,
      paymentDetails: JSON.stringify({
        method: paymentMethod,
      }),
    };

    createOrderMutation.mutate(orderData);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-5 h-5" />;
      case "sbp":
        return <QrCode className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-scale">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="modal-overlay"
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-card-border rounded-xl shadow-2xl animate-fade-scale mx-2 sm:mx-4">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-card-border p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-order-title">
                Оформление заказа
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground" data-testid="text-timer">
                  Резерв:{" "}
                  <span className={timeLeft < 60 ? "text-destructive font-semibold" : ""}>
                    {formatTime(timeLeft)}
                  </span>
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg border" data-testid="card-product-info">
                <Package className="w-12 h-12 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg" data-testid="text-product-name">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-product-sku">
                    Артикул: {product.sku}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2" data-testid="text-product-description">
                    {product.description}
                  </p>
                  <div className="mt-3">
                    <Badge variant="secondary">
                      На складе: {product.stock} шт.
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Количество</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    data-testid="button-decrease-quantity"
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
                    className="text-center w-20"
                    min={1}
                    max={product?.stock || 99}
                    data-testid="input-quantity"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product?.stock || 99)}
                    data-testid="button-increase-quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Промокод</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Введите промокод"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="flex-1"
                    data-testid="input-promo-code"
                  />
                  {validatedPromoCode && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {validatedPromoCode.discountPercent}%
                    </Badge>
                  )}
                  {validatePromoCodeMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {validatedPromoCode && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Промокод "{validatedPromoCode.code}" применен. Скидка {validatedPromoCode.discountPercent}%
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Ваши контактные данные</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ваше имя"
                  data-testid="input-customer-name"
                />
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Ваш email"
                  data-testid="input-customer-email"
                />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="+7 (___) ___-__-__"
                  maxLength={11}
                  data-testid="input-customer-phone"
                />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Мы свяжемся с вами для подтверждения заказа и уточнения деталей доставки
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Способ оплаты</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer" data-testid="payment-method-card">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex-1 flex items-center gap-3 cursor-pointer">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <span className="font-medium">Банковская карта</span>
                        <div className="ml-auto flex gap-1">
                          <SiVisa className="w-8 h-5 opacity-60" />
                          <SiMastercard className="w-8 h-5 opacity-60" />
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer" data-testid="payment-method-sbp">
                      <RadioGroupItem value="sbp" id="sbp" />
                      <Label htmlFor="sbp" className="flex-1 flex items-center gap-3 cursor-pointer">
                        <QrCode className="w-5 h-5 text-primary" />
                        <span className="font-medium">СБП (QR-код)</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <div className="flex justify-between text-sm" data-testid="price-subtotal">
                  <span className="text-muted-foreground">Сумма:</span>
                  <span className="font-mono font-medium">{formatPrice(totalAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600" data-testid="price-discount">
                    <span>Скидка ({discount}%):</span>
                    <span className="font-mono font-medium">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold" data-testid="price-total">
                  <span>Итого:</span>
                  <span className="font-mono text-primary">{formatPrice(finalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent-personal-data-payment"
                checked={consentPersonalData}
                onCheckedChange={(checked) => setConsentPersonalData(checked === true)}
                className="mt-1"
                required
              />
              <Label htmlFor="consent-personal-data-payment" className="text-sm leading-relaxed cursor-pointer">
                Я даю согласие на обработку персональных данных *
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent-data-processing-payment"
                checked={consentDataProcessing}
                onCheckedChange={(checked) => setConsentDataProcessing(checked === true)}
                className="mt-1"
                required
              />
              <Label htmlFor="consent-data-processing-payment" className="text-sm leading-relaxed cursor-pointer">
                Я принимаю условия{" "}
                <a href="/data-processing-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Политики обработки персональных данных
                </a>{" "}
                и{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Политики конфиденциальности
                </a> *
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent-public-offer-payment"
                checked={consentPublicOffer}
                onCheckedChange={(checked) => setConsentPublicOffer(checked === true)}
                className="mt-1"
                required
              />
              <Label htmlFor="consent-public-offer-payment" className="text-sm leading-relaxed cursor-pointer">
                Я принимаю условия{" "}
                <a href="/public-offer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Публичной оферты
                </a> *
              </Label>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
              data-testid="button-back-to-shopping"
            >
              Вернуться к покупкам
            </Button>
            <Button
              variant="outline"
              onClick={handleProposal}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
              data-testid="button-request-proposal"
            >
              Коммерческое предложение
            </Button>
            <Button
              onClick={handlePayment}
              disabled={paymentStatus === "processing" || paymentStatus === "success" || timeLeft === 0 || !consentPersonalData || !consentDataProcessing || !consentPublicOffer}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base bg-primary hover:bg-primary/90"
              data-testid="button-confirm-payment"
            >
              {paymentStatus === "processing" && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Обработка...
                </>
              )}
              {paymentStatus === "success" && (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Заказ оформлен
                </>
              )}
              {paymentStatus === "error" && (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Ошибка
                </>
              )}
              {paymentStatus === "idle" && "Оформить заказ"}
            </Button>
          </div>

          {paymentStatus === "success" && (
            <Alert className="border-green-500/20 bg-green-500/10" data-testid="status-success">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-600">Заказ успешно оформлен!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Мы свяжемся с вами в ближайшее время для подтверждения и уточнения деталей
                </p>
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === "error" && (
            <Alert variant="destructive" data-testid="status-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold">Ошибка оформления заказа</p>
                <p className="text-sm mt-1">
                  Попробуйте еще раз или свяжитесь с нами через форму обратной связи
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
