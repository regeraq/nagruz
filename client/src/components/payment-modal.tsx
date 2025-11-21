import { useState, useEffect } from "react";
import { X, Plus, Minus, CreditCard, Smartphone, Coins, QrCode, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import { SiVisa, SiMastercard, SiBitcoin, SiEthereum, SiLitecoin } from "react-icons/si";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

type PaymentMethod = 
  | "card" 
  | "yoomoney" 
  | "sbp" 
  | "qiwi" 
  | "mobile" 
  | "bitcoin" 
  | "ethereum" 
  | "usdt" 
  | "litecoin";

type PaymentStatus = "idle" | "processing" | "success" | "error";

export function PaymentModal({ isOpen, onClose, product }: PaymentModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [cardNumber, setCardNumber] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

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
      setPromoCode("");
      setDiscount(0);
      setPaymentStatus("idle");
      setTimeLeft(15 * 60);
      setCardNumber("");
      setCryptoAddress("");
      setPhoneNumber("");
    }
  }, [isOpen]);

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/promo/validate", { code });
    },
    onSuccess: (response: any) => {
      setDiscount(response.discountPercent);
      toast({
        title: "Промокод применен!",
        description: `Скидка ${response.discountPercent}% активирована`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      setDiscount(0);
      toast({
        title: "Ошибка промокода",
        description: error.message || "Промокод недействителен или истек",
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      setPaymentStatus("success");
      toast({
        title: "Заказ оформлен!",
        description: "Мы свяжемся с вами для подтверждения",
        variant: "default",
      });
    },
    onError: (error: any) => {
      setPaymentStatus("error");
      toast({
        title: "Ошибка оформления",
        description: error.message || "Попробуйте позже",
        variant: "destructive",
      });
    },
  });

  if (!product || !isOpen) return null;

  const price = parseFloat(product.price);
  const totalAmount = price * quantity;
  const discountAmount = (totalAmount * discount) / 100;
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
    setQuantity((prev) => Math.min(99, Math.max(1, prev + delta)));
  };

  const handleApplyPromo = () => {
    if (promoCode.trim()) {
      validatePromoMutation.mutate(promoCode.trim());
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
      promoCode: discount > 0 ? promoCode : null,
      paymentMethod,
      paymentStatus: "pending",
      paymentDetails: JSON.stringify({
        method: paymentMethod,
        cardNumber: cardNumber ? `****${cardNumber.slice(-4)}` : undefined,
        cryptoAddress: cryptoAddress || undefined,
        phoneNumber: phoneNumber || undefined,
      }),
    };

    setTimeout(() => {
      createOrderMutation.mutate(orderData);
    }, 1500);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "card": return <CreditCard className="w-5 h-5" />;
      case "mobile": return <Smartphone className="w-5 h-5" />;
      case "bitcoin": return <SiBitcoin className="w-5 h-5" />;
      case "ethereum": return <SiEthereum className="w-5 h-5" />;
      case "usdt": return <Coins className="w-5 h-5" />;
      case "litecoin": return <SiLitecoin className="w-5 h-5" />;
      default: return <QrCode className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-scale">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="modal-overlay"
      />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-card-border rounded-xl shadow-2xl animate-fade-scale">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-card-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold" data-testid="text-order-title">
                Оформление заказа
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground" data-testid="text-timer">
                  Резерв: <span className={timeLeft < 60 ? "text-destructive font-semibold" : ""}>{formatTime(timeLeft)}</span>
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

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg" data-testid="card-product-info">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg" data-testid="text-product-name">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-product-sku">
                    Артикул: {product.sku}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2" data-testid="text-product-description">
                    {product.description}
                  </p>
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
                    onChange={(e) => setQuantity(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="text-center w-20"
                    min={1}
                    max={99}
                    data-testid="input-quantity"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 99}
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
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Введите промокод"
                    data-testid="input-promo-code"
                  />
                  <Button
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim() || validatePromoMutation.isPending}
                    data-testid="button-apply-promo"
                  >
                    {validatePromoMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Применить"
                    )}
                  </Button>
                </div>
                {discount > 0 && (
                  <Badge variant="secondary" data-testid="badge-discount-active">
                    Скидка {discount}% активирована
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between" data-testid="price-subtotal">
                  <span className="text-muted-foreground">Сумма:</span>
                  <span className="font-mono">{formatPrice(totalAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600" data-testid="price-discount">
                    <span>Скидка ({discount}%):</span>
                    <span className="font-mono">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold" data-testid="price-total">
                  <span>Итого:</span>
                  <span className="font-mono">{formatPrice(finalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Способ оплаты</Label>
              
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-card">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 flex items-center gap-2 cursor-pointer">
                      {getPaymentMethodIcon("card")}
                      <span>Банковская карта</span>
                      <div className="ml-auto flex gap-1">
                        <SiVisa className="w-8 h-5 opacity-60" />
                        <SiMastercard className="w-8 h-5 opacity-60" />
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-yoomoney">
                    <RadioGroupItem value="yoomoney" id="yoomoney" />
                    <Label htmlFor="yoomoney" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <Coins className="w-5 h-5" />
                      <span>ЮMoney</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-sbp">
                    <RadioGroupItem value="sbp" id="sbp" />
                    <Label htmlFor="sbp" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <QrCode className="w-5 h-5" />
                      <span>СБП (QR-код)</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-qiwi">
                    <RadioGroupItem value="qiwi" id="qiwi" />
                    <Label htmlFor="qiwi" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <Smartphone className="w-5 h-5" />
                      <span>QIWI Кошелек</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-mobile">
                    <RadioGroupItem value="mobile" id="mobile" />
                    <Label htmlFor="mobile" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <Smartphone className="w-5 h-5" />
                      <span>Мобильный платеж</span>
                    </Label>
                  </div>

                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground px-3">Криптовалюта</p>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-bitcoin">
                    <RadioGroupItem value="bitcoin" id="bitcoin" />
                    <Label htmlFor="bitcoin" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <SiBitcoin className="w-5 h-5 text-orange-500" />
                      <span>Bitcoin (BTC)</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-ethereum">
                    <RadioGroupItem value="ethereum" id="ethereum" />
                    <Label htmlFor="ethereum" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <SiEthereum className="w-5 h-5 text-blue-500" />
                      <span>Ethereum (ETH)</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-usdt">
                    <RadioGroupItem value="usdt" id="usdt" />
                    <Label htmlFor="usdt" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <Coins className="w-5 h-5 text-green-500" />
                      <span>USDT (TRC-20 / ERC-20)</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate" data-testid="payment-method-litecoin">
                    <RadioGroupItem value="litecoin" id="litecoin" />
                    <Label htmlFor="litecoin" className="flex-1 flex items-center gap-2 cursor-pointer">
                      <SiLitecoin className="w-5 h-5 text-gray-500" />
                      <span>Litecoin (LTC)</span>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {paymentMethod === "card" && (
                <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg">
                  <Label>Номер карты</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={16}
                    data-testid="input-card-number"
                  />
                  <p className="text-xs text-muted-foreground">
                    Комиссия: 2%
                  </p>
                </div>
              )}

              {["bitcoin", "ethereum", "usdt", "litecoin"].includes(paymentMethod) && (
                <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg">
                  <Label>Адрес кошелька</Label>
                  <Input
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder="Введите адрес вашего кошелька"
                    data-testid="input-crypto-address"
                  />
                  <p className="text-xs text-muted-foreground">
                    Комиссия сети: ~0.5%
                  </p>
                </div>
              )}

              {["qiwi", "mobile"].includes(paymentMethod) && (
                <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg">
                  <Label>Номер телефона</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="+7 (___) ___-__-__"
                    maxLength={11}
                    data-testid="input-phone-number"
                  />
                  <p className="text-xs text-muted-foreground">
                    Комиссия: 1.5%
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-back-to-shopping"
            >
              Вернуться к покупкам
            </Button>
            <Button
              onClick={handlePayment}
              disabled={paymentStatus === "processing" || paymentStatus === "success" || timeLeft === 0}
              className="flex-1"
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
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center" data-testid="status-success">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-600">Заказ успешно оформлен!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Мы свяжемся с вами в ближайшее время для подтверждения
              </p>
            </div>
          )}

          {paymentStatus === "error" && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center" data-testid="status-error">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-destructive" />
              <p className="font-semibold text-destructive">Ошибка оформления заказа</p>
              <p className="text-sm text-muted-foreground mt-1">
                Попробуйте еще раз или свяжитесь с нами
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
