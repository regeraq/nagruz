import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions, type VerifyOptions } from "jsonwebtoken";
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

// SECURITY: если оба секрета совпали (сработал fallback), access-токен
// проходит проверку как refresh-токен и наоборот — время жизни 1 день
// превращается в 7 дней. В production это недопустимо.
if (isProduction && JWT_SECRET === JWT_REFRESH_SECRET) {
  console.error("🚨 SECURITY ERROR: JWT_REFRESH_SECRET must differ from JWT_SECRET.");
  console.error("   Generate a separate value: openssl rand -base64 48");
  process.exit(1);
}

// SECURITY: явно фиксируем алгоритм подписи. Без allow-list проверка
// опирается на заголовок токена, который контролирует отправитель.
const JWT_ALGORITHM = "HS256" as const;
const VERIFY_OPTIONS: VerifyOptions = { algorithms: [JWT_ALGORITHM] };

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// SECURITY: Use stronger bcrypt rounds (12 recommended for production)
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

// Access короткий: хранится в HttpOnly cookie, при XSS JS его не читает.
// Refresh (7d) обновляет access через POST /api/auth/refresh.
const ACCESS_TOKEN_OPTIONS: SignOptions = { expiresIn: "15m", algorithm: JWT_ALGORITHM };
const REFRESH_TOKEN_OPTIONS: SignOptions = { expiresIn: "7d", algorithm: JWT_ALGORITHM };

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
  return jwt.sign({ ...payload, typ: "access" }, JWT_SECRET, ACCESS_TOKEN_OPTIONS);
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, typ: "refresh" }, JWT_REFRESH_SECRET, REFRESH_TOKEN_OPTIONS);
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS);
    if (typeof decoded === "string") return null;
    const { userId, email, role, typ } = decoded as Partial<JWTPayload> & { typ?: string };
    // `typ` появился позже — старые выданные токены (без него) остаются
    // валидными до истечения срока, но refresh-токен access-ом не станет.
    if (typ && typ !== "access") return null;
    if (!userId || !email || !role) return null;
    return { userId, email, role };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, VERIFY_OPTIONS);
    if (typeof decoded === "string") return null;
    const { userId, typ } = decoded as { userId?: string; typ?: string };
    if (typ && typ !== "refresh") return null;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
