import { db } from "./db";
import { 
  users, products, orders, notifications, favorites, sessions,
  contactSubmissions, loginAttempts, promoCodes, siteSettings,
  siteContent, siteContacts, cookieSettings, personalDataConsents,
  commercialProposalFiles
} from "@shared/schema";
import { eq, and, desc, inArray, lt } from "drizzle-orm";

/**
 * Сериализация `advantages` перед записью в БД.
 *  - массив объектов → JSON-строка (нормализованная, с обрезкой пробелов);
 *  - JSON-строка → проверяется на валидность и оставляется как есть;
 *  - null / undefined / пустой массив / невалидные данные → null в БД.
 * В БД поле хранится как TEXT (JSON-строка), чтобы не плодить лишние таблицы.
 */
function serializeAdvantages(input: unknown): string | null {
  if (input == null) return null;

  let raw: unknown = input;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;

  const normalized = raw
    .map((item): { title: string; description: string; icon: string | null } | null => {
      if (!item || typeof item !== "object") return null;
      const obj = item as { title?: unknown; description?: unknown; icon?: unknown };
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      const description = typeof obj.description === "string" ? obj.description.trim() : "";
      if (!title && !description) return null;
      const icon =
        typeof obj.icon === "string" && obj.icon.trim() ? obj.icon.trim() : null;
      return { title, description, icon };
    })
    .filter((v): v is { title: string; description: string; icon: string | null } => v !== null)
    .slice(0, 12);

  if (normalized.length === 0) return null;
  return JSON.stringify(normalized);
}

export interface IStorage {
  getUserByEmail(email: string): Promise<any>;
  getUserById(id: string): Promise<any>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  getSessionByToken(token: string): Promise<any>;
  createSession(session: any): Promise<any>;
  deleteSession(id: string): Promise<boolean>;
  getAllNotifications(userId: string): Promise<any[]>;
  getNotificationById(id: string): Promise<any>;
  markNotificationAsRead(id: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  clearUserNotifications(userId: string): Promise<boolean>;
  createNotification(notification: any): Promise<any>;
  getProducts(): Promise<any[]>;
  getProduct(id: string): Promise<any>;
  createProduct(product: any): Promise<any>;
  updateProduct(id: string, data: any): Promise<any>;
  deleteProduct(id: string): Promise<boolean>;
  deleteProducts(ids: string[]): Promise<number>;
  updateProductPrice(id: string, price: string): Promise<any>;
  updateProductInfo(id: string, data: any): Promise<any>;
  getContact(id: string): Promise<any>;
  createContactSubmission(data: any): Promise<any>;
  getContactSubmissions(): Promise<any[]>;
  getContactSubmission(id: string): Promise<any>;
  deleteContactSubmission(id: string): Promise<boolean>;
  recordLoginAttempt(email: string, success: boolean, ipAddress?: string | null): Promise<void>;
  purgeExpiredData(loginAttemptRetentionDays?: number): Promise<{ sessions: number; loginAttempts: number }>;
  getOrder(id: string): Promise<any>;
  updateOrderStatus(id: string, status: string, details?: string): Promise<any>;
  createOrder(order: any): Promise<any>;
  getUserOrders(userId: string): Promise<any[]>;
  getAllOrders(): Promise<any[]>;
  deleteAllOrders(): Promise<number>;
  addToFavorites(userId: string, productId: string): Promise<any>;
  removeFavorite(userId: string, productId: string): Promise<boolean>;
  getUserFavorites(userId: string): Promise<any[]>;
  validatePromoCode(code: string): Promise<any>;
  getAllUsers(): Promise<any[]>;
  updateUserRole(id: string, role: string): Promise<any>;
  blockUser(id: string, blocked: boolean): Promise<any>;
  deleteUser(id: string): Promise<boolean>;
  getPromoCodes(): Promise<any[]>;
  getPromoCode(id: string): Promise<any>;
  createPromoCode(promo: any): Promise<any>;
  updatePromoCode(id: string, data: any): Promise<any>;
  deletePromoCode(id: string): Promise<boolean>;
  getSiteSettings(): Promise<any[]>;
  getSiteSetting(key: string): Promise<any>;
  setSiteSetting(key: string, value: string, type?: string, description?: string, updatedBy?: string): Promise<any>;
  setSiteSettingsBulk(
    items: { key: string; value: string; type?: string; description?: string }[],
    updatedBy?: string,
  ): Promise<any[]>;
  getProductImages(productId: string): Promise<string[]>;
  addProductImage(productId: string, imageUrl: string): Promise<any>;
  removeProductImage(productId: string, imageUrl: string): Promise<any>;
  sendNotificationToUser(userId: string, notification: any): Promise<any>;
  sendNotificationToAllUsers(notification: any): Promise<any>;
}

export class DrizzleStorage implements IStorage {
  async getUserByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async getUserById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async createUser(user: any) {
    // Generate short numeric user ID (10 digits)
    const userId = user.id || `${Math.floor(Math.random() * 10000000000)}`;
    const result = await db.insert(users).values({
      id: userId,
      email: user.email,
      passwordHash: user.passwordHash || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      phone: user.phone || null,
      role: user.role || "user",
      isEmailVerified: user.isEmailVerified || false,
      isPhoneVerified: user.isPhoneVerified || false,
      isBlocked: user.isBlocked || false,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, data: any) {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getSessionByToken(token: string) {
    const result = await db.select().from(sessions).where(eq(sessions.refreshToken, token));
    return result[0] || null;
  }

  async createSession(session: any) {
    const result = await db.insert(sessions).values({
      id: session.id || undefined,
      userId: session.userId,
      refreshToken: session.refreshToken,
      expiresAt: new Date(session.expiresAt),
      ipAddress: session.ipAddress || null,
      userAgent: session.userAgent || null,
    }).returning();
    return result[0];
  }

  async deleteSession(id: string) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return true;
  }

  async getUserSessions(userId: string) {
    return await db.select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));
  }

