import { generateNumericId } from "./utils";

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
}

export class MemStorage implements IStorage {
  public users = new Map();
  private sessions = new Map();
  private notifications = new Map();
  private contacts = new Map();
  private orders = new Map();
  private favorites = new Map();
  private loginAttempts = new Map();
  private promoCodes = new Map();
  private siteSettings = new Map();
  private products = [
    {
      id: "nu-100",
      name: "НУ-100",
      description: "Professional load device",
      price: "100000",
      currency: "RUB",
      sku: "NU-100",
      specifications: "100 кВт, 20 ступеней",
      stock: 10,
      category: "Industrial",
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "nu-30",
      name: "НУ-30",
      description: "Compact load device",
      price: "50000",
      currency: "RUB",
      sku: "NU-30",
      specifications: "30 кВт, 6 ступеней",
      stock: 15,
      category: "Industrial",
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  async getUserByEmail(email: string) {
    return Array.from(this.users.values()).find((u: any) => u.email === email);
  }

  async getUserById(id: string) {
    return this.users.get(id);
  }

  async createUser(user: any) {
    const id = generateNumericId();
    const newUser = {
      id,
      email: user.email,
      password: user.password || null,
      passwordHash: user.passwordHash || user.password || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      phone: user.phone || null,
      role: user.role || "user",
      isEmailVerified: user.isEmailVerified || false,
      isPhoneVerified: user.isPhoneVerified || false,
      isBlocked: user.isBlocked || false,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getSessionByToken(token: string) {
    return Array.from(this.sessions.values()).find((s: any) => s.token === token);
  }

  async createSession(session: any) {
    const id = generateNumericId();
    const newSession = { id, ...session };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async deleteSession(id: string) {
    return this.sessions.delete(id);
  }

  async getAllNotifications(userId: string) {
    return Array.from(this.notifications.values()).filter((n: any) => n.userId === userId);
  }

  async markNotificationAsRead(id: string) {
    const notif = this.notifications.get(id);
    if (notif) notif.isRead = true;
  }

  async deleteNotification(id: string) {
    return this.notifications.delete(id);
  }

  async clearUserNotifications(userId: string) {
    const notificationsToDelete = Array.from(this.notifications.values()).filter((n: any) => n.userId === userId);
    notificationsToDelete.forEach((n: any) => {
      Array.from(this.notifications.entries()).forEach(([key, val]) => {
        if (val === n) this.notifications.delete(key);
      });
    });
    return true;
  }

  async createNotification(notification: any) {
    const id = generateNumericId();
    const newNotification = { id, ...notification, createdAt: new Date() };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getProducts() {
    return this.products;
  }

  async getProduct(id: string) {
    return this.products.find((p: any) => p.id === id);
  }

  async getContact(id: string) {
    return this.contacts.get(id);
  }

  async createContactSubmission(data: any) {
    const id = generateNumericId();
    const submission = { id, ...data, createdAt: new Date() };
    this.contacts.set(id, submission);
    return submission;
  }

  async getContactSubmissions() {
    return Array.from(this.contacts.values());
  }

  async getContactSubmission(id: string) {
    return this.contacts.get(id);
  }

  async recordLoginAttempt(email: string, success: boolean) {
    if (!this.loginAttempts.has(email)) {
      this.loginAttempts.set(email, []);
    }
    const attempts = this.loginAttempts.get(email);
    attempts.push({ timestamp: new Date(), success });
    if (attempts.length > 100) attempts.shift();
  }

  async getOrder(id: string) {
    return this.orders.get(id);
  }

  async updateOrderStatus(id: string, status: string, details?: string) {
    const order = this.orders.get(id);
    if (order) {
      order.paymentStatus = status;
      order.paymentDetails = details;
      order.updatedAt = new Date();
    }
    return order;
  }

  async createOrder(order: any) {
    const product = this.products.find(p => p.id === order.productId);
    const id = generateNumericId();
    const quantity = order.quantity || 1;
    const price = product ? parseFloat(product.price) : 0;
    const totalAmount = (price * quantity).toString();
    const newOrder = { 
      id, 
      ...order, 
      quantity,
      totalAmount,
      finalAmount: totalAmount,
      productName: product?.name || "",
      productPrice: product?.price || "0",
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.orders.set(id, newOrder);
    if (product && product.stock >= quantity) {
      product.stock -= quantity;
    }
    return newOrder;
  }

  async getUserOrders(userId: string) {
    return Array.from(this.orders.values()).filter((o: any) => o.userId === userId);
  }

  async getAllOrders() {
    return Array.from(this.orders.values());
  }

  async addToFavorites(userId: string, productId: string) {
    const key = `${userId}:${productId}`;
    const product = this.products.find((p: any) => p.id === productId);
    if (!product) return null;
    const favorite = { userId, productId, product, createdAt: new Date() };
    this.favorites.set(key, favorite);
    return favorite;
  }

  async removeFavorite(userId: string, productId: string) {
    const key = `${userId}:${productId}`;
    return this.favorites.delete(key);
  }

  async getUserFavorites(userId: string) {
    return Array.from(this.favorites.values()).filter((f: any) => f.userId === userId);
  }

  async validatePromoCode(code: string) {
    const promo = Array.from(this.promoCodes.values()).find((p: any) => p.code === code);
    
    if (!promo) {
      return null;
    }
    
    if (promo.isActive === 0 || promo.isActive === false) {
      return null;
    }
    
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return null;
    }
    
    return {
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
      id: promo.id,
    };
  }

  async updateProductPrice(id: string, price: string) {
    const product = this.products.find(p => p.id === id);
    if (product) {
      product.price = price;
      product.updatedAt = new Date();
    }
    return product;
  }

  async updateProductInfo(id: string, data: any) {
    const product = this.products.find(p => p.id === id);
    if (product) {
      Object.assign(product, data, { updatedAt: new Date() });
    }
    return product;
  }

  async updateUser(id: string, data: any) {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, data, { updatedAt: new Date() });
    }
    return user;
  }

  async createProduct(product: any) {
    const id = product.id || generateNumericId();
    const newProduct = {
      id,
      ...product,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, data: any) {
    const product = this.products.find(p => p.id === id);
    if (product) {
      Object.assign(product, data, { updatedAt: new Date() });
    }
    return product;
  }

  async deleteProduct(id: string) {
    const index = this.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.products.splice(index, 1);
      return true;
    }
    return false;
  }

  async deleteProducts(ids: string[]) {
    let deleted = 0;
    for (const id of ids) {
      const index = this.products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.products.splice(index, 1);
        deleted++;
      }
    }
    return deleted;
  }

  async deleteContactSubmission(id: string) {
    return this.contacts.delete(id);
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: string, role: string) {
    const user = this.users.get(id);
    if (user) {
      user.role = role;
      user.updatedAt = new Date();
    }
    return user;
  }

  async blockUser(id: string, blocked: boolean) {
    const user = this.users.get(id);
    if (user) {
      user.isBlocked = blocked;
      user.updatedAt = new Date();
    }
    return user;
  }

  async deleteUser(id: string) {
    const deleted = this.users.delete(id);
    if (deleted) {
      Array.from(this.sessions.values()).forEach((s: any) => {
        if (s.userId === id) {
          Array.from(this.sessions.entries()).forEach(([key, val]) => {
            if (val === s) this.sessions.delete(key);
          });
        }
      });
    }
    return deleted;
  }

  async getPromoCodes() {
    return Array.from(this.promoCodes.values());
  }

  async getPromoCode(id: string) {
    return this.promoCodes.get(id);
  }

  async createPromoCode(promo: any) {
    const id = generateNumericId();
    const newPromo = {
      id,
      ...promo,
      createdAt: new Date(),
    };
    this.promoCodes.set(id, newPromo);
    return newPromo;
  }

  async updatePromoCode(id: string, data: any) {
    const promo = this.promoCodes.get(id);
    if (promo) {
      Object.assign(promo, data);
    }
    return promo;
  }

  async deletePromoCode(id: string) {
    return this.promoCodes.delete(id);
  }

  async getSiteSettings() {
    return Array.from(this.siteSettings.values());
  }

  async getSiteSetting(key: string) {
    return Array.from(this.siteSettings.values()).find((s: any) => s.key === key);
  }

  async setSiteSetting(key: string, value: string, type: string = 'string', description?: string) {
    let setting = Array.from(this.siteSettings.values()).find((s: any) => s.key === key);
    if (setting) {
      setting.value = value;
      setting.type = type;
      if (description) setting.description = description;
      setting.updatedAt = new Date();
    } else {
      const id = generateNumericId();
      setting = {
        id,
        key,
        value,
        type,
        description: description || '',
        updatedAt: new Date(),
      };
      this.siteSettings.set(id, setting);
    }
    return setting;
  }
}

export const storage = new MemStorage();
