import { createServerFn } from "@tanstack/react-start";

export type MarketListing = {
  id: string;
  productName: string;
  specifications: string;
  photos: string[];
  createdAt: string;
  expiresAt: string;
  hasContact: boolean;
};

export type MarketCopy = Record<string, string>;

export const DEFAULT_COPY: MarketCopy = {
  brand: "THE MARKET",
  tagline: "We help you find buyers.",
  enterLabel: "Enter",
  sellButton: "I want to sell something.",
  sellHeading: "What do you have to sell?",
  searchPlaceholder: "search The Market",
  emptyMarket: "the market is waiting...",
  noResults: "maybe search for something different?",
  expiryNote: "any listing stays on for 24 hours",
  unlockLabel: "Unlock",
  contactLabel: "Contact",
  submitLabel: "Enter The Market",
  photosLabel: "Add up to 5",
  instagramHandle: "@siddhantness",
  instagramUrl: "https://instagram.com/siddhantness",
};

export const DEFAULT_LIMITS = {
  productNameMax: 50,
  specificationsMax: 100,
  contactMax: 50,
  maxPhotos: 5,
  listingHours: 24,
};

export type MarketData = {
  copy: MarketCopy;
  limits: typeof DEFAULT_LIMITS;
  listings: MarketListing[];
};

export const getMarket = createServerFn({ method: "GET" }).handler(async (): Promise<MarketData> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { toPublicListings, getSettings } = await import("./market.server");

  const [{ data: rows }, settings] = await Promise.all([
    supabaseAdmin
      .from("listings")
      .select("id, product_name, specifications, contact, photos, hidden, deleted, expires_at, created_at")
      .eq("hidden", false)
      .eq("deleted", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    getSettings(),
  ]);

  return {
    copy: { ...DEFAULT_COPY, ...((settings["copy"] ?? {}) as MarketCopy) },
    limits: { ...DEFAULT_LIMITS, ...((settings["settings"] ?? {}) as typeof DEFAULT_LIMITS) },
    listings: await toPublicListings((rows ?? []) as never),
  };
});

export const unlockContact = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id || typeof input.id !== "string") throw new Error("Bad request");
    return { id: input.id };
  })
  .handler(async ({ data }): Promise<{ contact: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("listings")
      .select("contact, hidden, deleted, expires_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.hidden || row.deleted || new Date(row.expires_at) <= new Date()) {
      throw new Error("Listing unavailable");
    }
    return { contact: row.contact };
  });

export const createListing = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { productName: string; specifications: string; contact: string; photos: string[] }) => {
      const productName = String(input?.productName ?? "").slice(0, 50).trim();
      const specifications = String(input?.specifications ?? "").slice(0, 100).trim();
      const contact = String(input?.contact ?? "").slice(0, 50).trim();
      const photos = Array.isArray(input?.photos)
        ? input.photos.filter((p) => typeof p === "string").slice(0, 5)
        : [];
      if (!productName && !specifications && !contact && photos.length === 0) {
        throw new Error("Empty listing");
      }
      return { productName, specifications, contact, photos };
    },
  )
  .handler(async ({ data }): Promise<MarketListing> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { uploadPhotos, toPublicListing, getSettings } = await import("./market.server");

    const settings = await getSettings();
    const hours = Number((settings["settings"] as { listingHours?: number })?.listingHours ?? 24);
    const paths = await uploadPhotos(data.photos);

    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .insert({
        product_name: data.productName,
        specifications: data.specifications,
        contact: data.contact,
        photos: paths,
        expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
      })
      .select("id, product_name, specifications, contact, photos, hidden, deleted, expires_at, created_at")
      .single();
    if (error || !row) throw new Error("Could not create listing");

    return toPublicListing(row as never);
  });
