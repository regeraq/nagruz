import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Contacts page - Contact information and form
 */
export default function Contacts() {
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
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">
                Нужна консультация или коммерческое предложение?
              </h3>
              <p className="text-muted-foreground mb-6">
                Заполните форму обратной связи, и мы свяжемся с вами в ближайшее время
              </p>
              <Button
                size="lg"
                onClick={() => {
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Перейти к форме обратной связи
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

