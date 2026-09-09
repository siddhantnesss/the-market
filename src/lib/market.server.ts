// Server-only helpers for The Market. Never imported from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const BUCKET = "listing-photos";
const SIGNED_URL_TTL = 60 * 60 * 48; // 48h

export type PublicListing = {
  id: string;
  productName: string;
  specifications: string;
  photos: string[];
  createdAt: string;
  expiresAt: string;
  hasContact: boolean;
};

export type ListingRow = {
  id: string;
  product_name: string;
  specifications: string;
  contact: string;
  photos: unknown;
  hidden: boolean;
  deleted: boolean;
  expires_at: string;
  created_at: string;
};

export function photoPaths(photos: unknown): string[] {
  if (!Array.isArray(photos)) return [];
  return photos.filter((p): p is string => typeof p === "string" && p.length > 0);
}

export async function signPhotos(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }
  return paths.map((p) => map.get(p)).filter((u): u is string => Boolean(u));
}

export async function toPublicListing(row: ListingRow): Promise<PublicListing> {
  return {
    id: row.id,
    productName: row.product_name,
    specifications: row.specifications,
    photos: await signPhotos(photoPaths(row.photos)),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    hasContact: row.contact.trim().length > 0,
  };
}

export async function toPublicListings(rows: ListingRow[]): Promise<PublicListing[]> {
  const all = rows.flatMap((r) => photoPaths(r.photos));
  const signed = await signPhotos(all);
  const map = new Map(all.map((p, i) => [p, signed[i]] as const));
  return rows.map((row) => ({
    id: row.id,
    productName: row.product_name,
    specifications: row.specifications,
    photos: photoPaths(row.photos)
      .map((p) => map.get(p))
      .filter((u): u is string => Boolean(u)),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    hasContact: row.contact.trim().length > 0,
  }));
}

const MAX_BYTES = 4 * 1024 * 1024;

// Accepts data URLs (already resized/compressed in the browser) and stores them.
export async function uploadPhotos(dataUrls: string[]): Promise<string[]> {
  const paths: string[] = [];
  for (const dataUrl of dataUrls.slice(0, 5)) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
    if (!match) continue;
    const mime = match[1]!;
    const bytes = Buffer.from(match[2]!, "base64");
    if (bytes.byteLength > MAX_BYTES) continue;
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (!error) paths.push(path);
  }
  return paths;
}

// Photo inputs may be existing storage paths, existing signed URLs, or new data URLs.
export async function resolvePhotoInputs(inputs: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const input of inputs.slice(0, 5)) {
    if (input.startsWith("data:")) {
      const [p] = await uploadPhotos([input]);
      if (p) out.push(p);
    } else if (input.includes(`/${BUCKET}/`)) {
      const after = input.split(`/${BUCKET}/`)[1]!.split("?")[0]!;
      out.push(decodeURIComponent(after));
    } else if (!input.startsWith("http")) {
      out.push(input);
    }
  }
  return out;
}

export async function requireAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden");
}

export async function getSettings(): Promise<Record<string, Record<string, unknown>>> {
  const { data } = await supabaseAdmin.from("site_settings").select("key, value");
  const out: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    out[row.key] = (row.value ?? {}) as Record<string, unknown>;
  }
  return out;
}
