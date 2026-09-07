import { createServerFn } from "@tanstack/react-start";

export const TRIAL_BALANCE = 1000;
export const LIST_PRICE = 1000;
export const UNLOCK_PRICE = 1000;

export type Account = {
  id: string;
  name: string;
  balance: number;
};

export type Listing = {
  id: string;
  sellerName: string;
  title: string;
  details: string;
  price: string;
  quantity: string;
  location: string;
  isSample: boolean;
  createdAt: string;
  mine: boolean;
  unlocked: boolean;
  contact: string | null;
};

const clientIdOf = (v: unknown) => {
  const id = (v as { clientId?: unknown })?.clientId;
  if (typeof id !== "string" || id.length < 8) throw new Error("Missing account");
  return id;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function accountByClientId(clientId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("market_accounts")
    .select("id, name, balance")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Creates the account once and grants the one-time trial balance. */
export const enterMarket = createServerFn({ method: "POST" })
  .inputValidator((input: { clientId: string; name: string }) => ({
    clientId: clientIdOf(input),
    name: String(input.name ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data }): Promise<Account> => {
    if (!data.name) throw new Error("Name required");
    const db = await admin();
    const existing = await accountByClientId(data.clientId);
    if (existing) {
      // Renaming never re-grants the trial balance.
      const { data: updated, error } = await db
        .from("market_accounts")
        .update({ name: data.name })
        .eq("id", existing.id)
        .select("id, name, balance")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: created, error } = await db
      .from("market_accounts")
      .insert({
        client_id: data.clientId,
        name: data.name,
        balance: TRIAL_BALANCE,
        trial_granted: true,
      })
      .select("id, name, balance")
      .single();
    if (error) throw new Error(error.message);
    await db.from("market_wallet_entries").insert({
      account_id: created.id,
      amount: TRIAL_BALANCE,
      kind: "trial",
    });
    return created;
  });

export const getAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { clientId: string }) => ({ clientId: clientIdOf(input) }))
  .handler(async ({ data }): Promise<Account | null> => accountByClientId(data.clientId));

export const renameAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { clientId: string; name: string }) => ({
    clientId: clientIdOf(input),
    name: String(input.name ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data }): Promise<Account> => {
    if (!data.name) throw new Error("Name required");
    const db = await admin();
    const { data: updated, error } = await db
      .from("market_accounts")
      .update({ name: data.name })
      .eq("client_id", data.clientId)
      .select("id, name, balance")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const listMarket = createServerFn({ method: "POST" })
  .inputValidator((input: { clientId: string }) => ({ clientId: clientIdOf(input) }))
  .handler(async ({ data }): Promise<Listing[]> => {
    const db = await admin();
    const account = await accountByClientId(data.clientId);
    const { data: rows, error } = await db
      .from("market_listings")
      .select("id, account_id, seller_name, title, details, price, quantity, location, contact, is_sample, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    let unlockedIds = new Set<string>();
    if (account) {
      const { data: unlocks } = await db
        .from("market_unlocks")
        .select("listing_id")
        .eq("account_id", account.id);
      unlockedIds = new Set((unlocks ?? []).map((u) => u.listing_id));
    }

    return (rows ?? []).map((r) => {
      const mine = !!account && r.account_id === account.id;
      const unlocked = mine || unlockedIds.has(r.id);
      return {
        id: r.id,
        sellerName: r.seller_name,
        title: r.title,
        details: r.details,
        price: r.price,
        quantity: r.quantity,
        location: r.location,
        isSample: r.is_sample,
        createdAt: r.created_at,
        mine,
        unlocked,
        contact: unlocked ? r.contact : null,
      };
    });
  });

export const createListing = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      clientId: string;
      title: string;
      details: string;
      price: string;
      quantity: string;
      location: string;
      contact: string;
    }) => ({
      clientId: clientIdOf(input),
      title: String(input.title ?? "").trim().slice(0, 120),
      details: String(input.details ?? "").trim().slice(0, 2000),
      price: String(input.price ?? "").trim().slice(0, 60),
      quantity: String(input.quantity ?? "").trim().slice(0, 60),
      location: String(input.location ?? "").trim().slice(0, 80),
      contact: String(input.contact ?? "").trim().slice(0, 300),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: string; balance?: number }> => {
    if (!data.title || !data.details || !data.contact) {
      return { ok: false, reason: "missing" };
    }
    const db = await admin();
    const account = await accountByClientId(data.clientId);
    if (!account) return { ok: false, reason: "no-account" };
    if (account.balance < LIST_PRICE) return { ok: false, reason: "balance", balance: account.balance };

    const { data: debited, error: debitError } = await db
      .from("market_accounts")
      .update({ balance: account.balance - LIST_PRICE })
      .eq("id", account.id)
      .gte("balance", LIST_PRICE)
      .select("balance")
      .maybeSingle();
    if (debitError) throw new Error(debitError.message);
    if (!debited) return { ok: false, reason: "balance", balance: account.balance };

    const { data: listing, error } = await db
      .from("market_listings")
      .insert({
        account_id: account.id,
        seller_name: account.name,
        title: data.title,
        details: data.details,
        price: data.price,
        quantity: data.quantity,
        location: data.location,
        contact: data.contact,
      })
      .select("id")
      .single();
    if (error) {
      await db.from("market_accounts").update({ balance: account.balance }).eq("id", account.id);
      throw new Error(error.message);
    }
    await db.from("market_wallet_entries").insert({
      account_id: account.id,
      amount: -LIST_PRICE,
      kind: "listing",
      listing_id: listing.id,
    });
    return { ok: true, balance: debited.balance };
  });

export const unlockListing = createServerFn({ method: "POST" })
  .inputValidator((input: { clientId: string; listingId: string }) => ({
    clientId: clientIdOf(input),
    listingId: String(input.listingId ?? ""),
  }))
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; reason?: string; balance?: number; contact?: string }> => {
      const db = await admin();
      const account = await accountByClientId(data.clientId);
      if (!account) return { ok: false, reason: "no-account" };

      const { data: listing, error: listingError } = await db
        .from("market_listings")
        .select("id, account_id, contact")
        .eq("id", data.listingId)
        .maybeSingle();
      if (listingError) throw new Error(listingError.message);
      if (!listing) return { ok: false, reason: "missing" };
      if (listing.account_id === account.id) {
        return { ok: true, balance: account.balance, contact: listing.contact };
      }

      const { data: already } = await db
        .from("market_unlocks")
        .select("id")
        .eq("account_id", account.id)
        .eq("listing_id", listing.id)
        .maybeSingle();
      if (already) return { ok: true, balance: account.balance, contact: listing.contact };

      if (account.balance < UNLOCK_PRICE)
        return { ok: false, reason: "balance", balance: account.balance };

      const { data: debited, error: debitError } = await db
        .from("market_accounts")
        .update({ balance: account.balance - UNLOCK_PRICE })
        .eq("id", account.id)
        .gte("balance", UNLOCK_PRICE)
        .select("balance")
        .maybeSingle();
      if (debitError) throw new Error(debitError.message);
      if (!debited) return { ok: false, reason: "balance", balance: account.balance };

      const { error: unlockError } = await db
        .from("market_unlocks")
        .insert({ account_id: account.id, listing_id: listing.id });
      if (unlockError) {
        await db.from("market_accounts").update({ balance: account.balance }).eq("id", account.id);
        throw new Error(unlockError.message);
      }
      await db.from("market_wallet_entries").insert({
        account_id: account.id,
        amount: -UNLOCK_PRICE,
        kind: "unlock",
        listing_id: listing.id,
      });
      return { ok: true, balance: debited.balance, contact: listing.contact };
    },
  );