  async deleteUserSessions(userId: string, exceptId?: string) {
    if (exceptId) {
      // Удаляем все кроме указанной
      const existing = await this.getUserSessions(userId);
      const toDelete = existing.filter(s => s.id !== exceptId);
      for (const s of toDelete) {
        await db.delete(sessions).where(eq(sessions.id, s.id));
      }
      return toDelete.length;
    }
    const existing = await this.getUserSessions(userId);
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return existing.length;
  }

  async getSessionById(id: string) {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0] || null;
  }

  async getAllNotifications(userId: string) {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationById(id: string) {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0] || null;
  }

  async markNotificationAsRead(id: string) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async deleteNotification(id: string) {
    await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  async clearUserNotifications(userId: string) {
    await db.delete(notifications).where(eq(notifications.userId, userId));
    return true;
  }

  async createNotification(notification: any) {
    const result = await db.insert(notifications).values({
      id: notification.id || undefined,
      userId: notification.userId,
      type: notification.type || "info",
      title: notification.title || "",
      message: notification.message || "",
      link: notification.link || null,
      metadata: notification.metadata || null,
      isRead: false,
    }).returning();
    return result[0];
  }

  async getProducts() {
    return await db.select().from(products);
  }

  async getProduct(id: string) {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0] || null;
  }

  async createProduct(product: any) {
    const result = await db.insert(products).values({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency || "RUB",
      sku: product.sku,
      specifications: product.specifications,
      stock: product.stock || 0,
      category: product.category || null,
      imageUrl: product.imageUrl || null,
      images: product.images ? JSON.stringify(product.images) : null,
      advantages: serializeAdvantages(product.advantages),
      isActive: product.isActive !== undefined ? product.isActive : true,
    }).returning();
    return result[0];
  }

  async updateProduct(id: string, data: any) {
    const updateData: any = { ...data };
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
    }
    if (updateData.advantages !== undefined) {
      updateData.advantages = serializeAdvantages(updateData.advantages);
    }
    const result = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  async deleteProducts(ids: string[]) {
    let count = 0;
    for (const id of ids) {
      await db.delete(products).where(eq(products.id, id));
      count++;
    }
    return count;
  }

  async updateProductPrice(id: string, price: string) {
    const result = await db.update(products).set({ price }).where(eq(products.id, id)).returning();
    return result[0];
  }

