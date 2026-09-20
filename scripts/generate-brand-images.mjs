/**
 * Рисует favicon и og-картинку в PNG без внешних зависимостей.
 *
 * Запуск: node scripts/generate-brand-images.mjs
 * Результат кладётся в client/public/ и коммитится — при сборке ничего не считается.
 */

import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "public");

// ─────────────────────────── PNG ───────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─────────────────────── растеризатор ───────────────────────

const SS = 4; // сглаживание через суперсэмплинг

function hex(value) {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Холст в логических координатах: рисуем по одной фигуре, снизу вверх. */
function createCanvas(width, height) {
  const w = width * SS;
  const h = height * SS;
  const buf = new Float64Array(w * h * 4); // r,g,b,a в 0..1

  function blend(px, py, color, alpha) {
    if (alpha <= 0) return;
    const i = (py * w + px) * 4;
    const dstA = buf[i + 3];
    const outA = alpha + dstA * (1 - alpha);
    if (outA <= 0) return;
    for (let c = 0; c < 3; c++) {
      buf[i + c] = (color[c] * alpha + buf[i + c] * dstA * (1 - alpha)) / outA;
    }
    buf[i + 3] = outA;
  }

  /**
   * @param {(x:number,y:number)=>boolean} inside тест в логических координатах
   * @param {(x:number,y:number)=>number[]} colorAt цвет 0..255
   */
  function fill(inside, colorAt, bbox) {
    const x0 = Math.max(0, Math.floor((bbox?.x0 ?? 0) * SS));
    const y0 = Math.max(0, Math.floor((bbox?.y0 ?? 0) * SS));
    const x1 = Math.min(w, Math.ceil((bbox?.x1 ?? width) * SS));
    const y1 = Math.min(h, Math.ceil((bbox?.y1 ?? height) * SS));
    for (let py = y0; py < y1; py++) {
      const ly = (py + 0.5) / SS;
      for (let px = x0; px < x1; px++) {
        const lx = (px + 0.5) / SS;
        if (!inside(lx, ly)) continue;
        const c = colorAt(lx, ly);
        blend(px, py, [c[0] / 255, c[1] / 255, c[2] / 255], c[3] === undefined ? 1 : c[3]);
      }
    }
  }

  function toPng() {
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const i = ((y * SS + sy) * w + (x * SS + sx)) * 4;
            const sa = buf[i + 3];
            r += buf[i] * sa;
            g += buf[i + 1] * sa;
            b += buf[i + 2] * sa;
            a += sa;
          }
        }
        const n = SS * SS;
        const o = (y * width + x) * 4;
        // premultiplied → straight
        out[o] = a > 0 ? Math.round((r / a) * 255) : 0;
        out[o + 1] = a > 0 ? Math.round((g / a) * 255) : 0;
        out[o + 2] = a > 0 ? Math.round((b / a) * 255) : 0;
        out[o + 3] = Math.round((a / n) * 255);
      }
    }
    return encodePng(width, height, out);
  }

  return { fill, toPng, width, height };
}

const gradient = (from, to, x0, y0, x1, y1) => {
  const a = hex(from);
  const b = hex(to);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const t = Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / len2));
    return mix(a, b, t);
  };
};

const solid = (color, alpha = 1) => {
  const c = hex(color);
  return () => [c[0], c[1], c[2], alpha];
};

const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const ring = (cx, cy, r, width) => (x, y) => {
  const d = Math.hypot(x - cx, y - cy);
  return d <= r && d >= r - width;
};

function polygon(points) {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

function bbox(points, pad = 0) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    x0: Math.min(...xs) - pad,
    y0: Math.min(...ys) - pad,
    x1: Math.max(...xs) + pad,
    y1: Math.max(...ys) + pad,
  };
}

/** Толстые линии с круглыми концами — из них собираем буквы. */
function strokes(segments, halfWidth) {
  return (x, y) => {
    for (const [ax, ay, bx, by] of segments) {
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
      t = Math.min(1, Math.max(0, t));
      if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= halfWidth) return true;
    }
    return false;
  };
}

