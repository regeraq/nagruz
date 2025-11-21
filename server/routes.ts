import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL || "owner@example.com";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured");
    return { success: false, message: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();
    console.log("Email sent:", { to, subject, success: response.ok, data });
    return { success: response.ok, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

async function getCryptoRates(): Promise<{ btc: number; eth: number; usdt: number; ltc: number }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,litecoin&vs_currencies=rub'
    );
    const data = await response.json();
    return {
      btc: data.bitcoin.rub || 0,
      eth: data.ethereum.rub || 0,
      usdt: data.tether.rub || 0,
      ltc: data.litecoin.rub || 0,
    };
  } catch (error) {
    console.error("Error fetching crypto rates:", error);
    return { btc: 0, eth: 0, usdt: 0, ltc: 0 };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/crypto-rates", async (req, res) => {
    try {
      const rates = await getCryptoRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching crypto rates:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении курсов криптовалют",
      });
    }
  });
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      
      if (validatedData.fileData && validatedData.fileName) {
        const dataUrlMatch = validatedData.fileData.match(/^data:([^;]+);base64,(.+)$/);
        const base64Data = dataUrlMatch ? dataUrlMatch[2] : validatedData.fileData;
        const declaredMimeType = dataUrlMatch ? dataUrlMatch[1] : null;
        
        const fileSizeBytes = (base64Data.length * 3) / 4;
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        
        if (fileSizeMB > 10) {
          res.status(413).json({
            success: false,
            message: "Размер файла превышает максимально допустимый (10 МБ)",
          });
          return;
        }

        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (declaredMimeType && !allowedMimeTypes.includes(declaredMimeType)) {
          res.status(400).json({
            success: false,
            message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
          });
          return;
        }

        const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
        const fileExtension = validatedData.fileName.substring(validatedData.fileName.lastIndexOf('.')).toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
          res.status(400).json({
            success: false,
            message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
          });
          return;
        }
      }
      
      const submission = await storage.createContactSubmission(validatedData);
      
      const ownerEmailHtml = `
        <h2>Новая коммерческое предложение</h2>
        <p><strong>Имя:</strong> ${validatedData.name}</p>
        <p><strong>Email:</strong> ${validatedData.email}</p>
        <p><strong>Телефон:</strong> ${validatedData.phone}</p>
        <p><strong>Компания:</strong> ${validatedData.company || 'Не указана'}</p>
        <p><strong>Сообщение:</strong></p>
        <p>${validatedData.message.replace(/\n/g, '<br>')}</p>
        ${validatedData.fileName ? `<p><strong>Файл:</strong> ${validatedData.fileName}</p>` : ''}
      `;

      await sendEmail(OWNER_EMAIL, `Новое коммерческое предложение от ${validatedData.name}`, ownerEmailHtml);
      
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

  app.get("/api/contact", async (req, res) => {
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

  app.get("/api/contact/:id", async (req, res) => {
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

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
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
      console.error("Error fetching product:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при получении товара",
      });
    }
  });

  app.post("/api/promo/validate", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: "Промокод не указан",
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
      console.error("Error validating promo code:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при проверке промокода",
      });
    }
  });

  app.post("/api/orders", async (req, res) => {
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
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 15);

      const orderData = {
        ...validatedData,
        reservedUntil,
      };

      const order = await storage.createOrder(orderData);

      const ownerEmailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Новый заказ</h2>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>ID заказа:</strong> <code style="background: #eee; padding: 3px 6px;">${order.id}</code></p>
          </div>
          
          <h3 style="color: #1a1a1a; margin-top: 20px;">Контактные данные клиента:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 5px 0;"><strong>Имя:</strong> ${order.customerName || 'Не указано'}</li>
            <li style="padding: 5px 0;"><strong>Email:</strong> ${order.customerEmail || 'Не указано'}</li>
            <li style="padding: 5px 0;"><strong>Телефон:</strong> ${order.customerPhone || 'Не указано'}</li>
          </ul>
          
          <h3 style="color: #1a1a1a; margin-top: 20px;">Детали заказа:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f0f0f0;">
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Параметр</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Значение</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Товар</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${product.name}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px; border: 1px solid #ddd;">Артикул</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${product.sku}</td>
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
              <td style="padding: 8px; border: 1px solid #ddd;">${order.paymentMethod}</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px; border: 1px solid #ddd;">Статус</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${order.paymentStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Резервация до</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${order.reservedUntil ? new Date(order.reservedUntil).toLocaleString('ru-RU') : 'Не установлено'}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Это автоматическое письмо. Пожалуйста, свяжитесь с клиентом по предоставленным контактным данным.
          </p>
        </div>
      `;

      await sendEmail(OWNER_EMAIL, `Новый заказ #${order.id}`, ownerEmailHtml);
      
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
      console.error("Error fetching order:", error);
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
      console.error("Error updating order status:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при обновлении статуса заказа",
      });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}
