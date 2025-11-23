import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Real-time form validation hook
 * Provides visual feedback and validation messages
 */
export function useRealtimeValidation(
  value: string,
  rules: ValidationRule[],
  showValidation: boolean = true
): ValidationResult {
  const [result, setResult] = useState<ValidationResult>({ isValid: true });

  useEffect(() => {
    if (!showValidation || !value) {
      setResult({ isValid: true });
      return;
    }

    for (const rule of rules) {
      if (!rule.test(value)) {
        setResult({ isValid: false, message: rule.message });
        return;
      }
    }

    setResult({ isValid: true });
  }, [value, rules, showValidation]);

  return result;
}

/**
 * Validation icon component
 */
export function ValidationIcon({ isValid, show }: { isValid: boolean; show: boolean }) {
  if (!show) return null;

  return isValid ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Валидно" />
  ) : (
    <XCircle className="h-4 w-4 text-red-600" aria-label="Невалидно" />
  );
}

/**
 * Validation message component
 */
export function ValidationMessage({
  isValid,
  message,
  show,
  className,
}: {
  isValid: boolean;
  message?: string;
  show: boolean;
  className?: string;
}) {
  if (!show || !message) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs mt-1",
        isValid ? "text-green-600" : "text-red-600",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {!isValid && <AlertCircle className="h-3 w-3" />}
      <span>{message}</span>
    </div>
  );
}

/**
 * Common validation rules
 */
export const validationRules = {
  email: (): ValidationRule[] => [
    {
      test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Введите корректный email адрес",
    },
    {
      test: (value) => value.length <= 254,
      message: "Email слишком длинный",
    },
  ],

  phone: (): ValidationRule[] => [
    {
      test: (value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      message: "Введите корректный номер телефона (минимум 10 цифр)",
    },
  ],

  required: (fieldName: string = "Поле"): ValidationRule[] => [
    {
      test: (value) => value.trim().length > 0,
      message: `${fieldName} обязательно для заполнения`,
    },
  ],

  minLength: (min: number, fieldName: string = "Поле"): ValidationRule[] => [
    {
      test: (value) => value.trim().length >= min,
      message: `${fieldName} должно содержать минимум ${min} символов`,
    },
  ],

  maxLength: (max: number, fieldName: string = "Поле"): ValidationRule[] => [
    {
      test: (value) => value.length <= max,
      message: `${fieldName} не должно превышать ${max} символов`,
    },
  ],

  password: (): ValidationRule[] => [
    {
      test: (value) => value.length >= 8,
      message: "Пароль должен содержать минимум 8 символов",
    },
    {
      test: (value) => /[A-Z]/.test(value),
      message: "Пароль должен содержать хотя бы одну заглавную букву",
    },
    {
      test: (value) => /[a-z]/.test(value),
      message: "Пароль должен содержать хотя бы одну строчную букву",
    },
    {
      test: (value) => /\d/.test(value),
      message: "Пароль должен содержать хотя бы одну цифру",
    },
  ],
};

