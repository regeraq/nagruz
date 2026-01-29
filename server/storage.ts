import { db } from "./db";
import { 
  users, products, orders, notifications, favorites, sessions,
  contactSubmissions, loginAttempts, promoCodes, siteSettings,
  siteContent, siteContacts, cookieSettings, personalDataConsents
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUserByEmail(email: string): Promise<any>;
  getUserById(id: string): Promise<any>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  getSessionByToken(token: string): Promise<any>;
  createSession(session: any): Promise<any>;
  deleteSession(id: string): Promise<boolean>;
  getAllNotifications(userId: string): Promise<any[]>;
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
  recordLoginAttempt(email: string, success: boolean): Promise<void>;
  getOrder(id: string): Promise<any>;
  updateOrderStatus(id: string, status: string, details?: string): Promise<any>;
  createOrder(order: any): Promise<any>;
  getUserOrders(userId: string): Promise<any[]>;
  getAllOrders(): Promise<any[]>;
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
  setSiteSetting(key: string, value: string, type?: string, description?: string): Promise<any>;
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

  async getAllNotifications(userId: string) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
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
      isActive: product.isActive !== undefined ? product.isActive : true,
    }).returning();
    return result[0];
  }

  async updateProduct(id: string, data: any) {
    const updateData: any = { ...data };
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
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
    const result = await db.update(products).set(data).where(eq(products.id, id)).returning();
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

  async recordLoginAttempt(email: string, success: boolean) {
    await db.insert(loginAttempts).values({
      id: undefined,
      email,
      success,
      ipAddress: null,
    });
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
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async getAllOrders() {
    return await db.select().from(orders);
  }

  async addToFavorites(userId: string, productId: string) {
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
    
    // isActive is integer (1 or 0), not boolean
    const isActive = promo.isActive === 1 || promo.isActive === true;
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

  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
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

  async setSiteSetting(key: string, value: string, type: string = "string", description?: string) {
    const existing = await this.getSiteSetting(key);
    if (existing) {
      const result = await db.update(siteSettings).set({ value, type, description }).where(eq(siteSettings.key, key)).returning();
      return result[0];
    } else {
      const result = await db.insert(siteSettings).values({
        id: undefined,
        key,
        value,
        type,
        description: description || "",
      }).returning();
      return result[0];
    }
  }

  async getProductImages(productId: string): Promise<string[]> {
    const product = await this.getProduct(productId);
    if (!product) return [];
    if (!product.images) return [];
    try {
      return JSON.parse(product.images);
    } catch {
      return [];
    }
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