// ───────────────────── фирменный знак ─────────────────────

const BRAND_FROM = "#3b82f6";
const BRAND_TO = "#1d4ed8";

/** Молния из иконочного набора (24×24), вписанная в квадрат size с центром cx,cy. */
function boltPoints(cx, cy, size) {
  const raw = [
    [13, 2],
    [3, 14],
    [12, 14],
    [11, 22],
    [21, 10],
    [12, 10],
  ];
  const s = size / 24;
  return raw.map(([x, y]) => [cx + (x - 12) * s, cy + (y - 12) * s]);
}

function drawFavicon(size) {
  const c = createCanvas(size, size);
  const r = size / 2;
  const disc = circle(r, r, r);
  c.fill(disc, gradient(BRAND_FROM, BRAND_TO, 0, 0, size, size));
  // Лёгкий блик сверху — иначе на светлом фоне выдачи круг выглядит плоским.
  // Обязательно внутри диска, иначе вокруг иконки остаётся белёсый ореол.
  const highlight = circle(r, r * 0.62, r * 0.78);
  c.fill((x, y) => disc(x, y) && highlight(x, y), () => [255, 255, 255, 0.07]);
  const bolt = boltPoints(r, r, size * 0.78);
  c.fill(polygon(bolt), solid("#ffffff"), bbox(bolt, 2));
  return c.toPng();
}

/** iOS сам скругляет углы и не любит прозрачность — фон рисуем на весь квадрат. */
function drawAppleIcon(size) {
  const c = createCanvas(size, size);
  c.fill(() => true, gradient(BRAND_FROM, BRAND_TO, 0, 0, size, size));
  const bolt = boltPoints(size / 2, size / 2, size * 0.66);
  c.fill(polygon(bolt), solid("#ffffff"), bbox(bolt, 2));
  return c.toPng();
}

// ───────────────────── штриховой шрифт ─────────────────────

// Координаты в клетке 0..1 (y вниз). Хватает букв для «VOLTKEEPER».
const GLYPHS = {
  V: [[0, 0, 0.5, 1], [0.5, 1, 1, 0]],
  L: [[0, 0, 0, 1], [0, 1, 0.92, 1]],
  T: [[0, 0, 1, 0], [0.5, 0, 0.5, 1]],
  K: [[0, 0, 0, 1], [0.95, 0, 0.08, 0.56], [0.08, 0.52, 0.95, 1]],
  E: [[0.95, 0, 0, 0], [0, 0, 0, 1], [0, 1, 0.95, 1], [0, 0.5, 0.75, 0.5]],
  P: [[0, 1, 0, 0], [0, 0, 0.7, 0], [0.7, 0, 1, 0.25], [1, 0.25, 0.7, 0.5], [0.7, 0.5, 0, 0.5]],
  R: [[0, 1, 0, 0], [0, 0, 0.7, 0], [0.7, 0, 1, 0.25], [1, 0.25, 0.7, 0.5], [0.7, 0.5, 0, 0.5], [0.42, 0.5, 1, 1]],
};

/** O рисуем отдельно — окружность ломаной. */
function ellipseSegments(steps = 28) {
  const segs = [];
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2;
    const a1 = ((i + 1) / steps) * Math.PI * 2;
    segs.push([
      0.5 + 0.5 * Math.cos(a0),
      0.5 + 0.5 * Math.sin(a0),
      0.5 + 0.5 * Math.cos(a1),
      0.5 + 0.5 * Math.sin(a1),
    ]);
  }
  return segs;
}
GLYPHS.O = ellipseSegments();

/**
 * Пары, которые без поджатия выглядят как пробел: «L T» в VOLTKEEPER читается
 * как два слова. Значение — доля ширины буквы.
 */
const KERNING = { LT: -0.26, TK: -0.06, VO: -0.04, PE: -0.04 };

function advances(text, height, tracking) {
  const width = height * 0.72;
  return [...text].map((ch, i) => {
    const pair = KERNING[text.slice(i, i + 2)] ?? 0;
    return (ch === " " ? width * 0.6 : width) + tracking + pair * width;
  });
}

