import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import { CookieBanner } from "@/components/cookie-banner";
import { usePageTitle } from "@/hooks/usePageTitle";

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

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/faq" component={FAQ} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
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

function AppContent() {
  usePageTitle();

  return (
    <>
      <ScrollToTopOnRouteChange />
      <Navigation />
      <Router />
      <CookieBanner />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
