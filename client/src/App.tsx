import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteLocked } from "@/components/site-locked";
import { ErrorBoundary } from "@/components/error-boundary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSiteAccess } from "@/hooks/useSiteAccess";

// PERF: без разделения кода вся админка (~275 КБ исходника), личный кабинет
// и юридические страницы попадали в один бандл, который скачивал каждый
// анонимный посетитель главной. Редко посещаемые маршруты грузятся по требованию.
const About = lazy(() => import("@/pages/about"));
const FAQ = lazy(() => import("@/pages/faq"));
const Contacts = lazy(() => import("@/pages/contacts"));
const Profile = lazy(() => import("@/pages/profile"));
const Admin = lazy(() => import("@/pages/admin"));
const Specifications = lazy(() => import("@/pages/specifications"));
const Applications = lazy(() => import("@/pages/applications"));
const Documentation = lazy(() => import("@/pages/documentation"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const DataProcessingPolicy = lazy(() => import("@/pages/data-processing-policy"));
const PublicOffer = lazy(() => import("@/pages/public-offer"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}

/**
 * Регистрацию можно закрыть из админки. Прямой заход на /register в этом
 * случае показывает вход, а не форму создания аккаунта.
 */
function RegisterRoute() {
  const { access, isLoading } = useSiteAccess();
  if (isLoading) return <RouteFallback />;
  return access.registrationEnabled ? <Register /> : <Login />;
}

function Router() {
  const [location] = useLocation();
  return (
    // key по маршруту: после падения страницы переход на другую сбрасывает
    // состояние ошибки, а шапка и баннер cookie остаются на месте.
    <ErrorBoundary scope={location} key={location}>
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/faq" component={FAQ} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={RegisterRoute} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
        <Route path="/specifications" component={Specifications} />
        <Route path="/applications" component={Applications} />
        <Route path="/documentation" component={Documentation} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/data-processing-policy" component={DataProcessingPolicy} />
        <Route path="/public-offer" component={PublicOffer} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * wouter не сбрасывает скролл при смене маршрута (в отличие от MPA).
 * Без этого при переходе, например, `/` (прокрученная вниз) → `/admin`
 * страница открывается в той же Y-позиции — визуально «в конце».
 *
 * Исключение: якорные ссылки (`#section`) не трогаем, чтобы не сломать
 * обычные прыжки по якорям на главной.
 */
function ScrollToTopOnRouteChange() {
  const [location] = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

/**
 * Пока в админке включён закрытый режим, анонимный посетитель видит только
 * форму входа. Это дубль серверной проверки (см. server/siteAccess.ts):
 * здесь — чтобы не мигало содержимое, там — чтобы данные реально не отдавались.
 */
function useIsAuthenticated(enabled: boolean) {
  return useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user ?? null;
    },
    enabled,
    retry: false,
    staleTime: 60 * 1000,
  });
}

function AppContent() {
  usePageTitle();
  const [location] = useLocation();
  const isHome = location === "/";
  const { access, isLoading: accessLoading } = useSiteAccess();
  const { data: currentUser, isLoading: userLoading } = useIsAuthenticated(access.privateMode);

  if (accessLoading || (access.privateMode && userLoading)) {
    return <RouteFallback />;
  }

  if (access.privateMode && !currentUser) {
    return <SiteLocked notice={access.notice} />;
  }

  return (
    <>
      <ScrollToTopOnRouteChange />
      {/* Главная рендерит свою шапку: ей нужны пропсы переключателя моделей,
          которых нет на остальных маршрутах. Без этого исключения на `/`
          отрисовывались две шапки одна поверх другой. */}
      {!isHome && <Navigation />}
      <Router />
      <CookieBanner />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary scope="app">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
