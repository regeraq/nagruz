import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

// SECURITY: JWT_SECRET configuration
const isProduction = process.env.NODE_ENV === "production";

// Get JWT_SECRET from environment
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (isProduction) {
    // CRITICAL: In production, JWT_SECRET MUST be set
    console.error("");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("🚨 CRITICAL SECURITY ERROR: JWT_SECRET NOT SET!");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("   In production, JWT_SECRET environment variable is REQUIRED.");
    console.error("   Without it, attackers can forge authentication tokens!");
    console.error("");
    console.error("   To fix this, add JWT_SECRET to your .env file:");
    console.error("   JWT_SECRET=your-super-secret-random-string-at-least-32-chars");
    console.error("");
    console.error("   Generate a secure secret with:");
    console.error("   openssl rand -base64 32");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("");
    
    // Exit process in production if JWT_SECRET is not set
    process.exit(1);
  } else {
    // In development, generate a random secret but warn
    JWT_SECRET = randomBytes(32).toString('hex');
    console.warn("");
    console.warn("═══════════════════════════════════════════════════════════════");
    console.warn("⚠️  DEVELOPMENT MODE: Using auto-generated JWT_SECRET");
    console.warn("═══════════════════════════════════════════════════════════════");
    console.warn("   This is fine for development, but in production you MUST set");
    console.warn("   the JWT_SECRET environment variable.");
    console.warn("");
    console.warn("   Note: Sessions will be invalidated on server restart!");
    console.warn("═══════════════════════════════════════════════════════════════");
    console.warn("");
  }
}

// Validate JWT_SECRET strength in production
if (isProduction && JWT_SECRET && JWT_SECRET.length < 32) {
  console.error("");
  console.error("🚨 SECURITY ERROR: JWT_SECRET is too short!");
  console.error("   Minimum length: 32 characters");
  console.error("   Current length: " + JWT_SECRET.length);
  console.error("");
  process.exit(1);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// SECURITY: Use stronger bcrypt rounds (12 recommended for production)
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
