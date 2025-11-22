import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import { contactLimiter, orderLimiter, promoLimiter, cryptoRatesLimiter } from "./index";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL || "owner@example.com";

// ✅ ИСПРАВЛЕНИЕ 5: Константы вместо magic numbers
const CONFIG = {
  MAX_FILE_SIZE_MB: 10,
  RESERVATION_TIME_MINUTES: 15,
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  ALLOWED_FILE_EXTENSIONS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  MAX_STRING_LENGTH: 1000,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
};

// ✅ ИСПРАВЛЕНИЕ 6: XSS защита - экранирование HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ✅ ИСПРАВЛЕНИЕ 7: Маскирование email в логах
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return 'invalid-email';
  return `${local.slice(0, 2)}***@${domain}`;
}

// ✅ ИСПРАВЛЕНИЕ 8: Валидация email
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= CONFIG.MAX_EMAIL_LENGTH;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not configured");
    return { success: false, message: "Email service not configured" };
  }

  try {
    // ✅ Валидация email перед отправкой
    if (!isValidEmail(to)) {
      console.warn(`[EMAIL] Invalid recipient email: ${maskEmail(to)}`);
      return { success: false, message: "Invalid recipient email" };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to,
        subject: escapeHtml(subject),
        html,
      }),
    });

    const success = response.ok;
    console.log(`[EMAIL] ${success ? '✓' : '✗'} to: ${maskEmail(to)} subject: ${subject.slice(0, 50)}`);
    
    return { success, data: success ? { id: "email_sent" } : await response.json() };
  } catch (error) {
    console.error("[EMAIL_ERROR]", error instanceof Error ? error.message : String(error));
    return { success: false, error: "Email sending failed" };
  }
}

