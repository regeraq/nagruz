import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";

export default function NotFound() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen w-full bg-background">
      <Navigation />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center mb-6">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h1 className="text-3xl font-bold mb-2">404</h1>
              <h2 className="text-xl font-semibold text-muted-foreground mb-4">
                Страница не найдена
              </h2>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Запрашиваемая страница не существует или была перемещена.
            </p>
            
            <Button onClick={() => setLocation("/")} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
