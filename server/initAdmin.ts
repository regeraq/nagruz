import { storage } from "./storage";
import { hashPassword } from "./auth";
import { randomBytes } from "crypto";

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * Initialize default admin account and products
 * This should be called on server startup or migration
 * 
 * SECURITY: Admin credentials must be provided via environment variables
 * Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD in your .env file
 */
export async function initAdminAccount(): Promise<void> {
  try {
    // SECURITY: Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    
    // Validate admin email is provided
    if (!adminEmail) {
      console.log("ℹ️  [initAdmin] ADMIN_EMAIL not set in environment variables");
      console.log("   To create an admin account, set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD in .env");
      console.log("   Example:");
      console.log("     ADMIN_EMAIL=admin@yourdomain.com");
      console.log("     ADMIN_INITIAL_PASSWORD=YourSecurePassword123!");
      // Don't throw - allow server to start without admin
    } else {
      // Check if admin already exists
      const existingAdmin = await storage.getUserByEmail(adminEmail);
      
      if (!existingAdmin) {
        // Use provided password or generate a secure one
        let finalPassword = adminPassword;
        let passwordGenerated = false;
        
        if (!finalPassword) {
          finalPassword = generateSecurePassword(20);
          passwordGenerated = true;
        }
        
        // Validate password strength
        if (finalPassword.length < 12) {
          console.error("🚨 [initAdmin] SECURITY WARNING: ADMIN_INITIAL_PASSWORD is too weak (min 12 characters)");
          console.error("   Generating a secure password instead...");
          finalPassword = generateSecurePassword(20);
          passwordGenerated = true;
        }
        
        // Hash password
        const passwordHash = await hashPassword(finalPassword);

        // Create admin user (DON'T pass plain password to storage)
        const admin = await storage.createUser({
          email: adminEmail,
          passwordHash,
          role: "superadmin",
          isEmailVerified: true,
          isPhoneVerified: false,
          isBlocked: false,
        });

        console.log("");
        console.log("═══════════════════════════════════════════════════════════════");
        console.log("🔐 ADMIN ACCOUNT CREATED SUCCESSFULLY");
        console.log("═══════════════════════════════════════════════════════════════");
        console.log(`   Email: ${adminEmail}`);
        console.log(`   ID: ${admin.id}`);
        if (passwordGenerated) {
          console.log("");
          console.log("⚠️  AUTO-GENERATED PASSWORD (save it securely!):");
          console.log(`   Password: ${finalPassword}`);
          console.log("");
          console.log("   IMPORTANT: Change this password immediately after first login!");
          console.log("   Set ADMIN_INITIAL_PASSWORD in .env to use your own password.");
        } else {
          console.log("   Password: [using ADMIN_INITIAL_PASSWORD from .env]");
        }
        console.log("═══════════════════════════════════════════════════════════════");
        console.log("");
      } else {
        console.log("✅ [initAdmin] Admin account already exists");
      }
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
