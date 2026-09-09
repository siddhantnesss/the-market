// Browser-side helpers: search matching, unlock memory, image processing.

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matches(query: string, productName: string, specifications: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize(`${productName} ${specifications}`);
  return q.split(" ").every((token) => {
    if (hay.includes(token)) return true;
    // forgiving: allow simple singular/plural and prefix matches
    if (token.length > 3 && hay.includes(token.slice(0, -1))) return true;
    return hay.split(" ").some((w) => w.length > 3 && token.startsWith(w.slice(0, Math.max(4, w.length - 1))));
  });
}

const UNLOCK_KEY = "the-market:unlocked";

export function readUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UNLOCK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function rememberUnlocked(id: string): void {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...readUnlocked(), id]));
  try {
    window.localStorage.setItem(UNLOCK_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export type CropSettings = { zoom: number; x: number; y: number };

export type PickedPhoto = {
  id: string;
  source: string; // original data url (downscaled)
  mode: "original" | "cropped";
  crop: CropSettings;
  preview: string;
};

const MAX_DIM = 1400;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed"));
    img.src = src;
  });
}

export async function downscale(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Square crop with zoom + pan, no filters or rotation. */
export async function renderCrop(source: string, crop: CropSettings): Promise<string> {
  const img = await loadImage(source);
  const size = Math.min(1200, Math.min(img.width, img.height) * Math.max(1, crop.zoom));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;

  const base = Math.min(img.width, img.height);
  const view = base / crop.zoom;
  const maxX = img.width - view;
  const maxY = img.height - view;
  const sx = Math.max(0, Math.min(maxX, (img.width - view) / 2 + crop.x * maxX * 0.5));
  const sy = Math.max(0, Math.min(maxY, (img.height - view) / 2 + crop.y * maxY * 0.5));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, view, view, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.82);
}