async function getCryptoRates(): Promise<{ btc: number; eth: number; usdt: number; ltc: number }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,litecoin&vs_currencies=rub',
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      btc: Number(data.bitcoin?.rub) || 0,
      eth: Number(data.ethereum?.rub) || 0,
      usdt: Number(data.tether?.rub) || 0,
      ltc: Number(data.litecoin?.rub) || 0,
    };
  } catch (error) {
    console.error("[CRYPTO_RATES_ERROR]", error instanceof Error ? error.message : String(error));
    return { btc: 0, eth: 0, usdt: 0, ltc: 0 };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ ИСПРАВЛЕНИЕ 9: Rate limiting на crypto-rates endpoint
  app.get("/api/crypto-rates", cryptoRatesLimiter, async (req, res) => {
    try {
      const rates = await getCryptoRates();
      res.json(rates);
    } catch (error) {
      console.error("[CRYPTO_RATES_HANDLER]", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении курсов криптовалют",
      });
    }
  });

  // ✅ ИСПРАВЛЕНИЕ 10: Rate limiting + XSS защита на contact endpoint
  app.post("/api/contact", contactLimiter, async (req, res) => {
    try {
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      
      // Валидация файла
      if (validatedData.fileData && validatedData.fileName) {
        const dataUrlMatch = validatedData.fileData.match(/^data:([^;]+);base64,(.+)$/);
        const base64Data = dataUrlMatch ? dataUrlMatch[2] : validatedData.fileData;
        const declaredMimeType = dataUrlMatch ? dataUrlMatch[1] : null;
        
        const fileSizeBytes = (base64Data.length * 3) / 4;
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        
        if (fileSizeMB > CONFIG.MAX_FILE_SIZE_MB) {
          res.status(413).json({
            success: false,
            message: `Размер файла превышает максимально допустимый (${CONFIG.MAX_FILE_SIZE_MB} МБ)`,
          });
          return;
        }

        if (declaredMimeType && !CONFIG.ALLOWED_FILE_TYPES.includes(declaredMimeType)) {
          res.status(400).json({
            success: false,
            message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
          });
          return;
        }

        const fileExtension = validatedData.fileName.substring(validatedData.fileName.lastIndexOf('.')).toLowerCase();
        
        if (!CONFIG.ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
          res.status(400).json({
            success: false,
            message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
          });
          return;
        }
      }
      
      const submission = await storage.createContactSubmission(validatedData);
      
      // ✅ ИСПРАВЛЕНИЕ 11: Экранирование всех user inputs в email HTML
      const ownerEmailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Новое коммерческое предложение</h2>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Имя:</strong> ${escapeHtml(validatedData.name)}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(validatedData.email)}</p>
            <p style="margin: 5px 0;"><strong>Телефон:</strong> ${escapeHtml(validatedData.phone)}</p>
            <p style="margin: 5px 0;"><strong>Компания:</strong> ${escapeHtml(validatedData.company || 'Не указана')}</p>
          </div>

          <h3 style="color: #1a1a1a; margin-top: 20px;">Сообщение:</h3>
          <div style="background: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">
            ${escapeHtml(validatedData.message).replace(/\n/g, '<br>')}
          </div>

          ${validatedData.fileName ? `<p style="margin-top: 10px;"><strong>📎 Файл:</strong> ${escapeHtml(validatedData.fileName)}</p>` : ''}
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Это автоматическое письмо. Пожалуйста, не отвечайте на него.
          </p>
        </div>
      `;

      await sendEmail(OWNER_EMAIL, `Новое коммерческое предложение от ${validatedData.name}`, ownerEmailHtml);
      
      console.log(`[CONTACT] New submission from ${maskEmail(validatedData.email)}`);
      
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
          errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        });
      } else {
        console.error("[CONTACT_ERROR]", error);
        res.status(500).json({
          success: false,
          message: "Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.",
        });
      }
    }
  });

  // ✅ ИСПРАВЛЕНИЕ 12: Защита от раскрытия данных (скрыл GET endpoint для контактов)
  app.get("/api/contact", async (req, res) => {
    // TODO: Добавить проверку авторизации для админа
    // Пока возвращаем 403 для защиты
    res.status(403).json({
      success: false,
      message: "Доступ запрещён"
    });
  });

  app.get("/api/contact/:id", async (req, res) => {
    // TODO: Добавить проверку авторизации
    res.status(403).json({
      success: false,
      message: "Доступ запрещён"
    });
  });

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("[GET_PRODUCTS_ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении товаров",
      });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Товар не найден",
        });
        return;
      }
      
      res.json(product);
    } catch (error) {
      console.error("[GET_PRODUCT_ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении товара",
      });
    }
  });

  // ✅ ИСПРАВЛЕНИЕ 13: Rate limiting на promo validate endpoint
  app.post("/api/promo/validate", promoLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string' || code.length > 50) {
        res.status(400).json({
          success: false,
          message: "Промокод не указан или некорректный",
        });
        return;
      }
      
      const promo = await storage.validatePromoCode(code);
      
      if (!promo) {
        res.status(404).json({
          success: false,
          message: "Промокод недействителен или истек",
        });
        return;
      }
      
      res.json({
        success: true,
        discountPercent: promo.discountPercent,
        code: promo.code,
      });
    } catch (error) {
      console.error("[PROMO_ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при проверке промокода",
      });
    }
  });

  // ✅ ИСПРАВЛЕНИЕ 14: Rate limiting на orders endpoint
  app.post("/api/orders", orderLimiter, async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      
      const product = await storage.getProduct(validatedData.productId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Товар не найден",
        });
        return;
      }

      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + CONFIG.RESERVATION_TIME_MINUTES);

      const orderData = {
        ...validatedData,
        reservedUntil,
      };

      const order = await storage.createOrder(orderData);

      // ✅ ИСПРАВЛЕНИЕ 15: Экранирование в email HTML для заказов
      const ownerEmailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Новый заказ #${order.id}</h2>
          
          <h3 style="color: #1a1a1a; margin-top: 20px;">Контактные данные клиента:</h3>
          <ul style="list-style: none; padding: 0; background: #f9f9f9; padding: 15px; border-radius: 5px;">
            <li style="padding: 5px 0;"><strong>Имя:</strong> ${escapeHtml(order.customerName || 'Не указано')}</li>
            <li style="padding: 5px 0;"><strong>Email:</strong> ${escapeHtml(order.customerEmail || 'Не указано')}</li>
            <li style="padding: 5px 0;"><strong>Телефон:</strong> ${escapeHtml(order.customerPhone || 'Не указано')}</li>
          </ul>
          
          <h3 style="color: #1a1a1a; margin-top: 20px;">Детали заказа:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f0f0f0;">
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Параметр</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Значение</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Товар</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(product.name)}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px; border: 1px solid #ddd;">Артикул</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(product.sku)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Количество</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${order.quantity} шт.</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px; border: 1px solid #ddd;">Сумма</td>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>${order.finalAmount} РУБ</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Способ оплаты</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(order.paymentMethod)}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px; border: 1px solid #ddd;">Статус</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(order.paymentStatus)}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Это автоматическое письмо. Пожалуйста, свяжитесь с клиентом по предоставленным контактным данным.
          </p>
        </div>
      `;

      await sendEmail(OWNER_EMAIL, `Новый заказ #${order.id}`, ownerEmailHtml);
      
      console.log(`[ORDER] New order #${order.id} from ${maskEmail(order.customerEmail || '')}`);
      
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
          errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        });
      } else {
        console.error("[ORDER_ERROR]", error);
        res.status(500).json({
          success: false,
          message: "Произошла ошибка при создании заказа",
        });
      }
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Заказ не найден",
        });
        return;
      }
      
      res.json(order);
    } catch (error) {
      console.error("[GET_ORDER_ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении заказа",
      });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status, paymentDetails } = req.body;
      
      if (!status || typeof status !== 'string') {
        res.status(400).json({
          success: false,
          message: "Статус не указан",
        });
        return;
      }

      const order = await storage.updateOrderStatus(req.params.id, status, paymentDetails);
      
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
      console.error("[UPDATE_ORDER_ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при обновлении статуса заказа",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
