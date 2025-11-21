import { 
  type ContactSubmission, 
  type InsertContactSubmission,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type PromoCode,
  type InsertPromoCode
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(): Promise<ContactSubmission[]>;
  getContactSubmission(id: string): Promise<ContactSubmission | undefined>;
  
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string, paymentDetails?: string): Promise<Order | undefined>;
  
  validatePromoCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
}

export class MemStorage implements IStorage {
  private contactSubmissions: Map<string, ContactSubmission>;
  private products: Map<string, Product>;
  private orders: Map<string, Order>;
  private promoCodes: Map<string, PromoCode>;

  constructor() {
    this.contactSubmissions = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.promoCodes = new Map();
    this.initializeProducts();
    this.initializePromoCodes();
  }

  private initializeProducts() {
    const nu100: Product = {
      id: "nu-100",
      name: "НУ-100",
      description: "Профессиональное нагрузочное устройство для тестирования дизель-генераторов, газопоршневых и газотурбинных установок, ИБП и аккумуляторных батарей",
      price: "2850000.00",
      currency: "RUB",
      sku: "NU-100-2025",
      specifications: JSON.stringify({
        power: "100 кВт",
        steps: "20 ступеней",
        voltage: "AC/DC",
        acVoltage: "230-400 В",
        dcVoltage: "110-220 В",
        frequency: "50 Гц",
        phases: "3",
        cosφ: "0.99",
        cooling: "Воздушное принудительное"
      }),
      createdAt: new Date()
    };
    
    const nu30: Product = {
      id: "nu-30",
      name: "НУ-30",
      description: "Компактное нагрузочное устройство для тестирования генераторов, ИБП и источников питания мощностью до 30 кВт",
      price: "980000.00",
      currency: "RUB",
      sku: "NU-30-2025",
      specifications: JSON.stringify({
        power: "30 кВт",
        steps: "6 ступеней",
        voltage: "AC/DC",
        acVoltage: "230-400 В",
        dcVoltage: "110-220 В",
        frequency: "50 Гц",
        phases: "3",
        cosφ: "0.99",
        cooling: "Воздушное принудительное"
      }),
      createdAt: new Date()
    };

    this.products.set("nu-100", nu100);
    this.products.set("nu-30", nu30);
  }

  private initializePromoCodes() {
    const promo1: PromoCode = {
      id: randomUUID(),
      code: "WELCOME2025",
      discountPercent: 10,
      expiresAt: new Date("2025-12-31"),
      isActive: 1,
      createdAt: new Date()
    };
    
    const promo2: PromoCode = {
      id: randomUUID(),
      code: "INDUSTRIAL15",
      discountPercent: 15,
      expiresAt: new Date("2025-12-31"),
      isActive: 1,
      createdAt: new Date()
    };

    this.promoCodes.set(promo1.code.toUpperCase(), promo1);
    this.promoCodes.set(promo2.code.toUpperCase(), promo2);
  }

  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const id = randomUUID();
    const submission: ContactSubmission = {
      ...insertSubmission,
      id,
      fileName: insertSubmission.fileName ?? null,
      fileData: insertSubmission.fileData ?? null,
      createdAt: new Date(),
    };
    this.contactSubmissions.set(id, submission);
    return submission;
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return Array.from(this.contactSubmissions.values());
  }

  async getContactSubmission(id: string): Promise<ContactSubmission | undefined> {
    return this.contactSubmissions.get(id);
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const product: Product = {
      ...insertProduct,
      createdAt: new Date(),
    };
    this.products.set(product.id, product);
    return product;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      discountAmount: insertOrder.discountAmount ?? "0",
      promoCode: insertOrder.promoCode ?? null,
      customerName: insertOrder.customerName ?? null,
      customerEmail: insertOrder.customerEmail ?? null,
      customerPhone: insertOrder.customerPhone ?? null,
      paymentDetails: insertOrder.paymentDetails ?? null,
      reservedUntil: insertOrder.reservedUntil ?? null,
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrderStatus(id: string, status: string, paymentDetails?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      order.paymentStatus = status;
      if (paymentDetails) {
        order.paymentDetails = paymentDetails;
      }
      this.orders.set(id, order);
    }
    return order;
  }

  async validatePromoCode(code: string): Promise<PromoCode | undefined> {
    const promo = this.promoCodes.get(code.toUpperCase());
    if (!promo || promo.isActive !== 1) {
      return undefined;
    }
    
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return undefined;
    }
    
    return promo;
  }

  async createPromoCode(insertPromoCode: InsertPromoCode): Promise<PromoCode> {
    const id = randomUUID();
    const promoCode: PromoCode = {
      ...insertPromoCode,
      id,
      expiresAt: insertPromoCode.expiresAt ?? null,
      createdAt: new Date(),
    };
    this.promoCodes.set(promoCode.code.toUpperCase(), promoCode);
    return promoCode;
  }
}

export const storage = new MemStorage();
