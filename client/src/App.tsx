import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import Contacts from "@/pages/contacts";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import Specifications from "@/pages/specifications";
import Applications from "@/pages/applications";
import Documentation from "@/pages/documentation";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/privacy-policy";
import DataProcessingPolicy from "@/pages/data-processing-policy";
import PublicOffer from "@/pages/public-offer";
import { CookieBanner } from "@/components/cookie-banner";
import { usePageTitle } from "@/hooks/usePageTitle";

function Router() {
  return (
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