function textWidth(text, height, tracking) {
  const list = advances(text, height, tracking);
  return list.reduce((a, b) => a + b, 0) - tracking;
}

function drawText(canvas, text, { x, y, height, weight, tracking, color }) {
  const width = height * 0.72;
  const steps = advances(text, height, tracking);
  let cursor = x;
  [...text].forEach((ch, i) => {
    if (ch !== " ") {
      const glyph = GLYPHS[ch];
      if (!glyph) throw new Error(`Нет глифа для «${ch}»`);
      const segs = glyph.map(([ax, ay, bx, by]) => [
        cursor + ax * width,
        y + ay * height,
        cursor + bx * width,
        y + by * height,
      ]);
      canvas.fill(strokes(segs, weight / 2), solid(color), {
        x0: cursor - weight,
        y0: y - weight,
        x1: cursor + width + weight,
        y1: y + height + weight,
      });
    }
    cursor += steps[i];
  });
}

function drawOgImage() {
  const W = 1200;
  const H = 630;
  const c = createCanvas(W, H);

  c.fill(() => true, gradient("#0b1220", "#1e3a8a", 0, 0, W, H));
  // Мягкое свечение в правом верхнем углу, чтобы фон не был «заливкой».
  c.fill(circle(W * 0.86, H * 0.12, 420), (x, y) => {
    const d = Math.hypot(x - W * 0.86, y - H * 0.12) / 420;
    return [59, 130, 246, 0.35 * (1 - d) ** 2];
  }, { x0: W * 0.86 - 420, y0: H * 0.12 - 420, x1: W, y1: H * 0.12 + 420 });

  // Логотип целиком центрируем: знак + название как единый блок.
  const markR = 84;
  const gap = 56;
  const titleH = 92;
  const tracking = 16;
  const titleW = textWidth("VOLTKEEPER", titleH, tracking);
  const blockW = markR * 2 + gap + titleW;
  const left = (W - blockW) / 2;
  const centerY = H / 2;

  const markCx = left + markR;
  c.fill(
    circle(markCx, centerY, markR),
    gradient(BRAND_FROM, BRAND_TO, markCx - markR, centerY - markR, markCx + markR, centerY + markR),
  );
  const bolt = boltPoints(markCx, centerY, markR * 1.5);
  c.fill(polygon(bolt), solid("#ffffff"), bbox(bolt, 2));

  const textX = left + markR * 2 + gap;
  drawText(c, "VOLTKEEPER", {
    x: textX,
    y: centerY - titleH / 2 - 14,
    height: titleH,
    weight: 14,
    tracking,
    color: "#ffffff",
  });

  // Подчёркивание вместо подписи кириллицей: штриховой шрифт её не умеет,
  // а смешивать латиницу с кириллицей в одном логотипе некрасиво.
  const lineY = centerY + titleH / 2 + 24;
  c.fill(
    (x, y) => x >= textX && x <= textX + titleW && y >= lineY && y <= lineY + 8,
    gradient(BRAND_FROM, "#93c5fd", textX, 0, textX + titleW, 0),
    { x0: textX, y0: lineY - 1, x1: textX + titleW + 2, y1: lineY + 9 },
  );

  // Рамка-акцент снизу
  c.fill((x, y) => y >= H - 10, gradient(BRAND_FROM, "#60a5fa", 0, 0, W, 0), { x0: 0, y0: H - 10, x1: W, y1: H });

  return c.toPng();
}

// ───────────────────────── запуск ─────────────────────────

const files = {
  "favicon-48.png": drawFavicon(48),
  "favicon-96.png": drawFavicon(96),
  "favicon-192.png": drawFavicon(192),
  "favicon.png": drawFavicon(192),
  "apple-touch-icon.png": drawAppleIcon(180),
  "og-image.png": drawOgImage(),
};

for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT_DIR, name), data);
  console.log(`✓ ${name} — ${(data.length / 1024).toFixed(1)} KB`);
}
