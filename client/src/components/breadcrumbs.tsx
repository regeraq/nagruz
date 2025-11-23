import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs component for navigation
 * Provides clear navigation path and improves SEO
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}
    >
      <ol className="flex items-center space-x-2" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link
            href="/"
            className="flex items-center hover:text-foreground transition-colors"
            aria-label="Главная"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Главная</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        
        {items.map((item, index) => {
          const position = index + 2;
          const isLast = index === items.length - 1;
          
          return (
            <li
              key={index}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center"
            >
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" aria-hidden="true" />
              {isLast ? (
                <span
                  className={cn(
                    "font-medium text-foreground",
                    !isLast && "hover:text-foreground transition-colors"
                  )}
                  aria-current="page"
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span itemProp="name">{item.label}</span>
              )}
              <meta itemProp="position" content={position.toString()} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

