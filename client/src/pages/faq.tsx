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
import { useSiteContent } from "@/hooks/useSiteContent";
import { Link } from "wouter";

export default function FAQ() {
  const { t, faq } = useSiteContent();
  const faqData = faq("faq_items");
  const categories = Array.from(new Set(faqData.map((item) => item.category)));

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12">
        <Breadcrumbs items={[{ label: t("faq_crumb") }]} className="mb-6 sm:mb-8" />

        <div className="text-center mb-10 sm:mb-12 md:mb-16 animate-fade-up">
          <Badge variant="secondary" className="mb-3 sm:mb-4">
            {t("faq_badge")}
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 px-2">
            <HelpCircle className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 text-primary flex-shrink-0" />
            <span>{t("faq_title")}</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground px-2">
            {t("faq_subtitle")}
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
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

        <Card className="mt-8 sm:mt-10 md:mt-12 scroll-animate bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">{t("faq_cta_title")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("faq_cta_text")}
              </p>
              <Link href="/contacts#contact" className="text-primary hover:underline font-medium">
                {t("faq_cta_button")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
