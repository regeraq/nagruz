import { db } from "./db";
import { 
  users, products, orders, notifications, favorites, sessions,
  contactSubmissions, loginAttempts, promoCodes, siteSettings
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
    const result = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    const promo = result[0];
    
    if (!promo) return null;
    if (!promo.isActive) return null;
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return null;
    
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
    const result = await db.insert(promoCodes).values({
      id: promo.id || undefined,
      code: promo.code,
      discountPercent: promo.discountPercent,
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
      isActive: promo.isActive || 1,
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
    
    if (!images.includes(imageUrl)) {
      images.push(imageUrl);
      await this.updateProduct(productId, { images: JSON.stringify(images) });
    }
    
    return { ...product, images };
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
}

export const storage = new DrizzleStorage();
