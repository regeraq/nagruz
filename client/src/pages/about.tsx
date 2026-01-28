import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Factory, Users, Award, Target, Shield, Zap } from "lucide-react";

/**
 * About page - Company information and history
 */
export default function About() {
  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <Breadcrumbs items={[{ label: "О нас" }]} className="mb-8" />

        <div className="text-center mb-16 animate-fade-up">
          <Badge variant="secondary" className="mb-4">
            О компании
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Надёжный партнёр в энергетике
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Мы специализируемся на поставке профессионального испытательного оборудования
            для крупных промышленных заказчиков
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                Наша миссия
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Обеспечить промышленные предприятия надёжным и точным оборудованием
                для тестирования энергетических систем, способствуя повышению
                надёжности и безопасности критической инфраструктуры.
              </p>
            </CardContent>
          </Card>

          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Наши ценности
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Надёжность и безопасность превыше всего</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Инновации в каждом решении</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Партнёрство с клиентами</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Высокое качество продукции</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-16" />

        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Наша история</h2>
          <div className="max-w-4xl mx-auto">
            <Card className="scroll-animate">
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Компания была основана более 15 лет назад с целью обеспечения
                    промышленных предприятий качественным испытательным оборудованием.
                    За годы работы мы зарекомендовали себя как надёжный поставщик
                    для предприятий атомной энергетики, нефтегазовой отрасли и
                    критической инфраструктуры.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Наша команда состоит из опытных инженеров и специалистов,
                    которые понимают специфику работы с энергетическим оборудованием.
                    Мы не просто продаём оборудование — мы предоставляем комплексные
                    решения и поддержку на всех этапах внедрения.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center scroll-animate">
            <CardHeader>
              <div className="text-5xl font-bold text-primary mb-2">15+</div>
              <CardTitle>Лет опыта</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Более 15 лет работы на рынке испытательного оборудования
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center scroll-animate">
            <CardHeader>
              <div className="text-5xl font-bold text-primary mb-2">500+</div>
              <CardTitle>Проектов</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Успешно реализованных проектов по всей России
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center scroll-animate">
            <CardHeader>
              <div className="text-5xl font-bold text-primary mb-2">50+</div>
              <CardTitle>Отраслей</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Работаем с предприятиями различных отраслей промышленности
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-16" />

        <div>
          <h2 className="text-3xl font-bold mb-8 text-center">Наши клиенты</h2>
          <Card className="scroll-animate">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Ключевые отрасли:</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Атомная энергетика</li>
                    <li>• Нефтегазовая отрасль</li>
                    <li>• Критическая инфраструктура</li>
                    <li>• Промышленные предприятия</li>
                    <li>• Энергоснабжающие компании</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">География:</h3>
                  <p className="text-muted-foreground">
                    Мы работаем с клиентами по всей территории Российской Федерации,
                    обеспечивая поставку оборудования и техническую поддержку
                    независимо от региона.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

