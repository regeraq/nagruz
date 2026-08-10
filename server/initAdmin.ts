import { storage } from "./storage";
import { hashPassword } from "./auth";

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
        // SECURITY: раньше при отсутствии ADMIN_INITIAL_PASSWORD пароль
        // генерировался и печатался в stdout открытым текстом — то есть
        // попадал в логи PM2/journald/CI, откуда его может прочитать любой,
        // у кого есть доступ к логам. Пароль администратора теперь берётся
        // только из окружения и никогда не логируется.
        const finalPassword = adminPassword;

        if (!finalPassword) {
          console.error("🚨 [initAdmin] ADMIN_EMAIL задан, но ADMIN_INITIAL_PASSWORD отсутствует.");
          console.error("   Учётная запись администратора НЕ создана.");
          console.error("   Сгенерируйте пароль (openssl rand -base64 24) и задайте");
          console.error("   ADMIN_INITIAL_PASSWORD в окружении, затем перезапустите сервер.");
          return;
        }

        // Validate password strength
        if (finalPassword.length < 12) {
          console.error("🚨 [initAdmin] ADMIN_INITIAL_PASSWORD слишком короткий (минимум 12 символов).");
          console.error("   Учётная запись администратора НЕ создана.");
          return;
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
        console.log(`   ID: ${admin.id}`);
        console.log("   Пароль: взят из ADMIN_INITIAL_PASSWORD (в лог не выводится)");
        console.log("   Смените его после первого входа и удалите переменную из .env");
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
