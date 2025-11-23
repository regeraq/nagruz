import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "Общие вопросы",
    question: "Что такое нагрузочное устройство?",
    answer:
      "Нагрузочное устройство — это оборудование для имитации электрической нагрузки при тестировании генераторов, ИБП и других источников питания. Оно позволяет создавать контролируемую нагрузку для проверки работоспособности оборудования.",
  },
  {
    category: "Общие вопросы",
    question: "Для чего используется нагрузочное устройство?",
    answer:
      "Устройство используется для тестирования дизель-генераторов, газопоршневых установок, ИБП, аккумуляторных батарей и проверки качества вырабатываемой электроэнергии. Оно обеспечивает точную имитацию реальной нагрузки.",
  },
  {
    category: "Технические характеристики",
    question: "Какая максимальная мощность устройств?",
    answer:
      "Мы предлагаем два варианта: НУ-100 (до 100 кВт) и НУ-30 (до 30 кВт). Оба устройства поддерживают работу с переменным (AC) и постоянным (DC) током.",
  },
  {
    category: "Технические характеристики",
    question: "Можно ли объединить несколько устройств?",
    answer:
      "Да, несколько устройств можно подключить параллельно для увеличения суммарной мощности. Это позволяет масштабировать систему под конкретные требования.",
  },
  {
    category: "Технические характеристики",
    question: "Какие условия эксплуатации?",
    answer:
      "Устройства работают на улице и в помещении при температуре от −40°C до +40°C, при влажности до 80% при 25°С. Охлаждение — воздушное принудительное.",
  },
  {
    category: "Покупка и доставка",
    question: "Как оформить заказ?",
    answer:
      "Вы можете оформить заказ через форму на сайте, выбрав нужную модель и количество. Также можно связаться с нами по телефону или email для получения коммерческого предложения.",
  },
  {
    category: "Покупка и доставка",
    question: "Какие способы оплаты доступны?",
    answer:
      "Мы принимаем оплату банковскими картами, через СБП (QR-код), а также криптовалютой (Bitcoin, Ethereum, USDT, Litecoin). Возможна оплата по договору для юридических лиц.",
  },
  {
    category: "Покупка и доставка",
    question: "Какова стоимость доставки?",
    answer:
      "Стоимость доставки рассчитывается индивидуально в зависимости от региона и способа доставки. Мы работаем с надёжными транспортными компаниями по всей России.",
  },
  {
    category: "Гарантия и обслуживание",
    question: "Какая гарантия на оборудование?",
    answer:
      "На все оборудование предоставляется гарантия производителя. Срок гарантии и условия обслуживания уточняются при оформлении заказа.",
  },
  {
    category: "Гарантия и обслуживание",
    question: "Предоставляется ли техническая поддержка?",
    answer:
      "Да, мы предоставляем техническую поддержку на всех этапах: от консультации при выборе оборудования до помощи в эксплуатации. Наши специалисты всегда готовы ответить на ваши вопросы.",
  },
  {
    category: "Гарантия и обслуживание",
    question: "Какая документация входит в комплект?",
    answer:
      "В комплект входит паспорт изделия, руководство по эксплуатации, методика поверки, аттестат и протокол аттестации, свидетельство об утверждении типа СИ, свидетельство о первичной поверке.",
  },
  {
    category: "Соответствие и сертификация",
    question: "Соответствует ли оборудование ГОСТам?",
    answer:
      "Да, все оборудование соответствует требованиям ГОСТ РФ, имеет необходимые сертификаты и внесено в фонд измерительных приборов (ФИФ).",
  },
];

/**
 * FAQ page - Frequently asked questions
 */
export default function FAQ() {
  const categories = Array.from(new Set(faqData.map((item) => item.category)));

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        <Breadcrumbs items={[{ label: "Помощь" }]} className="mb-8" />

        <div className="text-center mb-16 animate-fade-up">
          <Badge variant="secondary" className="mb-4">
            Помощь
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <HelpCircle className="h-10 w-10 text-primary" />
            Часто задаваемые вопросы
          </h1>
          <p className="text-lg text-muted-foreground">
            Найдите ответы на популярные вопросы о нашем оборудовании
          </p>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryItems = faqData.filter((item) => item.category === category);
            return (
              <Card key={category} className="scroll-animate">
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {categoryItems.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`item-${category}-${index}`}
                        className="border-b"
                      >
                        <AccordionTrigger className="text-left font-medium">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-12 scroll-animate bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Не нашли ответ на свой вопрос?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Свяжитесь с нами, и мы с радостью поможем вам
              </p>
              <a
                href="#contact"
                className="text-primary hover:underline font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Связаться с нами →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

