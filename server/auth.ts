import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { randomBytes } from "crypto";

// SECURITY: JWT_SECRET configuration
const isProduction = process.env.NODE_ENV === "production";

function resolveSecret(envKey: string, fallbackFrom?: string): string {
  let value = process.env[envKey];

  if (!value && fallbackFrom) {
    // Позволяет в старых развёртываниях не ломать refresh-токены,
    // пока клиент не обновит .env до отдельного секрета.
    value = process.env[fallbackFrom];
  }

  if (!value) {
    if (isProduction) {
      console.error("");
      console.error("═══════════════════════════════════════════════════════════════");
      console.error(`🚨 CRITICAL SECURITY ERROR: ${envKey} NOT SET!`);
      console.error("═══════════════════════════════════════════════════════════════");
      console.error(`   In production, ${envKey} environment variable is REQUIRED.`);
      console.error("   Without it, attackers can forge authentication tokens!");
      console.error("");
      console.error("   Generate a secure secret with:");
      console.error("   openssl rand -base64 48");
      console.error("═══════════════════════════════════════════════════════════════");
      console.error("");
      process.exit(1);
    }

    value = randomBytes(48).toString("hex");
    console.warn(`⚠️  DEVELOPMENT MODE: Using auto-generated ${envKey}`);
    console.warn("   Sessions will be invalidated on server restart.");
  }

  if (isProduction && value.length < 32) {
    console.error(`🚨 SECURITY ERROR: ${envKey} is too short (need ≥32 chars).`);
    process.exit(1);
  }

  return value;
}

const JWT_SECRET: Secret = resolveSecret("JWT_SECRET");
const JWT_REFRESH_SECRET: Secret = resolveSecret("JWT_REFRESH_SECRET", "JWT_SECRET");

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// SECURITY: Use stronger bcrypt rounds (12 recommended for production)
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

const ACCESS_TOKEN_OPTIONS: SignOptions = { expiresIn: "1d" };
const REFRESH_TOKEN_OPTIONS: SignOptions = { expiresIn: "7d" };

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
  return jwt.sign(payload, JWT_SECRET, ACCESS_TOKEN_OPTIONS);
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, REFRESH_TOKEN_OPTIONS);
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") return null;
    const { userId, email, role } = decoded as Partial<JWTPayload>;
    if (!userId || !email || !role) return null;
    return { userId, email, role };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (typeof decoded === "string") return null;
    const userId = (decoded as { userId?: string }).userId;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
