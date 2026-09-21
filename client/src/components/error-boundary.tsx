import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Подпись для логов: помогает понять, какой участок упал. */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Перехватывает ошибки отрисовки React.
 *
 * Без неё любое исключение в компоненте (битые данные из админки,
 * обращение к полю у undefined) размонтировало всё дерево и оставляло
 * пользователя с белым экраном без единой подсказки.
 *
 * Ошибки в обработчиках событий и в асинхронном коде сюда не попадают —
 * это ограничение React, а не недосмотр.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`, error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-16 bg-background"
        role="alert"
        data-testid="error-boundary"
      >
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold mb-2">Что-то пошло не так</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Страница не смогла отобразиться. Попробуйте обновить её — если ошибка повторяется,
            напишите нам, и мы разберёмся.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={this.handleReload} data-testid="button-error-reload">
              <RotateCw className="w-4 h-4 mr-2" />
              Обновить страницу
            </Button>
            <Button variant="outline" onClick={this.handleGoHome} data-testid="button-error-home">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </div>

          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
