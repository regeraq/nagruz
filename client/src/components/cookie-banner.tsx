import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useLocation } from "wouter";

export function CookieBanner() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookie-consent");
    if (consent) {
      return; // Don't show banner if consent already given
    }

    // Fetch cookie settings
    fetch("/api/cookie-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings?.enabled) {
          setSettings(data.settings);
          setIsVisible(true);
        }
      })
      .catch((error) => {
        console.error("Error fetching cookie settings:", error);
        // Show default banner if API fails
        setIsVisible(true);
        setSettings({
          message: "Мы используем cookies для улучшения работы сайта",
          acceptButtonText: "Принять",
          declineButtonText: "Отклонить",
        });
      });
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible || !settings) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {settings.message || "Мы используем cookies для улучшения работы сайта. Продолжая использовать сайт, вы соглашаетесь с использованием cookies."}
          </p>
          <div className="mt-2 flex gap-4 text-xs">
            <button
              onClick={() => setLocation("/privacy-policy")}
              className="text-primary hover:underline"
            >
              Политика конфиденциальности
            </button>
            <button
              onClick={() => setLocation("/data-processing-policy")}
              className="text-primary hover:underline"
            >
              Политика обработки персональных данных
            </button>
            <button
              onClick={() => setLocation("/public-offer")}
              className="text-primary hover:underline"
            >
              Публичная оферта
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
          >
            {settings.declineButtonText || "Отклонить"}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
          >
            {settings.acceptButtonText || "Принять"}
          </Button>
        </div>
      </div>
    </div>
  );
}




