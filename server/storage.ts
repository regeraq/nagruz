import { createId } from "@paralleldrive/cuid2";

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
  getContact(id: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users = new Map();
  private sessions = new Map();
  private notifications = new Map();
  private products = [
    {
      id: "nu-100",
      name: "НУ-100",
      description: "Professional load device",
      price: "100000",
      currency: "RUB",
      sku: "NU-100",
      specifications: "100 кВт, 20 ступеней",
    },
  ];

  async getUserByEmail(email: string) {
    return Array.from(this.users.values()).find((u: any) => u.email === email);
  }

  async getUserById(id: string) {
    return this.users.get(id);
  }

  async createUser(user: any) {
    const id = createId();
    const newUser = { id, ...user, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  async getSessionByToken(token: string) {
    return Array.from(this.sessions.values()).find((s: any) => s.token === token);
  }

  async createSession(session: any) {
    const id = createId();
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

  async getContact(id: string) {
    return null;
  }
}

export const storage = new MemStorage();
