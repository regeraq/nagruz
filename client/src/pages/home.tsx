import { useState, useEffect, useRef } from "react";
import { useCounter } from "@/hooks/use-counter";
import { 
  Zap, Shield, Gauge, Thermometer, Cable, FileCheck, 
  Factory, Battery, Cpu, CheckCircle2, Download, ArrowRight,
  Phone, Mail, MapPin, Upload, X, Loader2, Send, ArrowUp, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSubmissionSchema, type InsertContactSubmission, type Product } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/navigation";
import { PowerGauge } from "@/components/power-gauge";
import { PaymentModal } from "@/components/payment-modal";
import { useRealtimeValidation, ValidationIcon, ValidationMessage, validationRules } from "@/components/form-validation";

const navLinks = [
  { label: "Главная", id: "hero" },
  { label: "Характеристики", id: "specifications" },
  { label: "Применение", id: "applications" },
  { label: "Документация", id: "documentation" },
  { label: "Контакты", id: "contact" },
];

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (element) {
    const offset = 80;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: "smooth",
    });
  }
}

const devices = {
  "nu-100": {
    name: "НУ-100",
    power: "100 кВт",
    steps: "20 ступеней",
    voltage: "AC/DC",
    minVoltage: "230-400 В / 110-220 В",
    maxPower: "100 кВт",
    frequency: "50 Гц",
    phases: "3",
    cosφ: "0.99",
    cooling: "Воздушное принудительное",
    description: "Профессиональное нагрузочное устройство для тестирования дизель-генераторов, газопоршневых и газотурбинных установок, ИБП и аккумуляторных батарей",
    powerRange: "50–100 кВт",
    acVoltage: "230–400 В",
    dcVoltage: "110–220 В"
  },
  "nu-30": {
    name: "НУ-30",
    power: "30 кВт",
    steps: "6 ступеней",
    voltage: "AC/DC",
    minVoltage: "230-400 В / 110-220 В",
    maxPower: "30 кВт",
    frequency: "50 Гц",
    phases: "3",
    cosφ: "0.99",
    cooling: "Воздушное принудительное",
    description: "Компактное нагрузочное устройство для тестирования генераторов, ИБП и источников питания мощностью до 30 кВт",
    powerRange: "15–30 кВт",
    acVoltage: "230–400 В",
    dcVoltage: "110–220 В"
  }
};

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<"nu-100" | "nu-30">("nu-100");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const device = devices[selectedDevice];
  const { toast } = useToast();

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    // FIXED: Proper cleanup of event listener
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const form = useForm<InsertContactSubmission>({
    resolver: zodResolver(insertContactSubmissionSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      company: "",
      message: "",
      fileName: null,
      fileData: null,
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: InsertContactSubmission) => {
      return await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Заявка отправлена!",
        description: response.message || "Мы свяжемся с вами в ближайшее время.",
        variant: "default",
      });
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка отправки",
        description: error.message || "Произошла ошибка. Попробуйте позже.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Файл слишком большой",
          description: "Максимальный размер файла 10 МБ",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("fileName", file.name);
        form.setValue("fileData", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    form.setValue("fileName", null);
    form.setValue("fileData", null);
  };

  const onSubmit = (data: InsertContactSubmission) => {
    contactMutation.mutate(data);
  };

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBuyClick = () => {
    const product = products?.find(p => p.id === selectedDevice);
    if (product) {
      setSelectedProduct(product);
      setPaymentModalOpen(true);
    }
  };

  // Scroll animation hook
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".scroll-animate, .scroll-animate-arrow").forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Counter animation
  useCounter();

  return (
    <div className="min-h-screen">
      <Navigation 
        selectedDevice={selectedDevice} 
        onDeviceChange={setSelectedDevice}
      />
      
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/40 hover:shadow-primary/60 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:-translate-y-1"
          data-testid="button-scroll-top-floating"
          aria-label="Вернуться в начало"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden page-load"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-30 animate-fade-up" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-32 md:py-40 text-center">
          <Badge 
            variant="secondary" 
            className="mb-6 text-sm font-medium px-4 py-2 animate-fade-scale"
            data-testid="badge-new-equipment"
          >
            Новое оборудование 2025 года
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 animate-fade-up" style={{ animationDelay: "0.1s" }} data-testid="heading-hero">
            {device.name}
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }} data-testid="text-hero-description">
            {device.description}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 bg-card px-3 sm:px-4 py-2 rounded-lg border border-card-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover-fade-up-animation" data-testid="kpi-power">
              <Gauge className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
              <span className="font-mono text-xs sm:text-sm font-semibold" data-testid="text-power" key={selectedDevice}>{parseInt(device.power)}</span>
              <span className="font-mono text-xs sm:text-sm font-semibold">кВт</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-3 sm:px-4 py-2 rounded-lg border border-card-border hover:border-tech-cyan/50 transition-all duration-300 cursor-pointer hover-fade-up-animation" data-testid="kpi-steps">
              <Zap className="h-4 sm:h-5 w-4 sm:w-5 text-tech-cyan" />
              <span className="font-mono text-xs sm:text-sm font-semibold" data-testid="text-steps">{device.steps}</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-3 sm:px-4 py-2 rounded-lg border border-card-border hover:border-chart-3/50 transition-all duration-300 cursor-pointer hover-fade-up-animation" data-testid="kpi-voltage">
              <Cable className="h-4 sm:h-5 w-4 sm:w-5 text-chart-3" />
              <span className="font-mono text-xs sm:text-sm font-semibold" data-testid="text-voltage">{device.voltage}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div className="arrow-button">
              <Button 
                size="lg" 
                onClick={scrollToContact}
                data-testid="button-hero-cta-primary"
                className="text-base px-8 h-12 magnetic-btn shadow-lg shadow-primary/40 hover:shadow-primary/70 hover:-translate-y-1 transition-all duration-300 font-semibold"
              >
                Получить спецификацию
                <ArrowRight className="ml-2 h-5 w-5 animated-arrow" />
              </Button>
            </div>
            <div className="arrow-button">
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById("specifications")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-cta-secondary"
                className="text-base px-8 h-12 magnetic-btn shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 font-semibold border-primary/50 hover:border-primary/80"
              >
                Технические характеристики
                <ArrowRight className="ml-2 h-5 w-5 animated-arrow" />
              </Button>
            </div>
          </div>

          <div className="mt-12 flex justify-center animate-fade-up" style={{ animationDelay: "0.5s" }}>
            <Button 
              size="lg" 
              onClick={handleBuyClick}
              data-testid="button-hero-buy"
              className="text-base px-12 h-12 magnetic-btn shadow-lg shadow-green-600/40 hover:shadow-green-600/70 hover:-translate-y-1 transition-all duration-300 font-semibold group bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <ShoppingCart className="mr-2 h-5 w-5 transition-all duration-300 group-hover:rotate-12" />
              Купить
            </Button>
          </div>
          
          <div className="mt-16 text-xs text-muted-foreground uppercase tracking-wider animate-float">
            Прокрутите вниз
          </div>
        </div>
      </section>

      <section id="purpose" className="py-24 md:py-32 scroll-animate">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4" data-testid="badge-purpose-section">
                Назначение
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6" data-testid="heading-purpose">
                Точная имитация нагрузки
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed" data-testid="text-purpose-1">
                Устройство предназначено для точной имитации реальной нагрузки, полностью контролируемой 
                и стабильной, в отличие от непредсказуемой реальной нагрузки.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="text-purpose-2">
                Оборудование позволяет тестировать качество вырабатываемой электроэнергии и оценивать 
                работоспособность источников питания под различными нагрузками.
              </p>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4" data-testid="heading-parameters">
                  Тестируемые параметры:
                </h3>
                {[
                  { icon: Gauge, label: "Мощность" },
                  { icon: Zap, label: "Ток и напряжение" },
                  { icon: Cable, label: "Гармоники и форма сигнала" },
                  { icon: Cpu, label: "Коэффициент мощности" },
                ].map((param, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 text-foreground scroll-animate"
                    data-testid={`param-${idx}`}
                  >
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:scale-110 hover:bg-primary/20 hover:shadow-lg hover:shadow-primary/30 cursor-pointer group">
                      <param.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-12" />
                    </div>
                    <span className="font-medium">{param.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-full flex justify-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <PowerGauge maxPower={parseInt(device.maxPower.split(" ")[0])} />
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="py-24 md:py-32 bg-muted/30 scroll-animate">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 animate-fade-up">
            <Badge variant="secondary" className="mb-4" data-testid="badge-benefits-section">
              Преимущества
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-benefits">
              Ключевые преимущества устройства
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-benefits-desc">
              Профессиональное решение для комплексного тестирования электрооборудования
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Gauge,
                title: "20 ступеней нагрузки",
                description: "Точная регулировка от 5 до 100 кВт с шагом 5 кВт, формируемых комбинациями 7 кнопок",
              },
              {
                icon: Cable,
                title: "AC/DC совместимость",
                description: "Работа с переменным током (230-400 В, 50 Гц) и постоянным током (110-220 В)",
              },
              {
                icon: Zap,
                title: "Объединение устройств",
                description: "Возможность подключения нескольких устройств для увеличения суммарной мощности",
              },
              {
                icon: Cpu,
                title: "Высокий cos φ ≥ 0.99",
                description: "Оптимальный коэффициент мощности для точного моделирования реальной нагрузки",
              },
              {
                icon: Shield,
                title: "Система защиты",
                description: "Защита от перегрева, отсутствия охлаждения, перегрузки и короткого замыкания",
              },
              {
                icon: Thermometer,
                title: "Климатическое исполнение",
                description: "Работа на улице и в помещении при температуре от −40°C до +40°C",
              },
            ].map((benefit, idx) => (
              <Card 
                key={idx} 
                className="hover-elevate transition-all duration-300 card-hover stagger-item hover:shadow-lg hover:shadow-primary/10 border-border/50 hover:border-primary/30"
                data-testid={`card-benefit-${idx}`}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Button 
              size="lg" 
              onClick={handleBuyClick}
              data-testid="button-benefits-buy"
              className="text-base px-10 h-12 magnetic-btn shadow-lg shadow-green-600/40 hover:shadow-green-600/70 hover:-translate-y-1 transition-all duration-300 font-semibold group bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <ShoppingCart className="mr-2 h-5 w-5 transition-all duration-300 group-hover:rotate-12" />
              Купить
            </Button>
          </div>
        </div>
      </section>

      <section id="specifications" className="py-24 md:py-32 scroll-animate">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 animate-fade-up">
            <Badge variant="secondary" className="mb-4" data-testid="badge-specs-section">
              Характеристики
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-specifications">
              Технические характеристики
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-specifications-desc">
              Полная спецификация нагрузочного устройства {device.name}
            </p>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="tabs-specifications">
              <TabsTrigger value="general" data-testid="tab-general">Общие</TabsTrigger>
              <TabsTrigger value="ac" data-testid="tab-ac">Блок AC</TabsTrigger>
              <TabsTrigger value="dc" data-testid="tab-dc">Блок DC</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Общие параметры</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Суммарная мощность", value: device.powerRange + " ±10%" },
                    { label: "Режим работы", value: "Непрерывный" },
                    { label: "Частота (AC)", value: "50 Гц ±1%" },
                    { label: "Фазность", value: "3 фазы" },
                    { label: "Условия эксплуатации", value: "Улица/помещение, +1...+40 °C" },
                    { label: "Влажность", value: "До 80% при 25 °С" },
                    { label: "Охлаждение", value: "Воздушное принудительное" },
                    { label: "Защита", value: "Перегрев, отсутствие охлаждения, перегрузка, КЗ" },
                  ].map((spec, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border last:border-0"
                      data-testid={`spec-general-${idx}`}
                    >
                      <span className="text-sm font-medium text-muted-foreground mb-1 sm:mb-0">{spec.label}</span>
                      <span className="font-mono text-sm font-semibold">{spec.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Габариты и масса (каждый блок)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Размеры", value: "1400 × 1100 × 1400 мм" },
                    { label: "Масса", value: "До 350 кг" },
                    { label: "Питание", value: "220 В ±10%" },
                  ].map((spec, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border last:border-0"
                      data-testid={`spec-dimensions-${idx}`}
                    >
                      <span className="text-sm font-medium text-muted-foreground mb-1 sm:mb-0">{spec.label}</span>
                      <span className="font-mono text-sm font-semibold">{spec.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ac" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Блок переменного тока (AC)</CardTitle>
                  <CardDescription>Параметры работы с трёхфазным переменным током</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Напряжение", value: device.acVoltage },
                    { label: "Частота", value: "50 Гц ±1%" },
                    { label: "Коэффициент мощности", value: "cos φ ≥ 0.99" },
                  ].map((spec, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border last:border-0"
                      data-testid={`spec-ac-${idx}`}
                    >
                      <span className="text-sm font-medium text-muted-foreground mb-1 sm:mb-0">{spec.label}</span>
                      <span className="font-mono text-sm font-semibold">{spec.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Индикация параметров AC</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {[
                      "Линейное и фазное напряжение",
                      "Токи по фазам (A, B, C)",
                      "Активная, реактивная и полная мощность по фазам",
                      "Углы между фазами",
                      "Коэффициент мощности cos φ",
                      "Гармоники 2–63 порядка",
                      "Счётчики активной и реактивной мощности",
                    ].map((item, idx) => (
                      <li 
                        key={idx} 
                        className="flex items-start gap-2"
                        data-testid={`indicator-ac-${idx}`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Блок постоянного тока (DC)</CardTitle>
                  <CardDescription>Параметры работы с постоянным током</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Напряжение", value: "110–220 В" },
                    { label: "Режим работы", value: "Непрерывный" },
                  ].map((spec, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border last:border-0"
                      data-testid={`spec-dc-${idx}`}
                    >
                      <span className="text-sm font-medium text-muted-foreground mb-1 sm:mb-0">{spec.label}</span>
                      <span className="font-mono text-sm font-semibold">{spec.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Индикация параметров DC</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {[
                      "Напряжение постоянного тока",
                      "Сила тока",
                      "Мощность",
                      "Счётчики потреблённой энергии",
                    ].map((item, idx) => (
                      <li 
                        key={idx} 
                        className="flex items-start gap-2"
                        data-testid={`indicator-dc-${idx}`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-center mt-12 animate-fade-up">
            <Button 
              size="lg" 
              onClick={handleBuyClick}
              data-testid="button-specifications-buy"
              className="text-base px-10 h-12 shadow-lg shadow-green-600/40 hover:shadow-green-600/70 transition-all duration-300 font-semibold group bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <ShoppingCart className="mr-2 h-5 w-5 transition-all duration-300 group-hover:rotate-12" />
              Заказать {device.name}
            </Button>
          </div>
        </div>
      </section>

      <section id="delivery" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-4" data-testid="badge-delivery-section">
              Комплектация
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-delivery">
              Комплект поставки
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-delivery-desc">
              Полная комплектация оборудования и документации
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 scroll-animate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  Оборудование
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "2 блока переменного тока (AC)",
                    "2 блока постоянного тока (DC)",
                    "Кабель 4×50 мм²",
                    "Кабель 2×185 мм²",
                    "Кабель 3×1.5 мм²",
                    "Комплекты колёс для транспортировки",
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      data-testid={`delivery-equipment-${idx}`}
                    >
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Документация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Паспорт изделия",
                    "Руководство по эксплуатации",
                    "Методика поверки (копия)",
                    "Аттестат и протокол аттестации",
                    "Свидетельство об утверждении типа СИ",
                    "Свидетельство о первичной поверке",
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      data-testid={`delivery-docs-${idx}`}
                    >
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="documentation" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-4" data-testid="badge-docs-section">
              Соответствие
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-documentation">
              Документы и сертификация
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-documentation-desc">
              Полное соответствие стандартам и требованиям безопасности
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 scroll-animate">
            {[
              { title: "ГОСТ РФ", desc: "Соответствие ГОСТам" },
              { title: "Безопасность", desc: "Требования РФ" },
              { title: "ФИФ", desc: "Внесено в фонд" },
              { title: "Поверка", desc: "Первичная поверка" },
            ].map((cert, idx) => (
              <Card 
                key={idx} 
                className="text-center hover-elevate"
                data-testid={`cert-${idx}`}
              >
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{cert.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{cert.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Новое оборудование 2025 года выпуска</h3>
                  <p className="text-sm text-muted-foreground">
                    Соответствие всем современным стандартам качества и безопасности
                  </p>
                </div>
                <Button variant="outline" data-testid="button-download-docs">
                  <Download className="mr-2 h-4 w-4" />
                  Скачать документы
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="applications" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-4" data-testid="badge-apps-section">
              Применение
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-applications">
              Сферы применения
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-applications-desc">
              Профессиональное тестирование широкого спектра энергетического оборудования
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 scroll-animate">
            {[
              {
                icon: Factory,
                title: "Дизель-генераторы",
                description: "Испытания и проверка работоспособности дизель-генераторных установок",
              },
              {
                icon: Cpu,
                title: "Газопоршневые установки",
                description: "Тестирование ГПУ под различными режимами нагрузки",
              },
              {
                icon: Gauge,
                title: "Газотурбинные установки",
                description: "Проверка параметров ГТУ в реальных условиях эксплуатации",
              },
              {
                icon: Shield,
                title: "Источники ИБП",
                description: "Испытания систем бесперебойного питания",
              },
              {
                icon: Battery,
                title: "Аккумуляторные батареи",
                description: "Проверка ёмкости и работоспособности батарей",
              },
              {
                icon: Zap,
                title: "Качество электроэнергии",
                description: "Тестирование параметров электроэнергии различных источников",
              },
            ].map((app, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center text-center p-6 rounded-xl hover-elevate bg-card border border-card-border transition-all duration-300"
                data-testid={`app-${idx}`}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <app.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{app.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {app.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-24 md:py-32 scroll-animate">
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center animate-fade-up">
          <Badge variant="secondary" className="mb-4" data-testid="badge-about-section">
            О компании
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6" data-testid="heading-about">
            Надёжный партнёр в энергетике
          </h2>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed" data-testid="text-about-desc">
            Мы специализируемся на поставке профессионального испытательного оборудования 
            для крупных промышленных заказчиков, включая предприятия атомной энергетики, 
            нефтегазовой отрасли и критической инфраструктуры.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { value: "15+", label: "Лет опыта" },
              { value: "500+", label: "Проектов" },
              { value: "50+", label: "Отраслей" },
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className="p-6"
                data-testid={`stat-${idx}`}
              >
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 md:py-32 bg-muted/30 scroll-animate">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 animate-fade-up">
            <Badge variant="secondary" className="mb-4" data-testid="badge-contact-section">
              Контакты
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-contact">
              Получить коммерческое предложение
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-contact-desc">
              Заполните форму, и мы свяжемся с вами в ближайшее время
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="pt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => {
                          const validation = useRealtimeValidation(
                            field.value || "",
                            [
                              ...validationRules.required("Имя"),
                              ...validationRules.minLength(2, "Имя"),
                            ],
                            !!field.value
                          );
                          return (
                            <FormItem>
                              <FormLabel>Имя и фамилия *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    placeholder="Иван Иванов" 
                                    {...field} 
                                    data-testid="input-name"
                                    aria-invalid={!validation.isValid && !!field.value}
                                    aria-describedby={!validation.isValid && field.value ? "name-error" : undefined}
                                  />
                                  {field.value && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <ValidationIcon isValid={validation.isValid} show={!!field.value} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <ValidationMessage
                                isValid={validation.isValid}
                                message={validation.message}
                                show={!!field.value}
                              />
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => {
                            const validation = useRealtimeValidation(
                              field.value || "",
                              validationRules.phone(),
                              !!field.value
                            );
                            return (
                              <FormItem>
                                <FormLabel>Телефон *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="+7 (999) 123-45-67" 
                                      {...field} 
                                      data-testid="input-phone"
                                      aria-invalid={!validation.isValid && !!field.value}
                                      aria-describedby={!validation.isValid && field.value ? "phone-error" : undefined}
                                    />
                                    {field.value && (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <ValidationIcon isValid={validation.isValid} show={!!field.value} />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <ValidationMessage
                                  isValid={validation.isValid}
                                  message={validation.message}
                                  show={!!field.value}
                                />
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => {
                            const validation = useRealtimeValidation(
                              field.value || "",
                              validationRules.email(),
                              !!field.value
                            );
                            return (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="email"
                                      placeholder="ivanov@company.ru" 
                                      {...field} 
                                      data-testid="input-email"
                                      aria-invalid={!validation.isValid && !!field.value}
                                      aria-describedby={!validation.isValid && field.value ? "email-error" : undefined}
                                    />
                                    {field.value && (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <ValidationIcon isValid={validation.isValid} show={!!field.value} />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <ValidationMessage
                                  isValid={validation.isValid}
                                  message={validation.message}
                                  show={!!field.value}
                                />
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Компания *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="ООО 'Название компании'" 
                                {...field} 
                                data-testid="input-company"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => {
                          const validation = useRealtimeValidation(
                            field.value || "",
                            [
                              ...validationRules.required("Сообщение"),
                              ...validationRules.minLength(10, "Сообщение"),
                            ],
                            !!field.value
                          );
                          return (
                            <FormItem>
                              <FormLabel>Сообщение *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Textarea 
                                    placeholder="Опишите ваши требования и вопросы..."
                                    className="min-h-32 resize-none"
                                    {...field} 
                                    data-testid="input-message"
                                    aria-invalid={!validation.isValid && !!field.value}
                                    aria-describedby={!validation.isValid && field.value ? "message-error" : undefined}
                                  />
                                  {field.value && (
                                    <div className="absolute right-3 top-3">
                                      <ValidationIcon isValid={validation.isValid} show={!!field.value} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <ValidationMessage
                                isValid={validation.isValid}
                                message={validation.message}
                                show={!!field.value}
                              />
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <div>
                        <Label>Прикрепить файл (опционально)</Label>
                        {!selectedFile ? (
                          <label
                            htmlFor="file-upload"
                            className="mt-2 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover-elevate transition-all"
                            data-testid="file-drop-zone"
                          >
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">
                              Нажмите для выбора файла
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Максимум 10 МБ
                            </span>
                            <input
                              id="file-upload"
                              type="file"
                              className="hidden"
                              onChange={handleFileSelect}
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              data-testid="input-file-upload"
                            />
                          </label>
                        ) : (
                          <div className="mt-2 flex items-center justify-between p-4 bg-muted rounded-lg" data-testid="file-selected">
                            <div className="flex items-center gap-3">
                              <FileCheck className="h-5 w-5 text-primary" />
                              <span className="text-sm font-medium" data-testid="text-file-name">{selectedFile.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={removeFile}
                              data-testid="button-remove-file"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base"
                        data-testid="button-submit-contact"
                        disabled={contactMutation.isPending}
                      >
                        {contactMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Отправка...
                          </>
                        ) : (
                          "Получить коммерческое предложение"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Контактная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3" data-testid="contact-phone">
                    <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Телефон</div>
                      <div className="text-sm text-muted-foreground" data-testid="text-phone">+7 (495) 123-45-67</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3" data-testid="contact-email">
                    <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-sm text-muted-foreground" data-testid="text-email">info@nm-100.ru</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3" data-testid="contact-telegram">
                    <Send className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Telegram</div>
                      <a 
                        href="https://t.me/nu_equipment" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                        data-testid="link-telegram"
                      >
                        @nu_equipment
                      </a>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3" data-testid="contact-address">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Адрес</div>
                      <div className="text-sm text-muted-foreground" data-testid="text-address">
                        Москва, ул. Промышленная, д. 1
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20" data-testid="card-response-time">
                <CardContent className="pt-6">
                  <div className="text-sm text-center">
                    <div className="font-semibold mb-2" data-testid="text-response-time-title">Время ответа</div>
                    <div className="text-muted-foreground" data-testid="text-response-time-desc">
                      Мы отвечаем на заявки в течение 24 часов в рабочие дни
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl font-mono">НУ</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">{device.name}</div>
                  <div className="text-xs text-muted-foreground">Нагрузочное устройство</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Профессиональное оборудование для тестирования электрогенераторов и ИБП
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Навигация</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {navLinks.map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollToSection(link.id)}
                      className="hover:text-foreground transition-colors"
                      data-testid={`footer-link-${link.id}`}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Контакты</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>+7 (495) 123-45-67</li>
                <li>info@nm-100.ru</li>
                <li>Москва, Промышленная, 1</li>
              </ul>
            </div>
          </div>

          <Separator className="mb-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>© 2025 {device.name}. Все права защищены.</div>
            <div className="flex gap-6">
              <button className="hover:text-foreground transition-colors">
                Политика конфиденциальности
              </button>
              <button className="hover:text-foreground transition-colors">
                Условия использования
              </button>
            </div>
          </div>
        </div>
      </footer>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
}
