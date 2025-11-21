import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className="rounded-md flex items-center justify-center h-9 w-9 relative overflow-hidden"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {theme === "light" ? (
          <Moon 
            className="h-5 w-5 flex-shrink-0 absolute transition-all duration-300 opacity-100 scale-100" 
          />
        ) : (
          <Sun 
            className="h-5 w-5 flex-shrink-0 absolute transition-all duration-300 opacity-100 scale-100" 
          />
        )}
      </div>
      <span className="sr-only">Переключить тему</span>
    </Button>
  );
}
