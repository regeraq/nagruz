import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// SECURITY: Check if JWT_SECRET is properly configured
const DEFAULT_SECRET = "your-secret-key-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

// Log warning if using default secret in production
if (JWT_SECRET === DEFAULT_SECRET) {
  console.warn(
    "\n⚠️  SECURITY WARNING: Using default JWT_SECRET!\n" +
    "   This is insecure for production use.\n" +
    "   Set JWT_SECRET environment variable with a secure random string (min 32 chars).\n" +
    "   Generate one with: openssl rand -base64 32\n"
  );
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
