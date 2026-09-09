import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminListing = {
  id: string;
  productName: string;
  specifications: string;
  contact: string;
  photos: string[];
  hidden: boolean;
  deleted: boolean;
  expiresAt: string;
  createdAt: string;
};

type Row = {
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

async function shape(rows: Row[]): Promise<AdminListing[]> {
  const { photoPaths, signPhotos } = await import("./market.server");
  const all = rows.flatMap((r) => photoPaths(r.photos));
  const signed = await signPhotos(all);
  const map = new Map(all.map((p, i) => [p, signed[i]] as const));
  return rows.map((r) => ({
    id: r.id,
    productName: r.product_name,
    specifications: r.specifications,
    contact: r.contact,
    photos: photoPaths(r.photos)
      .map((p) => map.get(p))
      .filter((u): u is string => Boolean(u)),
    hidden: r.hidden,
    deleted: r.deleted,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

const SELECT =
  "id, product_name, specifications, contact, photos, hidden, deleted, expires_at, created_at";

/** Grants the admin role to the first signed-in account when no admin exists yet. */
export const adminBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean; bootstrapped: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      return { isAdmin: Boolean(data), bootstrapped: false };
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    return { isAdmin: true, bootstrapped: true };
  });

export const adminMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: Boolean(data) };
  });

export const adminListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string }) => ({ query: String(input?.query ?? "") }))
  .handler(async ({ data, context }): Promise<AdminListing[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireAdmin } = await import("./market.server");
    await requireAdmin(context.userId);

    let q = supabaseAdmin.from("listings").select(SELECT).order("created_at", { ascending: false }).limit(500);
    const term = data.query.trim();
    if (term) {
      q = q.or(
        `product_name.ilike.%${term}%,specifications.ilike.%${term}%,contact.ilike.%${term}%`,
      );
    }
    const { data: rows } = await q;
    return shape((rows ?? []) as Row[]);
  });

export const adminSaveListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      productName: string;
      specifications: string;
      contact: string;
      photos: string[];
      hidden: boolean;
      deleted: boolean;
      expiresAt: string;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<AdminListing> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireAdmin, resolvePhotoInputs } = await import("./market.server");
    await requireAdmin(context.userId);

    const paths = await resolvePhotoInputs(data.photos ?? []);
    const payload = {
      product_name: String(data.productName ?? ""),
      specifications: String(data.specifications ?? ""),
      contact: String(data.contact ?? ""),
      photos: paths,
      hidden: Boolean(data.hidden),
      deleted: Boolean(data.deleted),
      expires_at: new Date(data.expiresAt).toISOString(),
    };

    const res = data.id
      ? await supabaseAdmin.from("listings").update(payload).eq("id", data.id).select(SELECT).single()
      : await supabaseAdmin.from("listings").insert(payload).select(SELECT).single();
    if (res.error || !res.data) throw new Error("Save failed");
    return (await shape([res.data as Row]))[0]!;
  });

export const adminDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireAdmin } = await import("./market.server");
    await requireAdmin(context.userId);
    await supabaseAdmin.from("listings").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminGetConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, Record<string, unknown>>> => {
    const { requireAdmin, getSettings } = await import("./market.server");
    await requireAdmin(context.userId);
    return getSettings();
  });

export const adminSaveConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: Record<string, unknown> }) => input)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireAdmin } = await import("./market.server");
    await requireAdmin(context.userId);
    await supabaseAdmin
      .from("site_settings")
      .upsert({ key: data.key, value: data.value as never }, { onConflict: "key" });
    return { ok: true };
  });