  async updateProductInfo(id: string, data: any) {
    // Ensure images are stored as JSON string
    const updateData: any = { ...data };
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    
    // Handle updatedAt - convert ISO string to Date if provided, or let database handle it
    if (updateData.updatedAt !== undefined) {
      if (typeof updateData.updatedAt === 'string') {
        updateData.updatedAt = new Date(updateData.updatedAt);
      }
      // If it's already a Date object, keep it as is
    } else {
      // If not provided, let database update it automatically
      updateData.updatedAt = new Date();
    }
    
    if (updateData.images !== undefined) {
      if (Array.isArray(updateData.images)) {
        updateData.images = JSON.stringify(updateData.images);
      } else if (typeof updateData.images === 'string') {
        // Already a string, validate it's valid JSON
        try {
          JSON.parse(updateData.images);
          // Valid JSON, keep as is
        } catch {
          // Not valid JSON, wrap in array and stringify
          updateData.images = JSON.stringify([updateData.images]);
        }
      }
    }

    if (updateData.advantages !== undefined) {
      updateData.advantages = serializeAdvantages(updateData.advantages);
    }
    
    // Ensure price is a string (decimal format)
    if (updateData.price !== undefined && typeof updateData.price === 'number') {
      updateData.price = updateData.price.toString();
    }
    
    // Filter out undefined values to avoid overwriting with null
    const filteredData: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
    }
    
