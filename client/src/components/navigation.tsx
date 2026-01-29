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

interface NavigationProps {
  selectedDevice?: string;
  onDeviceChange?: (device: string) => void;
  availableDeviceIds?: string[];
}

const navLinks = [
  { label: "Главная", id: "hero" },
  { label: "Характеристики", id: "specifications" },
  { label: "Галерея", id: "gallery" },
  { label: "Применение", id: "applications" },
  { label: "Документация", id: "documentation" },
  { label: "Контакты", id: "contact" },
];

export function Navigation({ selectedDevice = "nu-100", onDeviceChange, availableDeviceIds = [] }: NavigationProps = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Get products to build dynamic device list - synchronized with home page
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      try {
        // Add cache-busting parameter to ensure fresh data
        const timestamp = Date.now();
        const res = await fetch(`/api/products?_t=${timestamp}`, {
          credentials: "include",
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
        
        if (!res.ok) {
          if (res.status === 404) {
            return [];
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        let productsArray: any[] = [];
        
        if (!Array.isArray(data)) {
          if (data && typeof data === 'object') {
            if (Array.isArray(data.products)) productsArray = data.products;
            else if (Array.isArray(data.data)) productsArray = data.data;
          }
        } else {
          productsArray = data;
        }
        
        // Filter and ensure images are properly formatted
        return productsArray
          .filter((p: any) => p && typeof p === 'object' && p.id && p.name)
          .map((p: any) => {
            // Ensure images is always an array
            let images = p.images;
            if (typeof images === 'string') {
              try {
                images = JSON.parse(images);
              } catch {
                images = images.trim() ? [images] : [];
              }
            }
            if (!Array.isArray(images)) {
              images = [];
            }
            return { ...p, images };
          });
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds - more frequent updates
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Build devices list from products (dynamic, not hardcoded)
  const allDevices = products
    .filter((p: any) => p && p.id && p.name && p.isActive !== false)
    .map((p: any) => ({ id: p.id, name: p.name }));
  
  // Filter to show only available devices
  // FIXED: If availableDeviceIds is empty or not provided, show all devices (fallback)
  const devices = availableDeviceIds.length > 0 
    ? allDevices.filter(d => availableDeviceIds.includes(d.id))
    : allDevices;

  const currentProduct = products.find((p: any) => p.id === selectedDevice);
  
  // Check for gallery images - handle both array and string formats robustly
  // Also check imageUrl field as fallback
  const hasGallery = (() => {
    if (!currentProduct) return false;
    
    // Check imageUrl first (main image)
    const imageUrl = (currentProduct as any)?.imageUrl;
    if (imageUrl && typeof imageUrl === 'string') {
      const trimmed = imageUrl.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/'))) {
        return true;
      }
    }
    
    const images = (currentProduct as any)?.images;
    if (!images) return false;
    
    // If already an array, check length
    if (Array.isArray(images)) {
      return images.filter((img: any) => {
        if (!img) return false;
        const str = String(img).trim();
        return str.length > 0 && (str.startsWith('http') || str.startsWith('data:') || str.startsWith('/'));
      }).length > 0;
    }
    
    // If string, try to parse or check if it's a valid URL
    if (typeof images === 'string') {
      const trimmed = images.trim();
      if (!trimmed) return false;
      
      // Check if it's a valid URL directly
      if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
        return true;
      }
      
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((img: any) => {
            if (!img) return false;
            const str = String(img).trim();
            return str.length > 0 && (str.startsWith('http') || str.startsWith('data:') || str.startsWith('/'));
          }).length > 0;
        }
        return false;
      } catch {
        return false;
      }
    }
    
    return false;
  })();

  // Filter nav links based on gallery availability
  const visibleNavLinks = navLinks.filter(link => {
    if (link.id === "gallery") {
      return hasGallery;
    }
    return true;
  });

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

  const handleLogout = () => {
    // Clear tokens immediately for instant logout
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    
    // Invalidate user-related queries only (not products - they should be public)
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    
    // FIXED: Don't invalidate products cache - products are public and should remain cached
    // This ensures gallery images remain visible after logout
    // queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    // queryClient.refetchQueries({ queryKey: ['/api/products'] });
    
    // Redirect immediately
    setLocation("/");
    
    // Fire-and-forget logout API call (don't wait for response)
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      apiRequest("POST", "/api/auth/logout", { refreshToken }).catch(() => {
        // Ignore errors - logout is already complete on client side
      });
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
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setLocation("/")}
                data-testid="button-logo"
                className="flex items-center gap-1 sm:gap-2 hover-elevate active-elevate-2 rounded-md px-1 sm:px-2 py-1"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
              </button>
              
              {/* Выбор устройства */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-device-selector"
                    className="hidden md:flex items-center gap-2"
                  >
                    <Gauge className="h-4 w-4" />
                    {devices.find(d => d.id === selectedDevice)?.name || "Устройство"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {devices.map((device) => (
                    <DropdownMenuItem
                      key={device.id}
                      onClick={() => onDeviceChange?.(device.id)}
                      className={selectedDevice === device.id ? "bg-accent" : ""}
                      data-testid={`device-option-${device.id}`}
                    >
                      {device.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {visibleNavLinks.map((link) => {
                return (
                  <Button
                    key={link.id}
                    variant="ghost"
                    onClick={() => {
                      if (location !== "/") {
                        setLocation("/");
                        setTimeout(() => {
                          const el = document.getElementById(link.id);
                          if (el) {
                            const pos = el.getBoundingClientRect().top + window.pageYOffset - 80;
                            window.scrollTo({ top: pos, behavior: "smooth" });
                          }
                        }, 100);
                      } else {
                        const el = document.getElementById(link.id);
                        if (el) {
                          const pos = el.getBoundingClientRect().top + window.pageYOffset - 80;
                          window.scrollTo({ top: pos, behavior: "smooth" });
                        }
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "text-sm font-medium transition-all duration-200 relative",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    {link.label}
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
        <div className="fixed inset-0 z-40 lg:hidden bg-background/98 backdrop-blur-md pt-14 sm:pt-20 animate-in slide-in-from-top">
          <div className="flex flex-col gap-2 p-4 sm:p-6">
            {visibleNavLinks.map((link) => {
              return (
                <Button
                  key={link.id}
                  variant="ghost"
                  onClick={() => {
                    const element = document.getElementById(link.id);
                    if (element) {
                      const offset = 80;
                      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                      window.scrollTo({
                        top: elementPosition - offset,
                        behavior: "smooth",
                      });
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "justify-start text-lg h-12 transition-colors",
                    "hover:bg-accent hover:text-accent-foreground"
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
