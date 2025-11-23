export interface IStorage {
  getUserByEmail(email: string): Promise<any>;
  getUserById(id: string): Promise<any>;
  createUser(user: any): Promise<any>;
  getSessionByToken(token: string): Promise<any>;
  createSession(session: any): Promise<any>;
  deleteSession(id: string): Promise<boolean>;
  getAllNotifications(userId: string): Promise<any[]>;
  markNotificationAsRead(id: string): Promise<void>;
  getProducts(): Promise<any[]>;
  getProduct(id: string): Promise<any>;
  getContact(id: string): Promise<any>;
  createContactSubmission(data: any): Promise<any>;
  getContactSubmissions(): Promise<any[]>;
  getContactSubmission(id: string): Promise<any>;
  recordLoginAttempt(email: string, success: boolean): Promise<void>;
  getOrder(id: string): Promise<any>;
  updateOrderStatus(id: string, status: string, details?: string): Promise<any>;
  createOrder(order: any): Promise<any>;
  validatePromoCode(code: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users = new Map();
  private sessions = new Map();
  private notifications = new Map();
  private contacts = new Map();
  private orders = new Map();
  private loginAttempts = new Map();
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
    const id = crypto.randomUUID();
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
    const id = crypto.randomUUID();
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
    const id = crypto.randomUUID();
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
    const id = crypto.randomUUID();
    const newOrder = { id, ...order, createdAt: new Date(), updatedAt: new Date() };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async validatePromoCode(code: string) {
    return { valid: false, discount: 0 };
  }
}

export const storage = new MemStorage();
