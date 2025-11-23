import { storage } from "./storage";
import { hashPassword } from "./auth";

/**
 * Initialize default admin account
 * This should be called on server startup or migration
 */
export async function initAdminAccount(): Promise<void> {
  try {
    const adminEmail = "rostext@gmail.com";
    const adminPassword = "125607";

    // Check if admin already exists
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (existingAdmin) {
      console.log("Admin account already exists");
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(adminPassword);

    // Create admin user
    const admin = await storage.createUser({
      email: adminEmail,
      password: adminPassword, // This won't be used, but required by schema
      passwordHash,
      role: "superadmin",
      isEmailVerified: true, // Auto-verify admin email
      isPhoneVerified: false,
      isBlocked: false,
    });

    console.log(`Admin account created successfully: ${adminEmail}`);
    console.log(`Admin ID: ${admin.id}`);
  } catch (error) {
    console.error("Error initializing admin account:", error);
    throw error;
  }
}

