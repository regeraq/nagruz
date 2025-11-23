import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu, X, Gauge, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role: string;
}

const navLinks = [
  { label: "Главная", href: "/" },
  { label: "Характеристики", href: "/specifications" },
  { label: "Применение", href: "/applications" },
  { label: "Документация", href: "/documentation" },
  { label: "Контакты", href: "/contacts" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get current user
  const { data: userData, isLoading: isLoadingUser } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          return null;
        }

        if (!res.ok) return null;

        const data = await res.json();
        return data.user;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiRequest("POST", "/api/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      queryClient.clear();
      setLocation("/");
      window.location.reload();
    }
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const isAdmin = userData?.role === "admin" || userData?.role === "superadmin" || userData?.role === "moderator";

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
                onClick={() => setLocation("/")}
                className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1"
              >
                <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-5 h-5 text-primary-foreground" />
                </div>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location === link.href || (link.href === "/" && location === "/");
                return (
                  <Button
                    key={link.href}
                    variant="ghost"
                    onClick={() => {
                      setLocation(link.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "text-sm font-medium transition-all duration-200 relative",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive && "text-primary font-semibold"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {isLoadingUser ? (
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              ) : userData ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-transform hover:scale-105 active:scale-95">
                      <Avatar className="w-8 h-8 ring-2 ring-background hover:ring-primary transition-all">
                        <AvatarImage src={userData.avatar || undefined} />
                        <AvatarFallback>{getUserInitials(userData)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      <div className="font-medium">{userData.email}</div>
                      {userData.firstName && userData.lastName && (
                        <div className="text-xs">{userData.firstName} {userData.lastName}</div>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Профиль
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => setLocation("/admin")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Админ-панель
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="hidden md:flex"
                  >
                    Войти
                  </Button>
                  <Button
                    onClick={() => setLocation("/register")}
                    className="hidden md:flex"
                  >
                    Регистрация
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden bg-background/98 backdrop-blur-md pt-20 animate-in slide-in-from-top">
          <div className="flex flex-col gap-2 p-6">
            {navLinks.map((link) => {
              const isActive = location === link.href || (link.href === "/" && location === "/");
              return (
                <Button
                  key={link.href}
                  variant="ghost"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setLocation(link.href);
                  }}
                  className={cn(
                    "justify-start text-lg h-12 transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-primary font-semibold"
                  )}
                >
                  {link.label}
                </Button>
              );
            })}
            <div className="mt-4 pt-4 border-t">
              {userData ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setLocation("/profile");
                    }}
                    className="justify-start text-lg h-12 w-full"
                  >
                    <User className="mr-2 h-5 w-5" />
                    Профиль
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setLocation("/admin");
                      }}
                      className="justify-start text-lg h-12 w-full"
                    >
                      <Settings className="mr-2 h-5 w-5" />
                      Админ-панель
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="justify-start text-lg h-12 w-full"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Выйти
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setLocation("/login");
                    }}
                    className="justify-start text-lg h-12 w-full"
                  >
                    Войти
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setLocation("/register");
                    }}
                    className="justify-start text-lg h-12 w-full"
                  >
                    Регистрация
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
