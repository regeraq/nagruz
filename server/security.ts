/**
 * Security utilities for sanitization and validation
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - Text to escape
 * @returns Escaped HTML-safe string
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 * @param input - Input string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.trim();
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates phone number format (basic validation)
 * @param phone - Phone number to validate
 * @returns true if valid
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Calculates accurate base64 file size
 * @param base64String - Base64 encoded string
 * @returns Size in bytes
 */
export function calculateBase64Size(base64String: string): number {
  if (!base64String) return 0;
  
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
  
  // Calculate size: base64 encoding increases size by ~33%
  // Account for padding
  const padding = (base64Data.match(/=/g) || []).length;
  return (base64Data.length * 3) / 4 - padding;
}

/**
 * Validates file extension
 * @param fileName - File name
 * @param allowedExtensions - Array of allowed extensions (with dot)
 * @returns true if valid
 */
export function isValidFileExtension(fileName: string, allowedExtensions: string[]): boolean {
  if (!fileName) return false;
  
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return allowedExtensions.includes(extension);
}

/**
 * Validates MIME type
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid
 */
export function isValidMimeType(mimeType: string | null, allowedTypes: string[]): boolean {
  if (!mimeType) return false;
  return allowedTypes.includes(mimeType);
}

/**
 * Gets client IP address from request
 * @param req - Express request object
 * @returns IP address
 */
export function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}