    const result = await db.update(products).set(filteredData).where(eq(products.id, id)).returning();
    return result[0];
  }

  async createContactSubmission(data: any) {
    // Generate short numeric submission ID (10 digits)
    const submissionId = data.id || `${Math.floor(Math.random() * 10000000000)}`;
    const result = await db.insert(contactSubmissions).values({
      id: submissionId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company,
      message: data.message,
      fileName: data.fileName || null,
      fileData: data.fileData || null,
    }).returning();
    return result[0];
  }

  async getContact(id: string) {
    const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    return result[0] || null;
  }

  async getContactSubmissions() {
    return await db.select().from(contactSubmissions);
  }

  async getContactSubmission(id: string) {
    const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    return result[0] || null;
  }

  async deleteContactSubmission(id: string) {
    await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
    return true;
  }

  async recordLoginAttempt(email: string, success: boolean, ipAddress?: string | null) {
    // IP вызывающая сторона знает, а колонка раньше всегда оставалась NULL —
    // журнал попыток входа был бесполезен для разбора инцидентов.
    await db.insert(loginAttempts).values({
      id: undefined,
      email,
      success,
      ipAddress: ipAddress ?? null,
    });
  }

  /**
   * Удаление персональных данных с истёкшим сроком хранения.
   * COMPLIANCE (152-ФЗ ст.5 ч.7): ПДн хранятся не дольше, чем требуется.
   */
  async purgeExpiredData(loginAttemptRetentionDays = 90) {
    const now = new Date();
    const loginAttemptCutoff = new Date(now.getTime() - loginAttemptRetentionDays * 24 * 60 * 60 * 1000);

    const removedSessions = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id });

    const removedAttempts = await db
      .delete(loginAttempts)
      .where(lt(loginAttempts.createdAt, loginAttemptCutoff))
      .returning({ id: loginAttempts.id });

    return { sessions: removedSessions.length, loginAttempts: removedAttempts.length };
  }

  async getOrder(id: string) {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0] || null;
  }

  async updateOrderStatus(id: string, status: string, details?: string) {
    const result = await db.update(orders).set({ paymentStatus: status, paymentDetails: details }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async createOrder(order: any) {
    // Generate short numeric order ID (10 digits)
    const orderId = order.id || `${Math.floor(Math.random() * 10000000000)}`;
    const result = await db.insert(orders).values({
      id: orderId,
      userId: order.userId || null,
      productId: order.productId,
      quantity: order.quantity || 1,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount || "0",
      finalAmount: order.finalAmount,
      promoCode: order.promoCode || null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || "pending",
      customerName: order.customerName || null,
      customerEmail: order.customerEmail || null,
      customerPhone: order.customerPhone || null,
      paymentDetails: order.paymentDetails || null,
    }).returning();
    
    if (order.quantity) {
      const product = await this.getProduct(order.productId);
      if (product) {
        await this.updateProduct(order.productId, {
          stock: Math.max(0, (product.stock || 0) - order.quantity),
        });
      }
    }
    
    return result[0];
  }

  async getUserOrders(userId: string) {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders() {
    return await db.select().from(orders);
  }

  async deleteAllOrders(): Promise<number> {
    // Get count before deletion for return value
    const allOrders = await db.select().from(orders);
    const count = allOrders.length;
    
    // Delete all orders
    if (count > 0) {
      await db.delete(orders);
    }
    
    return count;
  }

  async addToFavorites(userId: string, productId: string) {
    // Check if product exists
    const product = await this.getProduct(productId);
    if (!product) {
      return null;
    }
    
    // Check if already in favorites to prevent duplicates
    const existing = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
    
    if (existing.length > 0) {
      return existing[0]; // Return existing favorite instead of creating duplicate
    }
    
    const result = await db.insert(favorites).values({
      id: undefined,
      userId,
      productId,
    }).returning();
    return result[0];
  }

  async removeFavorite(userId: string, productId: string) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
    return true;
  }

  async getUserFavorites(userId: string) {
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async validatePromoCode(code: string) {
    // Normalize code to uppercase for case-insensitive comparison
    const normalizedCode = code.trim().toUpperCase();
    
    const result = await db.select().from(promoCodes).where(eq(promoCodes.code, normalizedCode));
    const promo = result[0];
    
    if (!promo) {
      console.log(`❌ [validatePromoCode] Promo code "${normalizedCode}" not found`);
      return null;
    }
    
    // isActive может приходить и как boolean, и как integer (1/0) из драйвера pg
    const rawActive = promo.isActive as unknown;
    const isActive = rawActive === true || rawActive === 1 || rawActive === "1" || rawActive === "t" || rawActive === "true";
    if (!isActive) {
      console.log(`❌ [validatePromoCode] Promo code "${normalizedCode}" is not active (isActive: ${promo.isActive})`);
      return null;
    }
    
    if (promo.expiresAt) {
      const expiresAt = new Date(promo.expiresAt);
      const now = new Date();
      if (expiresAt < now) {
        console.log(`❌ [validatePromoCode] Promo code "${normalizedCode}" expired (expiresAt: ${expiresAt}, now: ${now})`);
        return null;
      }
    }
    
    console.log(`✅ [validatePromoCode] Promo code "${normalizedCode}" is valid (discount: ${promo.discountPercent}%)`);
    return {
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
      id: promo.id,
    };
  }

  async getAllUsers() {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string) {
    const result = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async blockUser(id: string, blocked: boolean) {
    const result = await db.update(users).set({ isBlocked: blocked }).where(eq(users.id, id)).returning();
    return result[0];
  }

  /**
   * Полное удаление учётной записи вместе с персональными данными.
   *
   * COMPLIANCE (152-ФЗ ст.21): раньше удалялась только строка в `users`.
   * Каскад закрывал sessions/favorites/notifications/consents/oauth, но ПДн
   * оставались:
   *   - `orders` (FK `set null`) сохраняли customerName/Email/Phone;
   *   - `contact_submissions` вообще не связаны с пользователем по FK;
   *   - `commercial_proposal_files` (FK `set null`) сохраняли файлы заявителя;
   *   - `login_attempts` хранили email.
   *
   * Заказы не удаляем — они нужны для бухгалтерского учёта, но обезличиваем:
   * после этого строку нельзя связать с физическим лицом.
   */
  async deleteUser(id: string) {
    const existing = await db.select().from(users).where(eq(users.id, id));
    const user = existing[0];
    if (!user) return false;

    const email = user.email;

    // Файлы коммерческих предложений пользователя и сами заявки.
    const proposalRows = await db
      .select({
        proposalId: commercialProposalFiles.proposalId,
        filePath: commercialProposalFiles.filePath,
      })
      .from(commercialProposalFiles)
      .where(eq(commercialProposalFiles.userId, id));

    // Все изменения в БД — одной транзакцией: частично удалённый пользователь
    // (например, стёртые заявки при живой строке users) нарушал бы и целостность,
    // и обещание «удаляем ПДн полностью».
    await db.transaction(async (tx) => {
      await tx.delete(commercialProposalFiles).where(eq(commercialProposalFiles.userId, id));

      const proposalIds = Array.from(new Set(proposalRows.map((r) => r.proposalId).filter(Boolean)));
      if (proposalIds.length > 0) {
        await tx.delete(contactSubmissions).where(inArray(contactSubmissions.id, proposalIds));
      }
      // Заявки, отправленные с того же email, но без привязки к файлам.
      if (email) {
        await tx.delete(contactSubmissions).where(eq(contactSubmissions.email, email));
        await tx.delete(loginAttempts).where(eq(loginAttempts.email, email));
      }

      // Обезличивание заказов: финансовые записи сохраняются, ПДн — нет.
      // paymentDetails может содержать ФИО/телефон из платёжной формы — очищаем.
      await tx
        .update(orders)
        .set({
          customerName: "Удалённый пользователь",
          customerEmail: null,
          customerPhone: null,
          paymentDetails: null,
          userId: null,
          updatedAt: new Date(),
        })
        .where(eq(orders.userId, id));

      // Настройки уведомлений пользователя в site_settings (не FK, иначе orphan).
      await tx
        .delete(siteSettings)
        .where(eq(siteSettings.key, `user_prefs_notifications_${id}`));

      await tx.delete(users).where(eq(users.id, id));
    });

    // Файлы с диска удаляем только после коммита: откатить удаление файла нельзя,
    // а при откате транзакции ссылки на него остались бы в БД.
    const { deleteStoredFile, isStoredFilePath } = await import("./services/fileStorage");
    for (const row of proposalRows) {
      if (row.filePath && isStoredFilePath(row.filePath)) {
        await deleteStoredFile(row.filePath);
      }
    }

    return true;
  }

  async getPromoCodes() {
    return await db.select().from(promoCodes);
  }

  async getPromoCode(id: string) {
    const result = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return result[0] || null;
  }

  async createPromoCode(promo: any) {
    // Normalize code to uppercase for consistent comparison
    const normalizedCode = typeof promo.code === 'string' ? promo.code.trim().toUpperCase() : promo.code;
    
    const result = await db.insert(promoCodes).values({
      id: promo.id || undefined,
      code: normalizedCode,
      discountPercent: promo.discountPercent,
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
      isActive: promo.isActive !== undefined ? (promo.isActive === true || promo.isActive === 1 ? 1 : 0) : 1,
    }).returning();
    return result[0];
  }

  async updatePromoCode(id: string, data: any) {
    const result = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return result[0];
  }

  async deletePromoCode(id: string) {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
    return true;
  }

  async getSiteSettings() {
    return await db.select().from(siteSettings);
  }

  async getSiteSetting(key: string) {
    const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return result[0] || null;
  }

  async setSiteSetting(key: string, value: string, type: string = "string", description?: string, updatedBy?: string) {
    const existing = await this.getSiteSetting(key);
    if (existing) {
      const updateData: any = { value, type, description, updatedAt: new Date() };
      if (updatedBy) {
        updateData.updatedBy = updatedBy;
      }
      const result = await db.update(siteSettings).set(updateData).where(eq(siteSettings.key, key)).returning();
      return result[0];
    } else {
      const result = await db.insert(siteSettings).values({
        key,
        value,
        type,
        description: description || "",
        updatedBy: updatedBy || null,
      }).returning();
      return result[0];
    }
  }

  async setSiteSettingsBulk(
    items: { key: string; value: string; type?: string; description?: string }[],
    updatedBy?: string,
  ) {
    return await db.transaction(async (tx) => {
      const saved: any[] = [];
      for (const item of items) {
        const existing = await tx.select().from(siteSettings).where(eq(siteSettings.key, item.key));
        if (existing[0]) {
          const updateData: any = {
            value: item.value,
            type: item.type || "string",
            description: item.description ?? existing[0].description,
            updatedAt: new Date(),
          };
          if (updatedBy) updateData.updatedBy = updatedBy;
          const result = await tx.update(siteSettings).set(updateData).where(eq(siteSettings.key, item.key)).returning();
          saved.push(result[0]);
        } else {
          const result = await tx.insert(siteSettings).values({
            key: item.key,
            value: item.value,
            type: item.type || "string",
            description: item.description || "",
            updatedBy: updatedBy || null,
          }).returning();
          saved.push(result[0]);
        }
      }
      return saved;
    });
  }

  async getProductImages(productId: string): Promise<string[]> {
    const product = await this.getProduct(productId);
    if (!product) return [];
    
    let images: string[] = [];
    
    // Parse images from JSON string
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) {
          images = parsed;
        }
      } catch {
        // If not valid JSON, treat as single image URL
        if (typeof product.images === 'string' && product.images.trim()) {
          images = [product.images.trim()];
        }
      }
    }
    
    // Also include imageUrl if set and not already in array
    if (product.imageUrl && typeof product.imageUrl === 'string') {
      const trimmedUrl = product.imageUrl.trim();
      if (trimmedUrl.length > 0 && !images.includes(trimmedUrl)) {
        images.unshift(trimmedUrl); // Add at the beginning as main image
      }
    }
    
    // Filter valid images
    return images.filter(img => {
      if (!img || typeof img !== 'string') return false;
      const str = img.trim();
      return str.length > 0 && (str.startsWith('http') || str.startsWith('data:') || str.startsWith('/'));
    });
  }

  async addProductImage(productId: string, imageUrl: string): Promise<any> {
    console.log(`🖼️ [addProductImage] Starting for product: ${productId}`);
    const product = await this.getProduct(productId);
    if (!product) {
      console.error(`❌ [addProductImage] Product not found: ${productId}`);
      return null;
    }
    
    console.log(`📦 [addProductImage] Current images in DB:`, product.images);
    let images: string[] = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
        console.log(`✅ [addProductImage] Parsed images (count: ${images.length}):`, images);
      } catch (e) {
        console.error(`❌ [addProductImage] Failed to parse images:`, e);
        images = [];
      }
    }
    
    if (!images.includes(imageUrl)) {
      images.push(imageUrl);
      console.log(`➕ [addProductImage] Added new image. Total images now: ${images.length}`);
      console.log(`📝 [addProductImage] Saving to DB:`, JSON.stringify(images));
      const updated = await this.updateProduct(productId, { images: JSON.stringify(images) });
      console.log(`✅ [addProductImage] Saved to DB. Updated product:`, { id: updated.id, images: updated.images });
      
      // Return updated product with parsed images
      const result = { 
        ...updated, 
        images: images // Return as array, not JSON string
      };
      console.log(`✨ [addProductImage] Returning result with ${images.length} images`);
      return result;
    } else {
      console.log(`⏭️ [addProductImage] Image already exists, skipping`);
      // Return current product with parsed images
      return { 
        ...product, 
        images: images // Return as array, not JSON string
      };
    }
  }

  async removeProductImage(productId: string, imageUrl: string): Promise<any> {
    const product = await this.getProduct(productId);
    if (!product) return null;
    
    let images: string[] = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
      } catch {
        images = [];
      }
    }
    
    images = images.filter(img => img !== imageUrl);
    await this.updateProduct(productId, { images: JSON.stringify(images) });
    
    return { ...product, images };
  }

  async sendNotificationToUser(userId: string, notification: any): Promise<any> {
    return await this.createNotification({
      userId,
      ...notification,
    });
  }

  async sendNotificationToAllUsers(notification: any): Promise<any[]> {
    const allUsers = await this.getAllUsers();
    const results = [];
    
    for (const user of allUsers) {
      const result = await this.createNotification({
        userId: user.id,
        ...notification,
      });
      results.push(result);
    }
    
    return results;
  }

  // Site Content methods
  async createSiteContent(data: { key: string; value: string; page?: string; section?: string }) {
    const result = await db.insert(siteContent).values({
      key: data.key,
      value: data.value,
      page: data.page || null,
      section: data.section || null,
    }).returning();
    return result[0];
  }

  async getSiteContent(key: string) {
    const result = await db.select().from(siteContent).where(eq(siteContent.key, key));
    return result[0] || null;
  }

  async getAllSiteContent() {
    try {
      return await db.select().from(siteContent).orderBy(siteContent.key);
    } catch (error: any) {
      // Check if error is about missing table
      if (error?.code === '42P01' || error?.message?.includes('не существует') || error?.message?.includes('does not exist')) {
        console.warn("⚠️ [Storage] Table 'site_content' does not exist. Returning empty array.");
        console.warn("   To create the table, run the database migration or create it manually.");
        return [];
      }
      console.error("❌ [Storage] Error getting site content:", error);
      // Return empty array if table doesn't exist or other error
      return [];
    }
  }

  async updateSiteContent(key: string, data: { value: string; page?: string; section?: string }) {
    const result = await db.update(siteContent)
      .set({
        value: data.value,
        page: data.page || null,
        section: data.section || null,
        updatedAt: new Date(),
      })
      .where(eq(siteContent.key, key))
      .returning();
    return result[0];
  }

  async deleteSiteContent(key: string) {
    await db.delete(siteContent).where(eq(siteContent.key, key));
    return true;
  }

  // Site Contacts methods
  async createSiteContact(data: { type: string; value: string; label?: string; order?: number }) {
    const result = await db.insert(siteContacts).values({
      type: data.type,
      value: data.value,
      label: data.label || null,
      order: data.order || 0,
    }).returning();
    return result[0];
  }

  async getSiteContact(id: string) {
    const result = await db.select().from(siteContacts).where(eq(siteContacts.id, id));
    return result[0] || null;
  }

  async getAllSiteContacts() {
    try {
      return await db.select().from(siteContacts).orderBy(siteContacts.order);
    } catch (error) {
      console.error("Error getting site contacts:", error);
      // Return empty array if table doesn't exist
      return [];
    }
  }

  async updateSiteContact(id: string, data: { type?: string; value?: string; label?: string; order?: number; isActive?: boolean }) {
    const result = await db.update(siteContacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(siteContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteSiteContact(id: string) {
    await db.delete(siteContacts).where(eq(siteContacts.id, id));
    return true;
  }

  // Cookie Settings methods
  async getCookieSettings() {
    try {
      const result = await db.select().from(cookieSettings).limit(1);
      return result[0] || {
        enabled: true,
        message: "Мы используем cookies для улучшения работы сайта",
        acceptButtonText: "Принять",
        declineButtonText: "Отклонить",
      };
    } catch (error) {
      // Если таблица не существует, возвращаем дефолтные значения
      return {
        enabled: true,
        message: "Мы используем cookies для улучшения работы сайта",
        acceptButtonText: "Принять",
        declineButtonText: "Отклонить",
      };
    }
  }

  async setCookieSettings(data: { enabled?: boolean; message?: string; acceptButtonText?: string; declineButtonText?: string }) {
    try {
      const existing = await db.select().from(cookieSettings).limit(1);
      if (existing.length > 0) {
        const result = await db.update(cookieSettings)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .returning();
        return result[0];
      } else {
        const result = await db.insert(cookieSettings).values({
          enabled: data.enabled !== undefined ? data.enabled : true,
          message: data.message || "Мы используем cookies для улучшения работы сайта",
          acceptButtonText: data.acceptButtonText || "Принять",
          declineButtonText: data.declineButtonText || "Отклонить",
        }).returning();
        return result[0];
      }
    } catch (error) {
      console.error("Error setting cookie settings:", error);
      throw error;
    }
  }

  // Personal Data Consents methods (152-ФЗ compliance)
  async createPersonalDataConsent(consent: {
    userId: string;
    consentType: string;
    isConsented: boolean;
    consentText: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<any> {
    const result = await db.insert(personalDataConsents).values({
      userId: consent.userId,
      consentType: consent.consentType,
      isConsented: consent.isConsented,
      consentText: consent.consentText,
      ipAddress: consent.ipAddress || null,
      userAgent: consent.userAgent || null,
      consentedAt: consent.isConsented ? new Date() : null,
    }).returning();
    return result[0];
  }

  async getUserConsents(userId: string): Promise<any[]> {
    return await db.select()
      .from(personalDataConsents)
      .where(eq(personalDataConsents.userId, userId))
      .orderBy(desc(personalDataConsents.createdAt));
  }

  async revokeConsent(userId: string, consentType: string): Promise<any> {
    const result = await db.update(personalDataConsents)
      .set({
        isConsented: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(personalDataConsents.userId, userId),
          eq(personalDataConsents.consentType, consentType)
        )
      )
      .returning();
    return result[0];
  }
}

export const storage = new DrizzleStorage();
