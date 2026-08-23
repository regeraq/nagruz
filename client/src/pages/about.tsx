import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Factory, Users, Award, Target, Shield, Zap } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

export default function About() {
  const { t, lines, stats } = useSiteContent();
  const valueIcons = [Shield, Zap, Users, Award];

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12">
        <Breadcrumbs items={[{ label: t("about_crumb") }]} className="mb-6 sm:mb-8" />

        <div className="text-center mb-10 sm:mb-12 md:mb-16 animate-fade-up">
          <Badge variant="secondary" className="mb-3 sm:mb-4">
            {t("about_badge")}
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2">
            {t("about_title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
            {t("about_intro")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 mb-10 sm:mb-12 md:mb-16">
          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                {t("about_mission_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {t("about_mission")}
              </p>
            </CardContent>
          </Card>

          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t("about_values_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                {lines("about_values").map((item, idx) => {
                  const Icon = valueIcons[idx % valueIcons.length];
                  return (
                    <li key={idx} className="flex items-start gap-2">
                      <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-10 sm:my-12 md:my-16" />

        <div className="mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">{t("about_history_title")}</h2>
          <div className="max-w-4xl mx-auto">
            <Card className="scroll-animate">
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {t("about_history_p1")}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("about_history_p2")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-12 md:mb-16">
          {stats("about_stats").map((stat, idx) => (
            <Card key={idx} className="text-center scroll-animate">
              <CardHeader>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <CardTitle className="text-base sm:text-lg">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {stat.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-10 sm:my-12 md:my-16" />

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">{t("about_clients_title")}</h2>
          <Card className="scroll-animate">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-semibold mb-3">{t("about_clients_industries_title")}</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    {lines("about_clients_industries").map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">{t("about_clients_geo_title")}</h3>
                  <p className="text-muted-foreground">
                    {t("about_clients_geo")}
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
