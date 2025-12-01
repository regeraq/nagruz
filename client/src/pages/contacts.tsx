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
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <Breadcrumbs items={[{ label: "Контакты" }]} className="mb-8" />

        <div className="text-center mb-16 animate-fade-up">
          <Badge variant="secondary" className="mb-4">
            Контакты
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Свяжитесь с нами
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Мы всегда готовы ответить на ваши вопросы и помочь с выбором оборудования
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
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

        <Separator className="my-16" />

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle>Режим работы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Понедельник - Пятница</p>
                    <p className="text-sm text-muted-foreground">9:00 - 18:00 МСК</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Суббота - Воскресенье</p>
                    <p className="text-sm text-muted-foreground">Выходной</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle>Дополнительные контакты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Telegram</p>
                    <a
                      href="https://t.me/nu_equipment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      @nu_equipment
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Для заказов</p>
                    <a
                      href="mailto:orders@nm-100.ru"
                      className="text-sm text-primary hover:underline"
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
          <CardHeader>
            <CardTitle>Форма обратной связи</CardTitle>
          </CardHeader>
          <CardContent>
            {submitSuccess && (
              <Alert className="mb-4">
                <AlertDescription>
                  ✓ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4" id="contact">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ваше имя"
                    required
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="your@email.com"
                    required
                    data-testid="input-contact-email"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+7 (XXX) XXX-XX-XX"
                    required
                    data-testid="input-contact-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Компания</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="Название компании"
                    data-testid="input-contact-company"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Сообщение *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Опишите вашу задачу или вопрос..."
                  required
                  rows={5}
                  data-testid="textarea-contact-message"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="button-submit-contact"
                className="w-full"
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
