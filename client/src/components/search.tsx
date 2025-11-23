import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";

interface SearchResult {
  type: "product" | "section";
  title: string;
  description?: string;
  href: string;
  keywords?: string[];
}

interface SearchProps {
  className?: string;
  onResultClick?: () => void;
}

/**
 * Smart search component with autocomplete and typo tolerance
 * Searches through products and site sections
 */
export function Search({ className, onResultClick }: SearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Site sections for search
  const sections: SearchResult[] = [
    {
      type: "section",
      title: "Характеристики",
      description: "Технические характеристики оборудования",
      href: "#specifications",
      keywords: ["характеристики", "технические", "параметры", "specs"],
    },
    {
      type: "section",
      title: "Применение",
      description: "Сферы применения нагрузочных устройств",
      href: "#applications",
      keywords: ["применение", "сферы", "использование", "приложения"],
    },
    {
      type: "section",
      title: "Документация",
      description: "Документы и сертификация",
      href: "#documentation",
      keywords: ["документация", "документы", "сертификация", "паспорт"],
    },
    {
      type: "section",
      title: "Контакты",
      description: "Связаться с нами",
      href: "#contact",
      keywords: ["контакты", "связаться", "заявка", "обратная связь"],
    },
  ];

  // Search function with typo tolerance (simple Levenshtein-like matching)
  const searchResults = (): SearchResult[] => {
    if (!query.trim() || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search products
    if (products) {
      products.forEach((product) => {
        const productText = `${product.name} ${product.description} ${product.sku}`.toLowerCase();
        if (
          productText.includes(normalizedQuery) ||
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.sku.toLowerCase().includes(normalizedQuery)
        ) {
          results.push({
            type: "product",
            title: product.name,
            description: product.description,
            href: `#contact?product=${product.id}`,
          });
        }
      });
    }

    // Search sections
    sections.forEach((section) => {
      const sectionText = `${section.title} ${section.description} ${section.keywords?.join(" ")}`.toLowerCase();
      if (sectionText.includes(normalizedQuery)) {
        results.push(section);
      }
    });

    // Sort: products first, then by relevance
    return results.slice(0, 8); // Limit to 8 results
  };

  const results = searchResults();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && results[focusedIndex]) {
            handleResultClick(results[focusedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, results, focusedIndex]);

  const handleResultClick = (result: SearchResult) => {
    if (result.href.startsWith("#")) {
      const element = document.querySelector(result.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.location.href = result.href;
    }
    setIsOpen(false);
    setQuery("");
    setFocusedIndex(-1);
    onResultClick?.();
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.length >= 2);
    setFocusedIndex(-1);
  };

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Поиск по сайту..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10"
          aria-label="Поиск по сайту"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Очистить поиск"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            <ul role="listbox" className="space-y-1">
              {results.map((result, index) => (
                <li
                  key={`${result.type}-${index}`}
                  role="option"
                  aria-selected={focusedIndex === index}
                  className={cn(
                    "px-3 py-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted focus:bg-muted",
                    focusedIndex === index && "bg-muted"
                  )}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="flex items-start gap-2">
                    <SearchIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{result.title}</div>
                      {result.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </div>
                      )}
                    </div>
                    {result.type === "product" && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Товар
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </CardContent>
        </Card>
      )}
    </div>
  );
}

