import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { hashPassword, verifyPassword, generateAccessToken, verifyAccessToken, generateRefreshToken } from "./auth";
import { insertContactSubmissionSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import { 
  escapeHtml, 
  sanitizeInput, 
  calculateBase64Size, 
  isValidFileExtension, 
  isValidMimeType 
} from "./security";
import { rateLimiters } from "./rateLimiter";
import { cache, CACHE_TTL } from "./cache";
import { csrfProtection } from "./csrf";

// SECURITY: API keys must be in environment variables, no hardcoded fallbacks
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL || "rostext@gmail.com";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"; // Use verified domain for production

if (!RESEND_API_KEY) {
  console.warn("⚠️ RESEND_API_KEY not set in environment variables. Email functionality will be disabled.");
}

// Constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const API_TIMEOUT_MS = 10000; // 10 seconds for regular emails
const API_TIMEOUT_WITH_ATTACHMENT_MS = 120000; // 120 seconds (2 minutes) for emails with attachments

/**
 * FIXED: Email sending with timeout and better error handling
 */
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured");
    return { success: false, message: "Email service not configured" };
  }

  try {
    // FIXED: Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    // Resend requires verified domain to send to external emails
    // For production, you need to verify your domain in Resend Dashboard
    // Test domain onboarding@resend.dev only works for the email used during Resend signup
    const emailPayload = {
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
      reply_to: OWNER_EMAIL, // Set reply-to to actual email
    };

    console.log("📧 [sendEmail] Sending email:", { to, subject, from: emailPayload.from });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ [sendEmail] Resend API error:", { 
        status: response.status, 
        statusText: response.statusText,
        data 
      });
      
      // Special handling for domain verification error
      if (data.message && (data.message.includes("domain is not verified") || data.message.includes("You can only send testing emails"))) {
        console.error("⚠️ [sendEmail] DOMAIN VERIFICATION REQUIRED:");
        console.error("   Resend requires a verified domain to send to external emails.");
        console.error("   Please verify your domain at: https://resend.com/domains");
        console.error("   Current from email:", RESEND_FROM_EMAIL);
        console.error("   Target email:", to);
        console.error("   Error:", data.message);
        console.error("   See RESEND_DOMAIN_VERIFICATION.md for instructions");
        
        // FIXED: Return more helpful error message
        return { 
          success: false, 
          error: "Domain verification required. Please verify your domain in Resend dashboard.",
          requiresDomainVerification: true,
          data 
        };
      }
      
      return { success: false, error: data.message || "Failed to send email", data };
    }

    console.log("✅ [sendEmail] Email sent successfully:", { to, subject, id: data.id });
    return { success: true, data };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("⏱️ [sendEmail] Email sending timeout");
      return { success: false, error: "Timeout" };
    }
    console.error("❌ [sendEmail] Error sending email:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Send email with attachment support
 */
async function sendEmailWithAttachment(emailData: {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
  }>;
  reply_to?: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured");
    return { success: false, message: "Email service not configured" };
  }

  try {
    const hasAttachments = !!(emailData.attachments && emailData.attachments.length > 0);
    const timeoutMs = hasAttachments ? API_TIMEOUT_WITH_ATTACHMENT_MS : API_TIMEOUT_MS;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Resend API format for attachments: content should be base64 string
    const emailPayload: any = {
      from: RESEND_FROM_EMAIL,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      reply_to: emailData.reply_to || OWNER_EMAIL,
    };

    // Format attachments for Resend API
    if (hasAttachments) {
      emailPayload.attachments = emailData.attachments!.map(att => ({
        filename: att.filename,
        content: att.content, // Base64 string
      }));
    }

    const attachmentSize = hasAttachments 
      ? emailPayload.attachments.reduce((sum: number, att: any) => sum + (att.content?.length || 0), 0)
      : 0;

    console.log("📧 [sendEmailWithAttachment] Sending email:", { 
      to: emailData.to, 
      subject: emailData.subject,
      attachmentsCount: emailData.attachments?.length || 0,
      hasAttachments,
      attachmentSizeKB: Math.round(attachmentSize / 1024),
      timeoutMs
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ [sendEmailWithAttachment] Resend API error:", { 
        status: response.status, 
        statusText: response.statusText,
        data,
        payload: {
          to: emailPayload.to,
          subject: emailPayload.subject,
          attachmentsCount: emailPayload.attachments?.length || 0
        }
      });
      
      // Special handling for domain verification error
      if (data.message && (data.message.includes("domain is not verified") || data.message.includes("You can only send testing emails"))) {
        console.error("⚠️ [sendEmailWithAttachment] DOMAIN VERIFICATION REQUIRED:");
        console.error("   Resend requires a verified domain to send to external emails.");
        console.error("   Please verify your domain at: https://resend.com/domains");
        console.error("   Current from email:", RESEND_FROM_EMAIL);
        console.error("   Target email:", emailData.to);
        console.error("   Error:", data.message);
        console.error("   See RESEND_DOMAIN_VERIFICATION.md for instructions");
        
        // FIXED: Return more helpful error message
        return { 
          success: false, 
          error: "Domain verification required. Please verify your domain in Resend dashboard.",
          requiresDomainVerification: true,
          data 
        };
      }
      
      return { success: false, error: data.message || "Failed to send email", data };
    }

    console.log("✅ [sendEmailWithAttachment] Email sent successfully:", { 
      to: emailData.to, 
      subject: emailData.subject, 
      id: data.id,
      attachmentsCount: emailData.attachments?.length || 0
    });
    return { success: true, data };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // This should not happen as we handle AbortError in the try block above
      console.error("⏱️ [sendEmailWithAttachment] Email sending timeout (unexpected)");
      return { success: false, error: "Timeout", timeout: true };
    }
    
    // Handle network errors that weren't caught in the fetch try block
    if (error.cause?.code === 'ECONNRESET' || error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      console.error("❌ [sendEmailWithAttachment] Network error (catch block):", {
        code: error.cause?.code,
        message: error.message
      });
      return { success: false, error: "Network error - connection reset (file may be too large)", timeout: false, networkError: true };
    }
    
    console.error("❌ [sendEmailWithAttachment] Error sending email:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}


export async function registerRoutes(app: Express): Promise<Server> {
  // CSRF token endpoint
  app.get("/api/csrf-token", (req, res) => {
    const token = res.locals.csrfToken;
    if (token) {
      res.json({ token });
    } else {
      // Token will be generated by csrfToken middleware
      res.json({ token: res.locals.csrfToken || "" });
    }
  });

  // Serve sitemap.xml for SEO
  app.get("/sitemap.xml", (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile('sitemap.xml', { root: './client/public' }, (err) => {
      if (err) {
        console.error('Error serving sitemap:', err);
        res.status(404).send('Sitemap not found');
      }
    });
  });

  // FIXED: Added CSRF protection, rate limiting, authentication requirement, and input sanitization
  app.post("/api/contact", csrfProtection, rateLimiters.contact, express.json({ limit: '15mb' }), async (req, res) => {
    try {
      // FIXED: Require authentication for contact submissions
      const token = req.headers.authorization?.replace("Bearer ", "");
      let userId: string | null = null;
      
      if (token) {
        try {
          const payload = verifyAccessToken(token);
          if (payload) {
            userId = payload.userId;
          }
        } catch (e) {
          // Token invalid, userId stays null
        }
      }
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Для отправки заявок необходимо авторизоваться",
        });
        return;
      }
      
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      
      // Check if file upload is enabled
      const fileUploadEnabled = await storage.getSiteSetting("enable_file_upload");
      const isFileUploadEnabled = fileUploadEnabled?.value === "true" || fileUploadEnabled?.value === true;
      
      // If file upload is disabled, reject file data
      if (!isFileUploadEnabled && (validatedData.fileData || validatedData.fileName)) {
        res.status(400).json({
          success: false,
          message: "Загрузка файлов временно отключена",
        });
        return;
      }
      
      // FIXED: Validate and sanitize file data (only if file upload is enabled)
      if (isFileUploadEnabled && validatedData.fileData && validatedData.fileName) {
        const dataUrlMatch = validatedData.fileData.match(/^data:([^;]+);base64,(.+)$/);
        const base64Data = dataUrlMatch ? dataUrlMatch[2] : validatedData.fileData;
        const declaredMimeType = dataUrlMatch ? dataUrlMatch[1] : null;
        
        // FIXED: Accurate file size calculation
        const fileSizeBytes = calculateBase64Size(validatedData.fileData);
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          res.status(413).json({
            success: false,
            message: `Размер файла превышает максимально допустимый (${MAX_FILE_SIZE_MB} МБ)`,
          });
          return;
        }

        // FIXED: Validate MIME type
        if (declaredMimeType && !isValidMimeType(declaredMimeType, ALLOWED_MIME_TYPES)) {
          res.status(400).json({
            success: false,
            message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
          });
          return;
        }

        // FIXED: Validate file extension
        if (!isValidFileExtension(validatedData.fileName, ALLOWED_EXTENSIONS)) {
          res.status(400).json({
            success: false,
            message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
          });
          return;
        }
      }
      
      const submission = await storage.createContactSubmission(validatedData);
      
      // FIXED: XSS protection - escape all user input with beautiful HTML template
      const ownerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">📧 Новое коммерческое предложение</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- ID заявки -->
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">ID заявки</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #333; font-family: monospace;">${escapeHtml(submission.id)}</p>
              </div>
              
              <!-- Контактная информация -->
              <h3 style="color: #333; margin-top: 25px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">👤 Контактная информация</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666; width: 150px;"><strong>Имя:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">${escapeHtml(validatedData.name)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">
                    <a href="mailto:${escapeHtml(validatedData.email)}" style="color: #667eea; text-decoration: none;">${escapeHtml(validatedData.email)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666;"><strong>Телефон:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">
                    <a href="tel:${escapeHtml(validatedData.phone)}" style="color: #667eea; text-decoration: none;">${escapeHtml(validatedData.phone)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666;"><strong>Компания:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">${escapeHtml(validatedData.company || 'Не указана')}</td>
                </tr>
              </table>
              
              <!-- Сообщение -->
              <h3 style="color: #333; margin-top: 25px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">💬 Сообщение</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; line-height: 1.6; color: #333;">
                ${escapeHtml(validatedData.message).replace(/\n/g, '<br>')}
              </div>
              
              ${validatedData.fileName ? `
              <!-- Файл -->
              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404;">
                  <strong>📎 Прикрепленный файл:</strong> ${escapeHtml(validatedData.fileName)}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #856404;">Файл прикреплен к письму</p>
              </div>
              ` : ''}
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p style="margin: 0;">Это автоматическое уведомление с сайта</p>
                <p style="margin: 5px 0 0 0;">Дата получения: ${new Date().toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Prepare email with attachment if file exists
      const emailData: {
        from: string;
        to: string;
        subject: string;
        html: string;
        reply_to: string;
        attachments?: Array<{ filename: string; content: string }>;
      } = {
        from: RESEND_FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Новое коммерческое предложение (ID: ${submission.id}) от ${escapeHtml(validatedData.name)}`,
        html: ownerEmailHtml,
        reply_to: validatedData.email || OWNER_EMAIL, // Reply to sender's email
      };

      // Add attachment if file exists and file upload is enabled
      if (isFileUploadEnabled && validatedData.fileName && validatedData.fileData) {
        try {
          // Extract base64 data (Resend expects pure base64 string without data URL prefix)
          let base64Data: string;
          
          if (validatedData.fileData.includes(',')) {
            // Remove data:type;base64, prefix
            base64Data = validatedData.fileData.split(',')[1];
          } else {
            // Already base64 without prefix
            base64Data = validatedData.fileData;
          }
          
          // Validate base64
          if (!base64Data || base64Data.length === 0) {
            throw new Error("Empty base64 data");
          }
          
          emailData.attachments = [{
            filename: validatedData.fileName,
            content: base64Data, // Pure base64 string for Resend
          }];
          
          const sizeKB = Math.round(base64Data.length / 1024);
          const sizeMB = (sizeKB / 1024).toFixed(2);
          console.log("📎 [Contact] Adding attachment:", { 
            filename: validatedData.fileName, 
            size: base64Data.length,
            sizeKB,
            sizeMB: `${sizeMB} MB`,
            note: sizeKB > 5000 ? "⚠️ Large file - may cause timeout" : "✓ File size OK"
          });
          
          // Warn if file is very large
          if (sizeKB > 10000) {
            console.warn("⚠️ [Contact] Very large attachment detected. Consider compressing the file.");
          }
        } catch (attachmentError: any) {
          console.error("❌ [Contact] Error processing attachment:", attachmentError);
          console.error("   Will send email without attachment");
          // Continue without attachment if there's an error
        }
      }

      // Send email asynchronously (don't block response) - send immediately
      console.log("📧 [Contact] Sending commercial proposal email to:", OWNER_EMAIL);
      sendEmailWithAttachment(emailData)
          .then(result => {
            if (result.success) {
              console.log("✅ [Contact] Commercial proposal email sent successfully", {
                id: result.data?.id,
                hasAttachment: !!(emailData.attachments && emailData.attachments.length > 0)
              });
            } else {
              const isTimeout = result.timeout === true || result.error?.includes("Timeout") || result.error?.includes("timeout");
              const isNetworkError = result.networkError === true || result.error?.includes("Network error") || result.error?.includes("connection reset");
              console.error("❌ [Contact] Failed to send commercial proposal email:", {
                error: result.error,
                data: result.data,
                isTimeout,
                isNetworkError
              });
              
              // Fallback: try sending without attachment if attachment failed (timeout or network error)
              if (emailData.attachments && emailData.attachments.length > 0) {
                if (isTimeout) {
                  console.log("🔄 [Contact] Timeout detected - attempting to send email without attachment as fallback");
                } else if (isNetworkError) {
                  console.log("🔄 [Contact] Network error detected - attempting to send email without attachment as fallback");
                } else {
                  console.log("🔄 [Contact] Attempting to send email without attachment as fallback");
                }
                sendEmail(emailData.to, emailData.subject, emailData.html)
                  .then(fallbackResult => {
                    if (fallbackResult.success) {
                      console.log("✅ [Contact] Fallback email sent successfully (without attachment)");
                    } else {
                      console.error("❌ [Contact] Fallback email also failed:", fallbackResult.error);
                    }
                  })
                  .catch(fallbackErr => {
                    console.error("❌ [Contact] Fallback email error:", fallbackErr);
                  });
              }
            }
          })
          .catch(err => {
            console.error("❌ [Contact] Error sending commercial proposal email:", err);
            
            // Fallback on catch as well (timeout, network errors, etc.)
            if (emailData.attachments && emailData.attachments.length > 0) {
              console.log("🔄 [Contact] Attempting fallback after catch error (likely timeout)");
              sendEmail(emailData.to, emailData.subject, emailData.html)
                .then(fallbackResult => {
                  if (fallbackResult.success) {
                    console.log("✅ [Contact] Fallback email sent successfully (without attachment)");
                  } else {
                    console.error("❌ [Contact] Fallback email also failed:", fallbackResult.error);
                  }
                })
                .catch(fallbackErr => {
                  console.error("❌ [Contact] Fallback email error:", fallbackErr);
                });
            }
          });
      
      res.status(201).json({
        success: true,
        message: "Спасибо за вашу заявку! Мы свяжемся с вами в ближайшее время.",
        submissionId: submission.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Ошибка валидации данных",
          errors: error.errors,
        });
      } else {
        console.error("Error creating contact submission:", error);
        res.status(500).json({
          success: false,
          message: "Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.",
        });
      }
    }
  });

  app.get("/api/contact", rateLimiters.general, async (req, res) => {
    try {
      const submissions = await storage.getContactSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching contact submissions:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении заявок",
      });
    }
  });

  app.get("/api/contact/:id", rateLimiters.general, async (req, res) => {
    try {
      const submission = await storage.getContactSubmission(req.params.id);
      
      if (!submission) {
        res.status(404).json({
          success: false,
          message: "Заявка не найдена",
        });
        return;
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error fetching contact submission:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении заявки",
      });
    }
  });

  // Products API - public endpoint with caching and robust error handling
  app.get("/api/products", rateLimiters.general, async (req, res) => {
    try {
      const cacheKey = 'products-active';
      // Check for cache-busting parameter
      const cacheBust = req.query._t || req.query.timestamp;
      let products = cacheBust ? null : cache.get(cacheKey);
      
      if (!products) {
        console.log(`📦 [GET /api/products] Cache miss${cacheBust ? ' (cache bust)' : ''}, fetching from DB`);
        const allProducts = await storage.getProducts();
        console.log(`📦 [GET /api/products] Got ${allProducts.length} total products from DB`);
        
        // FIXED: Log product IDs for debugging
        if (allProducts.length > 0) {
          console.log(`📦 [GET /api/products] Product IDs:`, allProducts.map((p: any) => ({ id: p.id, name: p.name, isActive: p.isActive })));
          
          // FIXED: Check for expected products (nu-100, nu-200, nu-30)
          const expectedIds = ['nu-100', 'nu-200', 'nu-30'];
          const foundIds = allProducts.map((p: any) => p.id);
          const missingIds = expectedIds.filter(id => !foundIds.includes(id));
          if (missingIds.length > 0) {
            console.warn(`⚠️ [GET /api/products] Missing expected products: ${missingIds.join(', ')}`);
            console.warn(`⚠️ [GET /api/products] Found products: ${foundIds.join(', ')}`);
          }
        } else {
          console.warn(`⚠️ [GET /api/products] No products found in database! Check if initAdmin was run.`);
        }
        
        products = allProducts.filter((p: any) => p && p.isActive !== false).map((p: any) => {
          let parsedImages: string[] = [];
          
          try {
            if (p.images) {
              if (typeof p.images === 'string') {
                const trimmed = p.images.trim();
                if (trimmed) {
                  // Try to parse as JSON
                  if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      parsedImages = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (parseError) {
                      // If JSON parse fails, treat as single URL
                      parsedImages = [trimmed];
                    }
                  } else {
                    // Single image URL
                    parsedImages = [trimmed];
                  }
                }
              } else if (Array.isArray(p.images)) {
                parsedImages = p.images;
              }
              
              // Validate and sanitize image URLs
              parsedImages = parsedImages
                .filter((img: any) => {
                  if (img === null || img === undefined) return false;
                  const str = String(img).trim();
                  // Basic URL validation - must be non-empty and start with valid prefix
                  return str.length > 0 && (str.startsWith('http') || str.startsWith('data:') || str.startsWith('/'));
                })
                .map((img: any) => String(img).trim());
            }
            
            // FIXED: Also include imageUrl in images array if it's set and not already included
            if (p.imageUrl && typeof p.imageUrl === 'string') {
              const trimmedImageUrl = p.imageUrl.trim();
              if (trimmedImageUrl.length > 0 && 
                  (trimmedImageUrl.startsWith('http') || trimmedImageUrl.startsWith('data:') || trimmedImageUrl.startsWith('/')) &&
                  !parsedImages.includes(trimmedImageUrl)) {
                // Add imageUrl at the beginning as the main image
                parsedImages.unshift(trimmedImageUrl);
              }
            }
          } catch (e) {
            // Fail gracefully - log error but continue
            console.error(`❌ [GET /api/products] Error parsing images for product ${p.id}:`, e);
            parsedImages = [];
          }
          
          // Return product with validated images array
          return {
            ...p,
            images: parsedImages
          };
        });
        
        console.log(`✅ [GET /api/products] Parsed ${products.length} active products, setting cache`);
        
        // FIXED: Warn if no active products found
        if (products.length === 0 && allProducts.length > 0) {
          console.warn(`⚠️ [GET /api/products] No active products found! All ${allProducts.length} products are inactive.`);
        } else if (products.length === 0) {
          console.error(`❌ [GET /api/products] No products in database! Run initAdmin to create default products.`);
        }
        
        if (!cacheBust) {
          cache.set(cacheKey, products, CACHE_TTL.PRODUCTS);
        }
      } else {
        console.log(`⚡ [GET /api/products] Using cached products (${products.length} items)`);
      }
      
      // Ensure products is always an array before sending
      const safeProducts = Array.isArray(products) ? products : [];
      
      // Log images for debugging
      safeProducts.forEach((p: any) => {
        if (p.images && p.images.length > 0) {
          console.log(`🖼️ [GET /api/products] Product ${p.id} has ${p.images.length} images`);
        }
      });
      
      // Set proper headers - no-cache to ensure fresh data with images
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(safeProducts);
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении товаров",
      });
    }
  });

  // Admin: Get all products (including inactive)
  app.get("/api/admin/products", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const products = await storage.getProducts();
      const parsedProducts = products.map((p: any) => ({
        ...p,
        images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : []
      }));
      res.json({ success: true, products: parsedProducts });
    } catch (error) {
      console.error("Error fetching all products:", error);
      res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
  });

  // PUBLIC: Get product images (no auth required) - for gallery display
  // IMPORTANT: This route MUST be defined BEFORE /api/products/:id to avoid route conflicts
  // This endpoint is specifically designed for anonymous/public access to product images
  app.get("/api/products/:id/images", rateLimiters.general, async (req, res) => {
    const productId = req.params.id;
    const requestId = Math.random().toString(36).substring(7);
    const cacheKey = `product-images-${productId}`;
    const cacheBust = req.query._t || req.query.timestamp;
    
    console.log(`🖼️ [${requestId}] GET /api/products/${productId}/images - PUBLIC request`);
    
    try {
      // Check cache first (unless cache bust requested)
      if (!cacheBust) {
        const cachedImages = cache.get(cacheKey);
        if (cachedImages) {
          console.log(`⚡ [${requestId}] Using cached images for ${productId}`);
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Cache', 'HIT');
          res.json({ success: true, images: cachedImages });
          return;
        }
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        console.log(`❌ [${requestId}] Product not found: ${productId}`);
        res.status(404).json({ success: false, message: "Товар не найден", images: [] });
        return;
      }
      
      console.log(`📦 [${requestId}] Product found: ${product.name}, isActive: ${product.isActive}`);
      
      // Parse images - robust handling of different formats
      let parsedImages: string[] = [];
      
      if (product.images) {
        console.log(`📷 [${requestId}] Raw images field type: ${typeof product.images}`);
        
        if (typeof product.images === 'string') {
          const trimmed = product.images.trim();
          if (trimmed.length > 0) {
            // Try to parse as JSON array
            if (trimmed.startsWith('[')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                  parsedImages = parsed;
                  console.log(`✅ [${requestId}] Parsed JSON array with ${parsed.length} images`);
                }
              } catch (e) {
                // Not valid JSON, treat as single URL
                parsedImages = [trimmed];
                console.log(`⚠️ [${requestId}] JSON parse failed, treating as single URL`);
              }
            } else {
              // Single image URL
              parsedImages = [trimmed];
              console.log(`📷 [${requestId}] Single image URL detected`);
            }
          }
        } else if (Array.isArray(product.images)) {
          parsedImages = product.images;
          console.log(`✅ [${requestId}] Images already array with ${parsedImages.length} items`);
        }
      } else {
        console.log(`📷 [${requestId}] No images field in product`);
      }
      
      // Include imageUrl at the beginning if not already present
      if (product.imageUrl && typeof product.imageUrl === 'string') {
        const mainImg = product.imageUrl.trim();
        if (mainImg.length > 0 && !parsedImages.includes(mainImg)) {
          parsedImages.unshift(mainImg);
          console.log(`➕ [${requestId}] Added imageUrl to beginning`);
        }
      }
      
      // Filter and validate image URLs
      const validImages = parsedImages.filter(img => {
        if (!img || typeof img !== 'string') return false;
        const s = img.trim();
        // Must be non-empty and start with valid prefix
        const isValid = s.length > 0 && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('/'));
        if (!isValid && s.length > 0) {
          console.log(`⚠️ [${requestId}] Skipping invalid image URL: ${s.substring(0, 50)}...`);
        }
        return isValid;
      }).map(img => img.trim());
      
      console.log(`✅ [${requestId}] Returning ${validImages.length} valid images for product ${productId}`);
      
      // Cache the result for 5 minutes (images don't change often)
      if (!cacheBust && validImages.length > 0) {
        cache.set(cacheKey, validImages, 5 * 60 * 1000); // 5 minutes
      }
      
      // Set appropriate cache headers for public images
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'MISS');
      
      res.json({ success: true, images: validImages });
    } catch (error) {
      console.error(`❌ [${requestId}] Error fetching product images:`, error);
      res.status(500).json({ success: false, message: "Ошибка при получении изображений", images: [] });
    }
  });

  // PUBLIC: Get single product by ID
  app.get("/api/products/:id", rateLimiters.general, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Товар не найден",
        });
        return;
      }
      
      // Parse images correctly
      let parsedImages: string[] = [];
      try {
        if (product.images) {
          if (typeof product.images === 'string') {
            const trimmed = product.images.trim();
            if (trimmed.startsWith('[')) {
              parsedImages = JSON.parse(trimmed);
            } else if (trimmed.length > 0) {
              parsedImages = [trimmed];
            }
          } else if (Array.isArray(product.images)) {
            parsedImages = product.images;
          }
        }
        
        // Also include imageUrl if set
        if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim()) {
          const trimmedUrl = product.imageUrl.trim();
          if (!parsedImages.includes(trimmedUrl)) {
            parsedImages.unshift(trimmedUrl);
          }
        }
      } catch (e) {
        console.error(`Error parsing images for product ${req.params.id}:`, e);
        parsedImages = [];
      }
      
      const parsedProduct = {
        ...product,
        images: parsedImages
      };
      
      res.json(parsedProduct);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении товара",
      });
    }
  });

  // FIXED: Added rate limiting and CSRF protection for promo validation
  app.post("/api/promo/validate", csrfProtection, rateLimiters.promo, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: "Промокод не указан",
        });
        return;
      }
      
      // FIXED: Sanitize input (trim whitespace, but don't change case)
      const sanitizedCode = code.trim().toUpperCase();
      
      console.log(`🔍 [validatePromo] Validating code: "${sanitizedCode}"`);
      
      const promo = await storage.validatePromoCode(sanitizedCode);
      
      if (!promo || !promo.valid) {
        console.log(`❌ [validatePromo] Code "${sanitizedCode}" is invalid`);
        res.status(404).json({
          success: false,
          message: "Промокод недействителен или истек",
        });
        return;
      }
      
      console.log(`✅ [validatePromo] Code "${sanitizedCode}" is valid, discount: ${promo.discountPercent}%`);
      
      res.json({
        success: true,
        promoCode: {
          code: promo.code,
          discountPercent: promo.discountPercent,
        },
        discountPercent: promo.discountPercent,
        code: promo.code,
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при проверке промокода",
      });
    }
  });

  // FIXED: Added CSRF protection, rate limiting and XSS protection
  app.post("/api/orders", csrfProtection, rateLimiters.orders, async (req, res) => {
    try {
      // FIXED: Require authentication for orders
      const token = req.headers.authorization?.replace("Bearer ", "");
      let userId: string | null = null;
      
      if (token) {
        try {
          const payload = verifyAccessToken(token);
          if (payload) {
            userId = payload.userId;
          }
        } catch (e) {
          // Token invalid, userId stays null
        }
      }
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Для оформления заказов необходимо авторизоваться",
        });
        return;
      }
      
      const validatedData = insertOrderSchema.parse(req.body);
      
      // FIXED: Add userId to order
      const orderDataWithUserId = {
        ...validatedData,
        userId,
      };
      
      const product = await storage.getProduct(orderDataWithUserId.productId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Товар не найден",
        });
        return;
      }

      // FIXED: Check if enough stock available
      if (product.stock < orderDataWithUserId.quantity) {
        res.status(400).json({
          success: false,
          message: `Недостаточно товара на складе. Доступно: ${product.stock} шт.`,
        });
        return;
      }

      // FIXED: Use UTC for consistent timezone handling
      const reservedUntil = new Date();
      reservedUntil.setUTCMinutes(reservedUntil.getUTCMinutes() + 15);

      const orderData = {
        ...orderDataWithUserId,
        reservedUntil,
      };

      const order = await storage.createOrder(orderData);
      
      // Clear cache after order to show updated stock
      cache.delete('products');
      cache.delete('products-active');
      
      // FIXED: Refresh product data after order creation to get updated stock
      const updatedProduct = await storage.getProduct(orderDataWithUserId.productId);
      
      // FIXED: Send notification to admins if product is out of stock
      if (updatedProduct && updatedProduct.stock === 0) {
        const outOfStockHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; background: #fff3cd; padding: 20px; border-radius: 5px;">
            <h2 style="color: #d0461e; border-bottom: 2px solid #d0461e; padding-bottom: 10px;">⚠️ ТОВАР ПОЛНОСТЬЮ РАСПРОДАН</h2>
            
            <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #d0461e;">
              <p style="margin: 5px 0;"><strong>Наименование товара:</strong> ${escapeHtml(updatedProduct.name)}</p>
              <p style="margin: 5px 0;"><strong>Артикул:</strong> ${escapeHtml(updatedProduct.sku)}</p>
              <p style="margin: 5px 0;"><strong>Модель:</strong> ${escapeHtml(updatedProduct.id)}</p>
            </div>
            
            <p style="margin: 15px 0; color: #666;">Товар был полностью распродан в результате заказа <strong>#${escapeHtml(order.id)}</strong></p>
            
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              Рекомендуется пополнить запасы или отметить товар как неактивный в админ-панели.
            </p>
          </div>
        `;
        
        sendEmail(OWNER_EMAIL, `⚠️ ТОВАР ЗАКОНЧИЛСЯ: ${escapeHtml(updatedProduct.name)} (${escapeHtml(updatedProduct.sku)})`, outOfStockHtml).catch(err => {
          console.error("Failed to send out of stock email:", err);
        });
      }

      // FIXED: XSS protection - escape all user input in email with beautiful HTML template
      const ownerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🛒 Новый заказ</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- ID заказа -->
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
                <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Номер заказа</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #333; font-family: monospace;">#${escapeHtml(order.id)}</p>
              </div>
              
              <!-- Контактные данные -->
              <h3 style="color: #333; margin-top: 25px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">👤 Контактные данные клиента</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666; width: 150px;"><strong>Имя:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">${escapeHtml(order.customerName || 'Не указано')}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">
                    ${order.customerEmail ? `<a href="mailto:${escapeHtml(order.customerEmail)}" style="color: #4CAF50; text-decoration: none;">${escapeHtml(order.customerEmail)}</a>` : 'Не указано'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666;"><strong>Телефон:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">
                    ${order.customerPhone ? `<a href="tel:${escapeHtml(order.customerPhone)}" style="color: #4CAF50; text-decoration: none;">${escapeHtml(order.customerPhone)}</a>` : 'Не указано'}
                  </td>
                </tr>
              </table>
              
              <!-- Детали заказа -->
              <h3 style="color: #333; margin-top: 25px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">📦 Детали заказа</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f0f0f0;">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Параметр</td>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Значение</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Товар</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333; font-weight: bold;">${escapeHtml(product.name)}</td>
                </tr>
                <tr style="background: #fafafa;">
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Артикул</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${escapeHtml(product.sku)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Количество</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${order.quantity} шт.</td>
                </tr>
                <tr style="background: #fafafa;">
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Сумма</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333; font-size: 18px; font-weight: bold; color: #4CAF50;">${escapeHtml(order.finalAmount)} ₽</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Способ оплаты</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${escapeHtml(order.paymentMethod)}</td>
                </tr>
                <tr style="background: #fafafa;">
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Статус</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333;">
                    <span style="background: ${order.paymentStatus === 'paid' ? '#4CAF50' : order.paymentStatus === 'pending' ? '#ff9800' : '#f44336'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${escapeHtml(order.paymentStatus)}
                    </span>
                  </td>
                </tr>
                ${order.reservedUntil ? `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #666;">Резервация до</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${new Date(order.reservedUntil).toLocaleString('ru-RU')}</td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                <p style="margin: 0;">Это автоматическое уведомление. Пожалуйста, свяжитесь с клиентом по предоставленным контактным данным.</p>
                <p style="margin: 5px 0 0 0;">Дата заказа: ${new Date(order.createdAt).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email asynchronously
      sendEmail(OWNER_EMAIL, `Новый заказ #${escapeHtml(order.id)}`, ownerEmailHtml).catch(err => {
        console.error("Failed to send email:", err);
      });
      
      res.status(201).json({
        success: true,
        message: "Заказ успешно создан",
        order,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Ошибка валидации данных",
          errors: error.errors,
        });
      } else {
        console.error("Error creating order:", error);
        res.status(500).json({
          success: false,
          message: "Произошла ошибка при создании заказа",
        });
      }
    }
  });

  // Get user orders (must be BEFORE /api/orders/:id)
  app.get("/api/orders/user", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const orders = await storage.getUserOrders(payload.userId);
      const ordersWithProducts = await Promise.all(
        orders.map(async (o: any) => ({
          ...o,
          product: await storage.getProduct(o.productId),
        }))
      );

      res.json(ordersWithProducts);
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ success: false, message: "Failed to get orders" });
    }
  });

  // Admin: Get all orders (must be BEFORE /api/orders/:id)
  app.get("/api/admin/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const orders = await storage.getAllOrders();
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get admin orders error:", error);
      res.status(500).json({ success: false, message: "Failed to get orders" });
    }
  });

  // SECURITY FIX: Added authentication and ownership check
  app.get("/api/orders/:id", rateLimiters.general, async (req, res) => {
    try {
      // Require authentication
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Требуется авторизация" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Недействительный токен" });
        return;
      }

      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Заказ не найден",
        });
        return;
      }
      
      // SECURITY: Check if user owns this order or is admin
      const user = await storage.getUserById(payload.userId);
      if (!user) {
        res.status(401).json({ success: false, message: "Пользователь не найден" });
        return;
      }

      const isOwner = order.userId === payload.userId;
      const isAdmin = user.role === "admin" || user.role === "superadmin";
      
      if (!isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          message: "Нет доступа к этому заказу",
        });
        return;
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении заказа",
      });
    }
  });

  // SECURITY FIX: Added admin-only authorization
  app.patch("/api/orders/:id/status", rateLimiters.general, async (req, res) => {
    try {
      // Require authentication
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Требуется авторизация" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Недействительный токен" });
        return;
      }

      // SECURITY: Only admins can change order status
      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Недостаточно прав для изменения статуса" });
        return;
      }

      const { status, paymentDetails } = req.body;
      
      if (!status || typeof status !== 'string') {
        res.status(400).json({
          success: false,
          message: "Статус не указан",
        });
        return;
      }

      // FIXED: Sanitize input
      const sanitizedStatus = sanitizeInput(status, 50);
      const sanitizedPaymentDetails = paymentDetails ? sanitizeInput(paymentDetails, 1000) : undefined;

      const order = await storage.updateOrderStatus(req.params.id, sanitizedStatus, sanitizedPaymentDetails);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Заказ не найден",
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Статус заказа обновлен",
        order,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при обновлении статуса заказа",
      });
    }
  });


  // Auth endpoints
  app.post("/api/auth/register", csrfProtection, rateLimiters.general, async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ success: false, message: "Email and password required" });
        return;
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ success: false, message: "User already exists" });
        return;
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: "user",
      });

      // Save personal data consent (152-ФЗ compliance)
      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';
      const userAgent = req.headers['user-agent'] || null;
      
      try {
        await storage.createPersonalDataConsent({
          userId: user.id,
          consentType: "registration",
          isConsented: true,
          consentText: "Согласен на обработку персональных данных и с политикой обработки персональных данных",
          ipAddress: clientIp,
          userAgent: userAgent,
        });
      } catch (consentError) {
        console.error("Error saving consent:", consentError);
        // Don't fail registration if consent saving fails
      }

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        message: "User registered successfully",
        user: { id: user.id, email: user.email, role: user.role },
        tokens: { accessToken, refreshToken },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ success: false, message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", csrfProtection, rateLimiters.general, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: "Email and password required" });
        return;
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      // Check if user is blocked
      if (user.isBlocked) {
        res.status(403).json({ 
          success: false, 
          message: "Ваш аккаунт заблокирован. Обратитесь в поддержку." 
        });
        return;
      }

      const passwordHash = user.passwordHash || user.password;
      const isPasswordValid = await verifyPassword(password, passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        message: "Login successful",
        user: { id: user.id, email: user.email, role: user.role },
        tokens: { accessToken, refreshToken },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "No token" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified || false,
          isPhoneVerified: user.isPhoneVerified || false,
          createdAt: user.createdAt || new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Auth me error:", error);
      res.status(500).json({ success: false, message: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", rateLimiters.general, (req, res) => {
    res.json({ success: true, message: "Logged out" });
  });

  // Profile update endpoint
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const { firstName, lastName, phone } = req.body;
      
      // Update user in storage
      const updatedUser = await storage.updateUser(payload.userId, { firstName, lastName, phone });
      
      if (!updatedUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          isEmailVerified: updatedUser.isEmailVerified || false,
          isPhoneVerified: updatedUser.isPhoneVerified || false,
          createdAt: updatedUser.createdAt || new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ success: false, message: "Failed to update profile" });
    }
  });


  // Admin: Update product stock
  app.patch("/api/admin/products/:id/stock", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const product = await storage.getProduct(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      const { stock } = req.body;
      if (typeof stock !== "number") {
        res.status(400).json({ success: false, message: "Invalid stock value" });
        return;
      }

      product.stock = stock;

      // Clear products cache to ensure updated stock is immediately available
      cache.delete('products');
      cache.delete('products-active');

      res.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error("Update stock error:", error);
      res.status(500).json({ success: false, message: "Failed to update stock" });
    }
  });

  // Admin: Delete products - REMOVED: Duplicate endpoint, using the one below at line 2021

  // Admin: Update order status
  app.patch("/api/admin/orders/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { paymentStatus } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, paymentStatus);
      
      if (!order) {
        res.status(404).json({ success: false, message: "Order not found" });
        return;
      }

      // Send notification and email to user if order status changed
      if (order.userId) {
        const orderUser = await storage.getUserById(order.userId);
        if (orderUser) {
          const statusMessages: Record<string, string> = {
            pending: "Ожидает оплаты",
            paid: "Оплачен",
            processing: "В обработке",
            shipped: "Отправлен",
            delivered: "Доставлен",
            cancelled: "Отменен",
          };

          const statusMessage = statusMessages[paymentStatus] || paymentStatus;
          const notification = await storage.sendNotificationToUser(order.userId, {
            title: "Статус заказа изменен",
            message: `Статус вашего заказа #${order.id.slice(0, 8)} изменен на: ${statusMessage}`,
            type: paymentStatus === "cancelled" ? "error" : paymentStatus === "delivered" ? "success" : "info",
            link: `/profile`,
          });

          // Send email notification
          if (orderUser.email) {
            const statusColor = paymentStatus === "paid" ? "#4CAF50" : paymentStatus === "cancelled" ? "#f44336" : "#ff9800";
            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">📦 Статус заказа изменен</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid ${statusColor};">
                      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Номер заказа</p>
                      <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #333; font-family: monospace;">#${escapeHtml(order.id.slice(0, 8))}</p>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; border: 2px solid ${statusColor};">
                      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Новый статус:</p>
                      <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${statusColor};">
                        ${escapeHtml(statusMessage)}
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0; line-height: 1.6; color: #333;">
                      Вы можете просмотреть детали заказа в своем профиле на сайте.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/profile" 
                         style="display: inline-block; background: ${statusColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Перейти в профиль →
                      </a>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                      <p style="margin: 0;">Это автоматическое уведомление</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `;
            sendEmail(orderUser.email, `Статус заказа #${order.id.slice(0, 8)} изменен`, emailHtml).catch(err => {
              console.error("Failed to send order status email:", err);
            });
          }
        }
      }
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ success: false, message: "Failed to update order" });
    }
  });

  // Add to favorites
  app.post("/api/favorites", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const { productId } = req.body;
      const favorite = await storage.addToFavorites(payload.userId, productId);

      if (!favorite) {
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      res.json({ success: true, favorite });
    } catch (error) {
      console.error("Add to favorites error:", error);
      res.status(500).json({ success: false, message: "Failed to add to favorites" });
    }
  });

  // Get user favorites
  app.get("/api/favorites", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const favorites = await storage.getUserFavorites(payload.userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ success: false, message: "Failed to get favorites" });
    }
  });

  // Remove from favorites
  app.delete("/api/favorites/:productId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const deleted = await storage.removeFavorite(payload.userId, req.params.productId);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ success: false, message: "Failed to remove favorite" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const notifications = await storage.getAllNotifications(payload.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ success: false, message: "Failed to get notifications" });
    }
  });

  // Delete notification - SECURITY FIX: Added ownership check
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      // SECURITY: Check if notification belongs to user
      const notification = await storage.getNotificationById(req.params.id);
      if (!notification) {
        res.status(404).json({ success: false, message: "Notification not found" });
        return;
      }

      if (notification.userId !== payload.userId) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const deleted = await storage.deleteNotification(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ success: false, message: "Failed to delete notification" });
    }
  });

  // Clear all notifications
  app.post("/api/notifications/clear", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      await storage.clearUserNotifications(payload.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear notifications error:", error);
      res.status(500).json({ success: false, message: "Failed to clear notifications" });
    }
  });

  // Admin: Get user by ID with orders
  app.get("/api/admin/users/:userId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const admin = await storage.getUserById(payload.userId);
      if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const user = await storage.getUserById(req.params.userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const orders = await storage.getUserOrders(req.params.userId);
      res.json({ user, orders });
    } catch (error) {
      console.error("Get user details error:", error);
      res.status(500).json({ success: false, message: "Failed to get user details" });
    }
  });

  // Admin: Get order details
  app.get("/api/admin/orders/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, message: "Order not found" });
        return;
      }

      const product = await storage.getProduct(order.productId);
      const orderUser = order.userId ? await storage.getUserById(order.userId) : null;

      res.json({ order, product, user: orderUser });
    } catch (error) {
      console.error("Get order details error:", error);
      res.status(500).json({ success: false, message: "Failed to get order details" });
    }
  });

  // Admin: Update product price
  app.patch("/api/admin/products/:id/price", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const product = await storage.updateProductPrice(req.params.id, req.body.price);
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      // Clear products cache to ensure updated price is immediately available
      cache.delete('products');
      cache.delete('products-active');

      res.json({ success: true, product });
    } catch (error) {
      console.error("Update price error:", error);
      res.status(500).json({ success: false, message: "Failed to update price" });
    }
  });

  // Admin: Update product info
  app.patch("/api/admin/products/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      console.log(`📝 [PATCH /api/admin/products/${req.params.id}] Updating product with:`, JSON.stringify(req.body, null, 2));

      const product = await storage.updateProductInfo(req.params.id, req.body);
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      // Clear product caches to ensure fresh data for all users
      cache.delete('products');
      cache.delete('products-active');
      cache.delete(`product-images-${req.params.id}`);

      // Parse images to return as array
      let parsedImages: string[] = [];
      try {
        if (product.images) {
          if (typeof product.images === 'string') {
            parsedImages = JSON.parse(product.images);
          } else if (Array.isArray(product.images)) {
            parsedImages = product.images;
          }
        }
      } catch (e) {
        console.error(`Error parsing images for updated product:`, e);
        parsedImages = [];
      }

      const productWithParsedImages = {
        ...product,
        images: parsedImages
      };

      console.log(`✅ [PATCH /api/admin/products/${req.params.id}] Product updated, returning ${parsedImages.length} images`);

      res.json({ success: true, product: productWithParsedImages });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ success: false, message: "Failed to update product" });
    }
  });

  // Admin: Get admin dashboard stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const orders = await storage.getAllOrders();
      const contacts = await storage.getContactSubmissions();
      const allUsers = await storage.getAllUsers();
      
      // Ensure allUsers is an array
      const usersArray = Array.isArray(allUsers) ? allUsers : [];
      
      // Calculate user activity by day (last 30 days)
      const days = 30;
      const userActivityByDay: { date: string; registrations: number; logins: number }[] = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Count registrations for this day
        const registrations = usersArray.filter((u: any) => {
          if (!u || !u.createdAt) return false;
          try {
            const userDate = new Date(u.createdAt).toISOString().split('T')[0];
            return userDate === dateStr;
          } catch {
            return false;
          }
        }).length;
        
        // Count logins for this day (users who logged in on this day)
        const logins = usersArray.filter((u: any) => {
          if (!u || !u.lastLoginAt) return false;
          try {
            const loginDate = new Date(u.lastLoginAt).toISOString().split('T')[0];
            return loginDate === dateStr;
          } catch {
            return false;
          }
        }).length;
        
        userActivityByDay.push({ date: dateStr, registrations, logins });
      }
      
      // Ensure orders and contacts are arrays
      const ordersArray = Array.isArray(orders) ? orders : [];
      const contactsArray = Array.isArray(contacts) ? contacts : [];
      
      // Calculate totals
      const totalRevenue = ordersArray
        .filter((o: any) => o && (o.paymentStatus === 'completed' || o.paymentStatus === 'paid'))
        .reduce((sum: number, o: any) => {
          const amount = o?.finalAmount || 0;
          const parsed = typeof amount === 'string' 
            ? parseFloat(amount.replace(/[^\d.-]/g, '')) || 0
            : parseFloat(String(amount)) || 0;
          return sum + parsed;
        }, 0);
      
      res.json({
        success: true,
        stats: {
          totalUsers: usersArray.length,
          totalOrders: ordersArray.length,
          totalContacts: contactsArray.length,
          pendingOrders: ordersArray.filter((o: any) => o && o.paymentStatus === 'pending').length,
          completedOrders: ordersArray.filter((o: any) => o && (o.paymentStatus === 'completed' || o.paymentStatus === 'paid')).length,
          totalRevenue: totalRevenue,
          activePromoCodes: (await storage.getPromoCodes()).filter((p: any) => p && p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date())).length,
          userActivityByDay: userActivityByDay,
        }
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
  });

  // ADMIN: Create Product
  app.post("/api/admin/products", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const product = await storage.createProduct(req.body);
      
      // Clear products cache to ensure new product is immediately available
      cache.delete('products');
      cache.delete('products-active');
      console.log(`✅ [POST /api/admin/products] Product ${product.id} created, cache cleared`);
      
      res.status(201).json({ success: true, product });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ success: false, message: "Failed to create product" });
    }
  });

  // ADMIN: Delete Products
  app.delete("/api/admin/products", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ success: false, message: "Invalid product IDs" });
        return;
      }

      const deleted = await storage.deleteProducts(ids);
      
      // Clear products cache to ensure deleted products are immediately removed
      cache.delete('products');
      cache.delete('products-active');
      console.log(`✅ [DELETE /api/admin/products] Deleted ${deleted} products, cache cleared`);
      
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Delete products error:", error);
      res.status(500).json({ success: false, message: "Failed to delete products" });
    }
  });

  // ADMIN: Get All Users
  app.get("/api/admin/users", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const users = await storage.getAllUsers();
      res.json({ success: true, users });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ success: false, message: "Failed to get users" });
    }
  });

  // ADMIN: Get User by ID
  app.get("/api/admin/users/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const targetUser = await storage.getUserById(req.params.id);
      if (!targetUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.json({ success: true, user: targetUser });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ success: false, message: "Failed to get user" });
    }
  });

  // ADMIN: Update User Role
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || user.role !== "superadmin") {
        res.status(403).json({ success: false, message: "Only superadmin can change roles" });
        return;
      }

      const { role } = req.body;
      if (!["user", "moderator", "admin", "superadmin"].includes(role)) {
        res.status(400).json({ success: false, message: "Invalid role" });
        return;
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      if (!updatedUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ success: false, message: "Failed to update role" });
    }
  });

  // ADMIN: Block/Unblock User
  app.patch("/api/admin/users/:id/block", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { blocked } = req.body;
      const updatedUser = await storage.blockUser(req.params.id, blocked);
      if (!updatedUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ success: false, message: "Failed to block user" });
    }
  });

  // USER: Delete Own Account
  app.delete("/api/auth/account", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      // Prevent deletion of admin accounts
      if (user.role === "admin" || user.role === "superadmin") {
        res.status(403).json({ success: false, message: "Admin accounts cannot be deleted" });
        return;
      }

      const deleted = await storage.deleteUser(payload.userId);
      if (!deleted) {
        res.status(500).json({ success: false, message: "Failed to delete account" });
        return;
      }

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ success: false, message: "Failed to delete account" });
    }
  });

  // ADMIN: Delete User
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || user.role !== "superadmin") {
        res.status(403).json({ success: false, message: "Only superadmin can delete users" });
        return;
      }

      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.json({ success: true, message: "User deleted" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ success: false, message: "Failed to delete user" });
    }
  });

  // ADMIN: Get User Orders
  app.get("/api/admin/users/:id/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const orders = await storage.getUserOrders(req.params.id);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ success: false, message: "Failed to get orders" });
    }
  });

  // ADMIN: Create Admin User
  app.post("/api/admin/admins", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || user.role !== "superadmin") {
        res.status(403).json({ success: false, message: "Only superadmin can create admins" });
        return;
      }

      const { email, password, role, firstName, lastName } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ success: false, message: "Email and password required" });
        return;
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ success: false, message: "User already exists" });
        return;
      }

      const hashedPassword = await hashPassword(password);
      const newAdmin = await storage.createUser({
        email,
        password: hashedPassword,
        role: role || "admin",
        firstName: firstName || null,
        lastName: lastName || null,
      });

      res.status(201).json({ success: true, admin: newAdmin });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ success: false, message: "Failed to create admin" });
    }
  });

  // ADMIN: Get Contact Submissions
  app.get("/api/admin/contacts", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const contacts = await storage.getContactSubmissions();
      res.json({ success: true, contacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ success: false, message: "Failed to get contacts" });
    }
  });

  // ADMIN: Delete Contact Submission
  app.delete("/api/admin/contacts/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const deleted = await storage.deleteContactSubmission(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, message: "Contact submission not found" });
        return;
      }

      res.json({ success: true, message: "Contact submission deleted" });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ success: false, message: "Failed to delete contact" });
    }
  });

  // ADMIN: Get Promo Codes
  app.get("/api/admin/promocodes", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const promoCodes = await storage.getPromoCodes();
      res.json({ success: true, promoCodes });
    } catch (error) {
      console.error("Get promo codes error:", error);
      res.status(500).json({ success: false, message: "Failed to get promo codes" });
    }
  });

  // ADMIN: Create Promo Code
  app.post("/api/admin/promocodes", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const promoCode = await storage.createPromoCode(req.body);
      res.status(201).json({ success: true, promoCode });
    } catch (error) {
      console.error("Create promo code error:", error);
      res.status(500).json({ success: false, message: "Failed to create promo code" });
    }
  });

  // ADMIN: Update Promo Code
  app.patch("/api/admin/promocodes/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const promoCode = await storage.updatePromoCode(req.params.id, req.body);
      if (!promoCode) {
        res.status(404).json({ success: false, message: "Promo code not found" });
        return;
      }

      res.json({ success: true, promoCode });
    } catch (error) {
      console.error("Update promo code error:", error);
      res.status(500).json({ success: false, message: "Failed to update promo code" });
    }
  });

  // ADMIN: Delete Promo Code
  app.delete("/api/admin/promocodes/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const deleted = await storage.deletePromoCode(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, message: "Promo code not found" });
        return;
      }

      res.json({ success: true, message: "Promo code deleted" });
    } catch (error) {
      console.error("Delete promo code error:", error);
      res.status(500).json({ success: false, message: "Failed to delete promo code" });
    }
  });

  // PUBLIC: Get Site Settings (for displaying contact info)
  app.get("/api/settings", rateLimiters.general, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      // Return only public settings (contact info, site title, and file upload setting)
      const publicSettings = settings.filter((s: any) => 
        ['contact_email', 'contact_phone', 'contact_address', 'contact_telegram', 'site_title', 'enable_file_upload'].includes(s.key)
      );
      res.json({ success: true, settings: publicSettings });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ success: false, message: "Failed to get settings" });
    }
  });

  // ADMIN: Get Site Settings
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const settings = await storage.getSiteSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ success: false, message: "Failed to get settings" });
    }
  });

  // ADMIN: Update Site Setting
  app.put("/api/admin/settings/:key", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { value, type, description } = req.body;
      // FIXED: Pass userId explicitly to avoid null reference error
      const setting = await storage.setSiteSetting(req.params.key, value, type, description, payload.userId);
      res.json({ success: true, setting });
    } catch (error) {
      console.error("Update setting error:", error);
      res.status(500).json({ success: false, message: "Failed to update setting" });
    }
  });

  // PUBLIC: Get Site Content (for displaying dynamic content)
  app.get("/api/content", rateLimiters.general, async (req, res) => {
    try {
      const content = await storage.getAllSiteContent();
      // Return only active content
      const activeContent = content.filter((c: any) => c.isActive !== false);
      res.json({ success: true, content: activeContent });
    } catch (error) {
      console.error("Get content error:", error);
      res.status(500).json({ success: false, message: "Failed to get content" });
    }
  });

  // ADMIN: Get Site Content
  app.get("/api/admin/content", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const content = await storage.getAllSiteContent();
      res.json({ success: true, content });
    } catch (error) {
      console.error("Get content error:", error);
      res.status(500).json({ success: false, message: "Failed to get content" });
    }
  });

  // ADMIN: Get Site Content by Key
  app.get("/api/admin/content/:key", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const content = await storage.getSiteContent(req.params.key);
      if (!content) {
        res.status(404).json({ success: false, message: "Content not found" });
        return;
      }

      res.json({ success: true, content });
    } catch (error) {
      console.error("Get content error:", error);
      res.status(500).json({ success: false, message: "Failed to get content" });
    }
  });

  // ADMIN: Update Site Content
  app.put("/api/admin/content/:key", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { value, page, section } = req.body;
      const existing = await storage.getSiteContent(req.params.key);
      if (!existing) {
        await storage.createSiteContent({ key: req.params.key, value, page, section });
        res.json({ success: true, message: "Content created" });
        return;
      }

      const content = await storage.updateSiteContent(req.params.key, { value, page, section });
      res.json({ success: true, content });
    } catch (error) {
      console.error("Update content error:", error);
      res.status(500).json({ success: false, message: "Failed to update content" });
    }
  });

  // ADMIN: Delete Site Content
  app.delete("/api/admin/content/:key", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      await storage.deleteSiteContent(req.params.key);
      res.json({ success: true, message: "Content deleted" });
    } catch (error) {
      console.error("Delete content error:", error);
      res.status(500).json({ success: false, message: "Failed to delete content" });
    }
  });

  // ADMIN: Get Site Contacts
  app.get("/api/admin/site-contacts", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const contacts = await storage.getAllSiteContacts();
      res.json({ success: true, contacts });
    } catch (error) {
      console.error("Get site contacts error:", error);
      res.status(500).json({ success: false, message: "Failed to get site contacts" });
    }
  });

  // ADMIN: Create Site Contact
  app.post("/api/admin/site-contacts", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { type, value, label, order } = req.body;
      const contact = await storage.createSiteContact({ type, value, label, order });
      res.json({ success: true, contact });
    } catch (error) {
      console.error("Create site contact error:", error);
      res.status(500).json({ success: false, message: "Failed to create site contact" });
    }
  });

  // ADMIN: Update Site Contact
  app.put("/api/admin/site-contacts/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const contact = await storage.updateSiteContact(req.params.id, req.body);
      res.json({ success: true, contact });
    } catch (error) {
      console.error("Update site contact error:", error);
      res.status(500).json({ success: false, message: "Failed to update site contact" });
    }
  });

  // ADMIN: Delete Site Contact
  app.delete("/api/admin/site-contacts/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      await storage.deleteSiteContact(req.params.id);
      res.json({ success: true, message: "Site contact deleted" });
    } catch (error) {
      console.error("Delete site contact error:", error);
      res.status(500).json({ success: false, message: "Failed to delete site contact" });
    }
  });

  // ADMIN: Get Cookie Settings
  app.get("/api/admin/cookie-settings", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const settings = await storage.getCookieSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Get cookie settings error:", error);
      res.status(500).json({ success: false, message: "Failed to get cookie settings" });
    }
  });

  // ADMIN: Update Cookie Settings
  app.put("/api/admin/cookie-settings", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const settings = await storage.setCookieSettings(req.body);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update cookie settings error:", error);
      res.status(500).json({ success: false, message: "Failed to update cookie settings" });
    }
  });

  // PUBLIC: Get Cookie Settings (for banner)
  app.get("/api/cookie-settings", async (req, res) => {
    try {
      const settings = await storage.getCookieSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Get cookie settings error:", error);
      res.status(500).json({ success: false, message: "Failed to get cookie settings" });
    }
  });

  // ADMIN: Export Database
  app.get("/api/admin/database/export", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      // Get all tables
      const client = await pool.connect();
      try {
        // Get list of all tables
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);

        const tables = tablesResult.rows.map((row: any) => row.table_name);
        let sqlDump = `-- Database Export\n-- Generated: ${new Date().toISOString()}\n-- Database: ${process.env.DATABASE_URL?.split('/').pop() || 'loaddevice_db'}\n\n`;

        // Export each table
        for (const tableName of tables) {
          sqlDump += `\n-- Table: ${tableName}\n`;
          
          // Get table structure
          const structureResult = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position;
          `, [tableName]);

          // Get data
          const dataResult = await client.query(`SELECT * FROM "${tableName}"`);
          
          if (dataResult.rows.length > 0) {
            const columns = structureResult.rows.map((col: any) => col.column_name);
            sqlDump += `INSERT INTO "${tableName}" (${columns.map((c: string) => `"${c}"`).join(', ')}) VALUES\n`;
            
            const values = dataResult.rows.map((row: any, idx: number) => {
              const vals = columns.map((col: string) => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                if (val instanceof Date) return `'${val.toISOString()}'`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return val;
              });
              return `  (${vals.join(', ')})${idx < dataResult.rows.length - 1 ? ',' : ';'}`;
            });
            
            sqlDump += values.join('\n') + '\n\n';
          }
        }

        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="database-backup-${new Date().toISOString().split('T')[0]}.sql"`);
        res.send(sqlDump);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Database export error:", error);
      res.status(500).json({ success: false, message: "Failed to export database" });
    }
  });

  // USER: Change Password
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: "Current and new passwords required" });
        return;
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash || user.password);
      if (!isValid) {
        res.status(400).json({ success: false, message: "Current password is incorrect" });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        return;
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash: hashedPassword, password: hashedPassword });

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ success: false, message: "Failed to change password" });
    }
  });

  // USER: Mark Notification as Read - SECURITY FIX: Added ownership check
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      // SECURITY: Check if notification belongs to user
      const notification = await storage.getNotificationById(req.params.id);
      if (!notification) {
        res.status(404).json({ success: false, message: "Notification not found" });
        return;
      }

      if (notification.userId !== payload.userId) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ success: false, message: "Failed to mark as read" });
    }
  });

  // ADMIN: Get product images
  app.get("/api/admin/products/:id/images", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const images = await storage.getProductImages(req.params.id);
      res.json({ success: true, images });
    } catch (error) {
      console.error("Get product images error:", error);
      res.status(500).json({ success: false, message: "Failed to get images" });
    }
  });

  // ADMIN: Add product image (accepts both base64 and URL)
  app.post("/api/admin/products/:id/images", async (req, res) => {
    try {
      console.log(`📸 [POST /api/admin/products/:id/images] Starting image upload for product: ${req.params.id}`);
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { imageUrl, imageBase64 } = req.body;
      const imageData = imageBase64 || imageUrl;
      
      if (!imageData || typeof imageData !== 'string') {
        console.error(`❌ [POST /api/admin/products/:id/images] No image data provided`);
        res.status(400).json({ success: false, message: "Image data required" });
        return;
      }

      console.log(`📝 [POST /api/admin/products/:id/images] Image data length: ${imageData.length} chars`);

      // Validate base64 size (max 5MB)
      if (imageData.startsWith('data:image')) {
        const base64Size = calculateBase64Size(imageData);
        console.log(`📦 [POST /api/admin/products/:id/images] Base64 size: ${(base64Size / 1024 / 1024).toFixed(2)}MB`);
        if (base64Size > 5 * 1024 * 1024) {
          res.status(400).json({ success: false, message: "Image too large (max 5MB)" });
          return;
        }
      }

      console.log(`🔄 [POST /api/admin/products/:id/images] Calling storage.addProductImage()`);
      const product = await storage.addProductImage(req.params.id, imageData);
      if (!product) {
        console.error(`❌ [POST /api/admin/products/:id/images] Product not found`);
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      console.log(`🗑️ [POST /api/admin/products/:id/images] Clearing caches`);
      // Clear product caches including product-specific image cache
      cache.delete('products');
      cache.delete('products-active');
      cache.delete(`product-images-${req.params.id}`);
      console.log(`✅ [POST /api/admin/products/:id/images] Caches cleared (including product-images-${req.params.id})`);

      // Ensure images are returned as array
      const productWithImages = {
        ...product,
        images: Array.isArray(product.images) ? product.images : (product.images ? JSON.parse(product.images) : [])
      };
      
      console.log(`✨ [POST /api/admin/products/:id/images] SUCCESS - returning product with ${productWithImages.images.length} images`);
      res.json({ success: true, product: productWithImages });
    } catch (error) {
      console.error("❌ Add product image error:", error);
      res.status(500).json({ success: false, message: "Failed to add image" });
    }
  });

  // ADMIN: Remove product image
  app.delete("/api/admin/products/:id/images", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { imageUrl, imageData } = req.body;
      const dataToRemove = imageData || imageUrl;
      
      if (!dataToRemove || typeof dataToRemove !== 'string') {
        res.status(400).json({ success: false, message: "Image data required" });
        return;
      }

      const product = await storage.removeProductImage(req.params.id, dataToRemove);
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      // Clear product caches including product-specific image cache
      cache.delete('products');
      cache.delete('products-active');
      cache.delete(`product-images-${req.params.id}`);
      console.log(`✅ [DELETE /api/admin/products/:id/images] Caches cleared (including product-images-${req.params.id})`);

      // Ensure images are returned as array
      const productWithImages = {
        ...product,
        images: Array.isArray(product.images) ? product.images : (product.images ? JSON.parse(product.images) : [])
      };

      res.json({ success: true, product: productWithImages });
    } catch (error) {
      console.error("Remove product image error:", error);
      res.status(500).json({ success: false, message: "Failed to remove image" });
    }
  });

  // ADMIN: Send notification to user
  app.post("/api/admin/notifications/send", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }

      const user = await storage.getUserById(payload.userId);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      const { userId, title, message, type = "info", link } = req.body;
      
      if (!title || !message) {
        res.status(400).json({ success: false, message: "Title and message required" });
        return;
      }

      if (userId) {
        // Send to specific user
        const targetUser = await storage.getUserById(userId);
        if (!targetUser) {
          res.status(404).json({ success: false, message: "User not found" });
          return;
        }

        const notification = await storage.sendNotificationToUser(userId, {
          title: sanitizeInput(title, 200),
          message: sanitizeInput(message, 1000),
          type: sanitizeInput(type, 50),
          link: link ? sanitizeInput(link, 500) : null,
        });

        // Send email notification
        if (targetUser.email) {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🔔 ${escapeHtml(title)}</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; line-height: 1.6; color: #333;">
                    ${escapeHtml(message).replace(/\n/g, '<br>')}
                  </div>
                  
                  ${link ? `
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${escapeHtml(link)}" 
                       style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                      Перейти →
                    </a>
                  </div>
                  ` : ''}
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                    <p style="margin: 0;">Это автоматическое уведомление</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;
          sendEmail(targetUser.email, title, emailHtml).catch(err => {
            console.error("Failed to send notification email:", err);
          });
        }

        res.json({ success: true, notification });
      } else {
        // Send to all users
        const notifications = await storage.sendNotificationToAllUsers({
          title: sanitizeInput(title, 200),
          message: sanitizeInput(message, 1000),
          type: sanitizeInput(type, 50),
          link: link ? sanitizeInput(link, 500) : null,
        });

        // Send email to all users
        const allUsers = await storage.getAllUsers();
        for (const targetUser of allUsers) {
          if (targetUser.email) {
            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🔔 ${escapeHtml(title)}</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; line-height: 1.6; color: #333;">
                      ${escapeHtml(message).replace(/\n/g, '<br>')}
                    </div>
                    
                    ${link ? `
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${escapeHtml(link)}" 
                         style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Перейти →
                      </a>
                    </div>
                    ` : ''}
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
                      <p style="margin: 0;">Это автоматическое уведомление</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `;
            sendEmail(targetUser.email, title, emailHtml).catch(err => {
              console.error("Failed to send notification email:", err);
            });
          }
        }

        res.json({ 
          success: true, 
          notifications,
          count: notifications.length
        });
      }
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ success: false, message: "Failed to send notification" });
    }
  });

  // Register auth routes
  const httpServer = createServer(app);

  return httpServer;
}
