import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Send, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (userData?.success && userData?.user) {
      const user = userData.user;
      setFormData(prev => ({
        ...prev,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consentPersonalData || !consentDataProcessing) {
      toast({
        title: "Ошибка",
        description: "Необходимо дать согласие на обработку персональных данных",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const response = await apiRequest("POST", "/api/contact", formData);
      
      if (response.success) {
        toast({
          title: "Спасибо!",
          description: "Ваша заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.",
          variant: "default",
        });
        setFormData({
          name: userData?.user ? `${userData.user.firstName || ""} ${userData.user.lastName || ""}`.trim() : "",
          email: userData?.user?.email || "",
          phone: userData?.user?.phone || "",
          company: "",
          message: "",
        });
        setConsentPersonalData(false);
        setConsentDataProcessing(false);
        setSubmitSuccess(true);
        queryClient.invalidateQueries({ queryKey: ['/api/contact'] });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить заявку. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12">
        <Breadcrumbs items={[{ label: "Контакты" }]} className="mb-6 sm:mb-8" />

        <div className="text-center mb-10 sm:mb-12 md:mb-16 animate-fade-up">
          <Badge variant="secondary" className="mb-3 sm:mb-4">
            Контакты
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2">
            Свяжитесь с нами
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
            Мы всегда готовы ответить на ваши вопросы и помочь с выбором оборудования
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-10 sm:mb-12 md:mb-16">
          <Card className="scroll-animate">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Телефон</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-2">+7 (495) 123-45-67</p>
              <p className="text-sm text-muted-foreground">
                Пн-Пт: 9:00 - 18:00 МСК
              </p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <a href="tel:+74951234567">Позвонить</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="scroll-animate">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Email</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-2">info@nm-100.ru</p>
              <p className="text-sm text-muted-foreground">
                Ответим в течение 24 часов
              </p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <a href="mailto:info@nm-100.ru">Написать</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="scroll-animate">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Адрес</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-2">Москва</p>
              <p className="text-sm text-muted-foreground">
                ул. Промышленная, д. 1
              </p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <a
                  href="https://yandex.ru/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть карту
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-10 sm:my-12 md:my-16" />

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 md:gap-12 mb-10 sm:mb-12 md:mb-16">
          <Card className="scroll-animate">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Режим работы</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Понедельник - Пятница</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">9:00 - 18:00 МСК</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Суббота - Воскресенье</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Выходной</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-animate">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Дополнительные контакты</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Telegram</p>
                    <a
                      href="https://t.me/nu_equipment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-primary hover:underline"
                    >
                      @nu_equipment
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Для заказов</p>
                    <a
                      href="mailto:orders@nm-100.ru"
                      className="text-xs sm:text-sm text-primary hover:underline"
                    >
                      orders@nm-100.ru
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="scroll-animate bg-primary/5 border-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Форма обратной связи</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {submitSuccess && (
              <Alert className="mb-4">
                <AlertDescription className="text-xs sm:text-sm">
                  ✓ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" id="contact">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs sm:text-sm">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ваше имя"
                    required
                    data-testid="input-contact-name"
                    className="h-11 sm:h-12 text-sm mt-1.5 sm:mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="your@email.com"
                    required
                    data-testid="input-contact-email"
                    className="h-11 sm:h-12 text-sm mt-1.5 sm:mt-2"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="phone" className="text-xs sm:text-sm">Телефон *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    required
                    data-testid="input-contact-phone"
                    className="h-11 sm:h-12 text-sm mt-1.5 sm:mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-xs sm:text-sm">Компания</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="Название компании"
                    data-testid="input-contact-company"
                    className="h-11 sm:h-12 text-sm mt-1.5 sm:mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message" className="text-xs sm:text-sm">Сообщение *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Опишите вашу задачу или вопрос..."
                  required
                  rows={5}
                  data-testid="textarea-contact-message"
                  className="text-sm mt-1.5 sm:mt-2 min-h-[120px] sm:min-h-[140px]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consent-personal-data-contacts"
                    checked={consentPersonalData}
                    onCheckedChange={(checked) => setConsentPersonalData(checked === true)}
                    className="mt-1"
                    required
                  />
                  <Label htmlFor="consent-personal-data-contacts" className="text-xs sm:text-sm leading-relaxed cursor-pointer">
                    Я даю согласие на обработку персональных данных *
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consent-data-processing-contacts"
                    checked={consentDataProcessing}
                    onCheckedChange={(checked) => setConsentDataProcessing(checked === true)}
                    className="mt-1"
                    required
                  />
                  <Label htmlFor="consent-data-processing-contacts" className="text-xs sm:text-sm leading-relaxed cursor-pointer">
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
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !consentPersonalData || !consentDataProcessing}
                data-testid="button-submit-contact"
                className="w-full h-11 sm:h-12 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Отправить заявку
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
