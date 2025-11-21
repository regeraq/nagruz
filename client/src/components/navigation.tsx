import { useState, useEffect } from "react";
import { Menu, X, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavigationProps {
  selectedDevice?: "nu-100" | "nu-30";
  onDeviceChange?: (device: "nu-100" | "nu-30") => void;
}

const navLinks = [
  { label: "Главная", id: "hero" },
  { label: "Характеристики", id: "specifications" },
  { label: "Применение", id: "applications" },
  { label: "Документация", id: "documentation" },
  { label: "Контакты", id: "contact" },
];

export function Navigation({ selectedDevice = "nu-100", onDeviceChange }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: "smooth",
      });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-background/50 backdrop-blur-sm"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollToSection("hero")}
                className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1"
                data-testid="link-logo"
              >
                <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-5 h-5 text-primary-foreground" />
                </div>
              </button>
              
              <div className="hidden md:flex items-center gap-1 bg-muted/30 rounded-md p-1">
                <Button
                  variant={selectedDevice === "nu-100" ? "default" : "ghost"}
                  onClick={() => onDeviceChange?.("nu-100")}
                  data-testid="button-device-nu-100"
                  className="min-w-16 h-8 text-xs font-semibold"
                >
                  НУ-100
                </Button>
                <Button
                  variant={selectedDevice === "nu-30" ? "default" : "ghost"}
                  onClick={() => onDeviceChange?.("nu-30")}
                  data-testid="button-device-nu-30"
                  className="min-w-14 h-8 text-xs font-semibold"
                >
                  НУ-30
                </Button>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                <Button
                  key={link.id}
                  variant="ghost"
                  onClick={() => scrollToSection(link.id)}
                  data-testid={`link-nav-${link.id}`}
                  className="text-sm font-medium"
                >
                  {link.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={() => scrollToSection("contact")}
                data-testid="button-cta-header"
                className="hidden md:flex"
              >
                Получить спецификацию
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden bg-background/98 backdrop-blur-md pt-20">
          <div className="flex flex-col gap-2 p-6">
            {navLinks.map((link) => (
              <Button
                key={link.id}
                variant="ghost"
                onClick={() => scrollToSection(link.id)}
                data-testid={`link-mobile-${link.id}`}
                className="justify-start text-lg h-12"
              >
                {link.label}
              </Button>
            ))}
            <Button
              onClick={() => scrollToSection("contact")}
              data-testid="button-cta-mobile"
              className="mt-4 h-12"
            >
              Получить спецификацию
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
