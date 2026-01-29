import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Factory, Cpu, Gauge, Zap, Building2, Wrench, Shield, FileCheck, Package, Truck, ArrowRight } from "lucide-react";
import { devices } from "@/lib/devices";
import { insertContactSubmissionSchema, type InsertContactSubmission, type Product } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentModal } from "@/components/payment-modal";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<string>("nu-100");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const device = devices.find((d) => d.id === selectedDevice) || devices[0];

  // Update page title and meta tags when device changes
  useEffect(() => {
    const pageTitle = `${device.name} - ${device.description}`;
    document.title = pageTitle;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", device.description);
    }
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", pageTitle);
    }
  }, [selectedDevice]);

  // Products API is public - reliable query with proper error handling
  const { data: products = [], isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      try {
        const res = await fetch("/api/products", { 
          credentials: "include",
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!res.ok) {
          // Don't throw for 404 or empty responses - return empty array
          if (res.status === 404) {
            return [];
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Ensure we always return an array
        if (!Array.isArray(data)) {
          // Handle wrapped responses
          if (data && typeof data === 'object') {
            if (Array.isArray(data.products)) return data.products;
            if (Array.isArray(data.data)) return data.data;
          }
          return [];
        }
        
        // Validate and filter products
        return data.filter((p: any) => {
          return p && typeof p === 'object' && p.id && p.name;
        });
      } catch (error) {
        // Log error but don't crash - return empty array
        console.error('Error fetching products:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - balance between freshness and performance
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnMount: true, // Always refetch on mount for fresh data
    refetchOnWindowFocus: false, // Don't refetch on focus (too aggressive)
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff, max 10s
  });
  
  // Auto-refetch if products are empty after load (with debounce)
  useEffect(() => {
    if (!isLoadingProducts && products.length === 0 && !productsError) {
      const timer = setTimeout(() => {
        refetchProducts();
      }, 2000); // Wait 2 seconds before retry
      return () => clearTimeout(timer);
    }
  }, [isLoadingProducts, products.length, productsError, refetchProducts]);

  // Get current product - with validation
  const currentProduct = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return null;
    }
    
    const product = products.find((p: Product) => p && p.id === selectedDevice);
    
    // Validate product structure
    if (product && typeof product === 'object' && product.id && product.name) {
      return product;
    }
    
    return null;
  }, [products, selectedDevice]);

  // Parse product images - robust and reliable with validation
  const productImages = useMemo(() => {
    if (!currentProduct) {
      return [];
    }
    
    try {
      const rawImages = (currentProduct as any)?.images;
      
      // Handle null/undefined
      if (rawImages === null || rawImages === undefined) {
        return [];
      }
      
      // If already an array, validate and return
      if (Array.isArray(rawImages)) {
        return rawImages
          .filter((img: any) => {
            // Filter out invalid values
            if (img === null || img === undefined) return false;
            const str = String(img).trim();
            // Validate URL format (basic check)
            return str.length > 0 && (str.startsWith('http') || str.startsWith('data:') || str.startsWith('/'));
          })
          .map((img: any) => String(img).trim());
      }
      
      // If string, parse it
      if (typeof rawImages === 'string') {
        const trimmed = rawImages.trim();
        if (!trimmed) {
          return [];
        }
        
        try {
          // Try to parse as JSON
          if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
            const parsed = JSON.parse(trimmed);
            const result = Array.isArray(parsed) ? parsed : [parsed];
            return result
              .filter((img: any) => {
                if (img === null || img === undefined) return false;
                const str = String(img).trim();
                return str.length > 0 && (str.startsWith('http') || str.startsWith('data:') || str.startsWith('/'));
              })
              .map((img: any) => String(img).trim());
          } else {
            // Single image URL - validate format
            if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
              return [trimmed];
            }
            return [];
          }
        } catch (parseError) {
          // If JSON parse fails, check if it's a valid URL
          if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
            return [trimmed];
          }
          return [];
        }
      }
      
      return [];
    } catch (error) {
      // If anything goes wrong, return empty array (fail gracefully)
      console.error('Error parsing product images:', error);
      return [];
    }
  }, [currentProduct]);

  // Contact form
  const form = useForm<InsertContactSubmission>({
    resolver: zodResolver(insertContactSubmissionSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      message: "",
      fileName: "",
      fileData: "",
      consentToProcessing: false,
    },
  });

  const submitContactMutation = useMutation({
    mutationFn: async (data: InsertContactSubmission) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Сообщение отправлено",
        description: "Мы свяжемся с вами в ближайшее время",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });

  const onSubmitContact = (data: InsertContactSubmission) => {
    submitContactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 sm:py-24 md:py-32 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 sm:mb-6">
              Профессиональное оборудование
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6">
              {device.name}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto">
              {device.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setShowPaymentModal(true)}
                className="text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-7"
              >
                Оформить заказ
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const element = document.getElementById("specifications");
                  element?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-7"
              >
                Узнать больше
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Device Selection */}
      <section className="py-8 sm:py-12 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {devices.map((d) => (
              <Button
                key={d.id}
                variant={selectedDevice === d.id ? "default" : "outline"}
                onClick={() => setSelectedDevice(d.id)}
                className="text-sm sm:text-base"
              >
                {d.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Specifications */}
      <section id="specifications" className="py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <Badge variant="secondary" className="mb-3 sm:mb-4">
                Характеристики
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
                Технические характеристики
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                {device.specifications}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Основные параметры</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {device.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Images Gallery - show for all users (registered or not) */}
      {/* Only show if we have valid images and products are loaded */}
      {!isLoadingProducts && Array.isArray(productImages) && productImages.length > 0 && (
        <section id="gallery" className="py-16 sm:py-20 md:py-24 lg:py-32 scroll-animate">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="text-center mb-10 sm:mb-12 md:mb-16 animate-fade-up">
              <Badge variant="secondary" className="mb-3 sm:mb-4" data-testid="badge-gallery-section">
                Фотогалерея
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2" data-testid="heading-gallery">
                Фотографии устройства {device.name}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2" data-testid="text-gallery-desc">
                Ознакомьтесь с фотографиями нагрузочного устройства
              </p>
            </div>

            <div className={`grid gap-4 sm:gap-6 scroll-animate ${
              productImages.length === 1 
                ? "grid-cols-1 max-w-3xl mx-auto" 
                : productImages.length === 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto justify-items-center"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}>
              {productImages.map((imageData: string, idx: number) => {
                // Validate image data before rendering
                if (!imageData || typeof imageData !== 'string') {
                  return null;
                }
                
                const trimmedUrl = imageData.trim();
                if (trimmedUrl.length === 0) {
                  return null;
                }
                
                // Additional URL validation
                if (!trimmedUrl.startsWith('http') && !trimmedUrl.startsWith('data:') && !trimmedUrl.startsWith('/')) {
                  return null;
                }
                
                return (
                  <div
                    key={`${currentProduct?.id || 'product'}-image-${idx}`}
                    className="group relative overflow-hidden rounded-lg sm:rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                    data-testid={`gallery-image-${idx}`}
                  >
                    <div className="bg-muted relative" style={{ minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={trimmedUrl}
                        alt={`${device.name} - Фото ${idx + 1}`}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 p-4"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          // Replace with placeholder on error
                          const target = e.target as HTMLImageElement;
                          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='18' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EИзображение не найдено%3C/text%3E%3C/svg%3E";
                          target.onerror = null; // Prevent infinite loop
                        }}
                        onLoad={() => {
                          // Image loaded successfully
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Applications */}
      <section id="applications" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-3 sm:mb-4">
              Применение
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2">
              Сферы применения
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
              Профессиональное тестирование широкого спектра энергетического оборудования
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 scroll-animate">
            {[
              { icon: Factory, title: "Дизель-генераторы", description: "Испытания и проверка работоспособности дизель-генераторных установок" },
              { icon: Cpu, title: "Газопоршневые установки", description: "Тестирование ГПУ под различными режимами нагрузки" },
              { icon: Gauge, title: "Газотурбинные установки", description: "Проверка параметров ГТУ в реальных условиях эксплуатации" },
              { icon: Zap, title: "ИБП и стабилизаторы", description: "Проверка систем бесперебойного питания и стабилизации напряжения" },
              { icon: Building2, title: "Промышленные объекты", description: "Тестирование энергосистем крупных промышленных предприятий" },
              { icon: Wrench, title: "Сервисное обслуживание", description: "Диагностика и настройка энергетического оборудования" },
            ].map((app, idx) => {
              const Icon = app.icon;
              return (
                <Card key={idx} className="hover-elevate">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{app.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{app.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section id="documentation" className="py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-3 sm:mb-4">
              Соответствие
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2">
              Документы и сертификация
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
              Полное соответствие стандартам и требованиям безопасности
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 scroll-animate">
            {[
              { title: "ГОСТ РФ", desc: "Соответствие ГОСТам" },
              { title: "Безопасность", desc: "Требования РФ" },
              { title: "ФИФ", desc: "Внесено в фонд" },
              { title: "Поверка", desc: "Первичная поверка" },
            ].map((cert, idx) => (
              <Card key={idx} className="text-center hover-elevate">
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
        </div>
      </section>

      {/* Delivery */}
      <section id="delivery" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-3 sm:mb-4">
              Доставка
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2">
              Условия доставки и комплектация
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
              Полный комплект оборудования и документации
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 scroll-animate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Доставка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Доставка по всей России",
                    "Транспортная компания на выбор",
                    "Страхование груза",
                    "Отслеживание отправления",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
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
                  <Package className="h-5 w-5 text-primary" />
                  Комплектация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Основное оборудование",
                    "Комплекты колёс для транспортировки",
                    "Паспорт изделия",
                    "Руководство по эксплуатации",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
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

      {/* Contact */}
      <section id="contact" className="py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 scroll-animate">
            <Badge variant="secondary" className="mb-3 sm:mb-4">
              Контакты
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-2">
              Свяжитесь с нами
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
              Отправьте заявку и мы свяжемся с вами в ближайшее время
            </p>
          </div>

          <Card className="scroll-animate">
            <CardHeader>
              <CardTitle>Форма обратной связи</CardTitle>
              <CardDescription>Заполните форму и мы обязательно ответим</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имя *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ваше имя" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон *</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+7 (___) ___-__-__" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Компания</FormLabel>
                          <FormControl>
                            <Input placeholder="Название компании" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сообщение *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ваше сообщение" rows={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="consentToProcessing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Я согласен на обработку персональных данных *
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={submitContactMutation.isPending} className="w-full">
                    {submitContactMutation.isPending ? "Отправка..." : "Отправить сообщение"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          product={currentProduct}
          device={device}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
