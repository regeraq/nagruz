import { storage } from "./storage";
import { hashPassword } from "./auth";

/**
 * Initialize default admin account and products
 * This should be called on server startup or migration
 */
export async function initAdminAccount(): Promise<void> {
  try {
    const adminEmail = "rostext@gmail.com";
    const adminPassword = "125607";

    // Check if admin already exists
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (!existingAdmin) {
      // Hash password
      const passwordHash = await hashPassword(adminPassword);

      // Create admin user
      const admin = await storage.createUser({
        email: adminEmail,
        password: adminPassword,
        passwordHash,
        role: "superadmin",
        isEmailVerified: true,
        isPhoneVerified: false,
        isBlocked: false,
      });

      console.log(`Admin account created successfully: ${adminEmail}`);
      console.log(`Admin ID: ${admin.id}`);
    } else {
      console.log("Admin account already exists");
    }

    // Initialize default products (ONLY if they don't exist)
    const defaultProducts = [
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
        images: null,
        isActive: true,
      },
      {
        id: "nu-200",
        name: "НУ-200",
        description: "Powerful load device",
        price: "150000",
        currency: "RUB",
        sku: "NU-200",
        specifications: "200 кВт, 40 ступеней",
        stock: 8,
        category: "Industrial",
        imageUrl: null,
        images: null,
        isActive: true,
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
        images: null,
        isActive: true,
      },
    ];

    for (const defaultProduct of defaultProducts) {
      const existingProduct = await storage.getProduct(defaultProduct.id);
      if (!existingProduct) {
        console.log(`🔄 [initAdmin] Creating product: ${defaultProduct.id}`);
        await storage.createProduct(defaultProduct);
      } else {
        console.log(`✅ [initAdmin] Product already exists: ${defaultProduct.id} (preserving images)`);
      }
    }
    console.log("Default products initialized successfully");
  } catch (error) {
    console.error("Error initializing admin account:", error);
    throw error;
  }
}
