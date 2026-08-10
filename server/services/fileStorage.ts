import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Локальное хранилище вложений коммерческих предложений.
 * Файлы лежат на диске, в БД — только относительный путь (uploads/...).
 * Старые записи с data: URL по-прежнему читаются из БД.
 */

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "commercial");

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-\u0400-\u04FF]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120) || "file";
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

export function isStoredFilePath(value: string): boolean {
  return value.startsWith("uploads/") && !value.includes("..");
}

export async function storeCommercialFile(
  originalName: string,
  base64OrDataUrl: string,
): Promise<{ relativePath: string; sizeBytes: number }> {
  await ensureUploadDir();

  let base64 = base64OrDataUrl;
  const dataUrlMatch = base64OrDataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (dataUrlMatch) base64 = dataUrlMatch[1];

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    throw new Error("Пустой файл");
  }

  const safeName = sanitizeFileName(originalName);
  const id = randomBytes(16).toString("hex");
  const relativePath = path.posix.join("uploads", "commercial", `${id}-${safeName}`);
  const absolutePath = path.resolve(process.cwd(), relativePath);

  // Защита от path traversal: итоговый путь обязан быть внутри UPLOAD_ROOT.
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep) && absolutePath !== UPLOAD_ROOT) {
    throw new Error("Некорректный путь файла");
  }

  await fs.writeFile(absolutePath, buffer, { mode: 0o600 });
  return { relativePath, sizeBytes: buffer.length };
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  if (!isStoredFilePath(relativePath)) {
    throw new Error("Некорректный путь файла");
  }
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Некорректный путь файла");
  }
  return fs.readFile(absolutePath);
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  if (!isStoredFilePath(relativePath)) return;
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  await fs.unlink(absolutePath).catch(() => {});
}
