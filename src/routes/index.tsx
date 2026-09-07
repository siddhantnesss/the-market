import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import {
  enterMarket,
  getAccount,
  renameAccount,
  listMarket,
  createListing,
  unlockListing,
  type Account,
  type Listing,
} from "@/lib/market.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "THE MARKET — We help you find buyers." },
      {
        name: "description",
        content:
          "List what you have to sell and let serious buyers find you. Enter with your name and a ₹1,000 trial balance.",
      },
      { property: "og:title", content: "THE MARKET — We help you find buyers." },
      {
        property: "og:description",
        content: "List what you have to sell and let serious buyers find you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const CLIENT_KEY = "the-market:client";

function getClientId(): string {
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

/* ---------------- shared pieces ---------------- */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-border bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls =
    "mt-2 w-full border-b border-border bg-transparent py-2 font-display text-lg text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent";
  return (
    <label className="block">
      <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          rows={3}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className={cls}
        />
      )}
    </label>
  );
}

/* ---------------- entry ---------------- */

function Entry({ onEnter, busy }: { onEnter: (name: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-16">
      <form
        className="mx-auto w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onEnter(value.trim());
        }}
      >
        <h1 className="font-display text-5xl font-black tracking-tight text-foreground">
          THE MARKET
        </h1>
        <p className="mt-6 font-display text-2xl text-foreground">We help you find buyers.</p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          autoFocus
          className="mt-14 w-full border-b-2 border-foreground bg-transparent py-3 font-display text-2xl text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent"
        />

        <p className="mt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Trial money: ₹1,000
        </p>

        <button
          type="submit"
          disabled={!value.trim() || busy}
          className="mt-10 w-full bg-primary py-4 font-mono text-sm tracking-widest text-primary-foreground uppercase transition-colors enabled:hover:bg-accent disabled:opacity-40"
        >
          {busy ? "Entering" : "Enter"}
        </button>
      </form>
    </div>
  );
}

/* ---------------- listings ---------------- */

function ListingRow({
  listing,
  onUnlock,
  busy,
}: {
  listing: Listing;
  onUnlock: (l: Listing) => void;
  busy: boolean;
}) {
  return (
    <article className="border-t border-border py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-2xl leading-snug text-foreground">{listing.title}</h3>
        {listing.price ? (
          <p className="font-mono text-sm text-foreground">{listing.price}</p>
        ) : null}
      </div>

      <p className="mt-3 max-w-2xl font-display text-lg leading-relaxed text-foreground/80">
        {listing.details}
      </p>

      <p className="mt-4 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {[listing.quantity, listing.location].filter(Boolean).join(" · ")}
        {listing.isSample ? (listing.quantity || listing.location ? " · sample" : "sample") : ""}
      </p>

      <div className="mt-5">
        {listing.unlocked && listing.contact ? (
          <p className="font-mono text-sm text-foreground">
            {listing.mine ? "Your contact — " : ""}
            {listing.contact}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="font-mono text-xs text-muted-foreground">
              Seller: {listing.sellerName.split(" ")[0]} ····
            </p>
            <button
              onClick={() => onUnlock(listing)}
              disabled={busy}
              className="font-mono text-xs tracking-widest text-foreground uppercase underline underline-offset-4 transition-colors hover:text-accent disabled:opacity-40"
            >
              Get contact — ₹1,000
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------------- main ---------------- */

function Index() {
  const enterFn = useServerFn(enterMarket);
  const getAccountFn = useServerFn(getAccount);
  const renameFn = useServerFn(renameAccount);
  const listFn = useServerFn(listMarket);
  const createFn = useServerFn(createListing);
  const unlockFn = useServerFn(unlockListing);

  const [clientId, setClientId] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [lowBalance, setLowBalance] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState<Listing | null>(null);
  const [listed, setListed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [form, setForm] = useState({
    title: "",
    details: "",
    price: "",
    quantity: "",
    location: "",
    contact: "",
  });

  useEffect(() => {
    const id = getClientId();
    setClientId(id);
    void (async () => {
      try {
        const acc = await getAccountFn({ data: { clientId: id } });
        setAccount(acc);
        if (acc) setListings(await listFn({ data: { clientId: id } }));
      } finally {
        setLoading(false);
      }
    })();
  }, [getAccountFn, listFn]);

  const refresh = async (id: string) => {
    const [acc, rows] = await Promise.all([
      getAccountFn({ data: { clientId: id } }),
      listFn({ data: { clientId: id } }),
    ]);
    setAccount(acc);
    setListings(rows);
  };

  if (loading) return <div className="min-h-screen bg-background" />;

  if (!account || !clientId) {
    return (
      <Entry
        busy={busy}
        onEnter={async (name) => {
          if (!clientId) return;
          setBusy(true);
          try {
            const acc = await enterFn({ data: { clientId, name } });
            setAccount(acc);
            setListings(await listFn({ data: { clientId } }));
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  const submitListing = async () => {
    if (!form.title.trim() || !form.details.trim() || !form.contact.trim()) return;
    setBusy(true);
    try {
      const res = await createFn({ data: { clientId, ...form } });
      if (!res.ok) {
        if (res.reason === "balance") setLowBalance(true);
        return;
      }
      setForm({ title: "", details: "", price: "", quantity: "", location: "", contact: "" });
      setListed(true);
      await refresh(clientId);
    } finally {
      setBusy(false);
    }
  };

  const doUnlock = async (listing: Listing) => {
    setBusy(true);
    try {
      const res = await unlockFn({ data: { clientId, listingId: listing.id } });
      setConfirmUnlock(null);
      if (!res.ok) {
        if (res.reason === "balance") setLowBalance(true);
        return;
      }
      await refresh(clientId);
    } finally {
      setBusy(false);
    }
  };

  const myListings = listings.filter((l) => l.mine);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 md:py-12">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
            THE MARKET
          </h1>
          <p className="font-mono text-sm text-foreground">₹{account.balance.toLocaleString("en-IN")}</p>
        </header>

        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {account.name} ·{" "}
          <button
            onClick={() => {
              setNameDraft(account.name);
              setEditingName(true);
            }}
            className="underline underline-offset-2 hover:text-accent"
          >
            edit name
          </button>
        </p>

        <nav className="mt-10 flex gap-8">
          {(["buy", "sell"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setListed(false);
              }}
              className={`border-b-2 pb-2 font-mono text-xs tracking-widest uppercase transition-colors ${
                mode === m
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </nav>

        {mode === "buy" ? (
          <section className="mt-8">
            {listings.length === 0 ? (
              <p className="border-t border-border py-8 font-display text-lg text-muted-foreground">
                nothing on offer yet
              </p>
            ) : (
              listings.map((l) => (
                <ListingRow
                  key={l.id}
                  listing={l}
                  busy={busy}
                  onUnlock={(x) =>
                    account.balance < 1000 ? setLowBalance(true) : setConfirmUnlock(x)
                  }
                />
              ))
            )}
          </section>
        ) : (
          <section className="mt-8">
            {listed ? (
              <div className="border-t border-border py-8">
                <p className="font-display text-2xl text-foreground">You are in the market.</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  ₹1,000 paid. Buyers pay ₹1,000 each to reach you.
                </p>
                <button
                  onClick={() => {
                    setListed(false);
                    setMode("buy");
                  }}
                  className="mt-6 font-mono text-xs tracking-widest text-foreground uppercase underline underline-offset-4 hover:text-accent"
                >
                  See the market
                </button>
              </div>
            ) : (
              <div className="border-t border-border pt-8">
                <h2 className="font-display text-2xl text-foreground">What are you selling?</h2>
                <div className="mt-8 space-y-7">
                  <Field
                    label="What you have"
                    value={form.title}
                    onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                    placeholder="Cotton yarn 30s combed"
                  />
                  <Field
                    label="Details"
                    textarea
                    value={form.details}
                    onChange={(v) => setForm((f) => ({ ...f, details: v }))}
                    placeholder="Quality, condition, how soon you can supply"
                  />
                  <Field
                    label="Price"
                    value={form.price}
                    onChange={(v) => setForm((f) => ({ ...f, price: v }))}
                    placeholder="₹268 / kg"
                  />
                  <Field
                    label="Quantity"
                    value={form.quantity}
                    onChange={(v) => setForm((f) => ({ ...f, quantity: v }))}
                    placeholder="18 tonnes"
                  />
                  <Field
                    label="Where"
                    value={form.location}
                    onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                    placeholder="Ludhiana, Punjab"
                  />
                  <Field
                    label="Your contact (shown only to paid buyers)"
                    value={form.contact}
                    onChange={(v) => setForm((f) => ({ ...f, contact: v }))}
                    placeholder="Name, phone, email"
                  />
                </div>

                <button
                  onClick={submitListing}
                  disabled={
                    busy || !form.title.trim() || !form.details.trim() || !form.contact.trim()
                  }
                  className="mt-10 w-full bg-primary py-4 font-mono text-sm tracking-widest text-primary-foreground uppercase transition-colors enabled:hover:bg-accent disabled:opacity-40 sm:w-auto sm:px-10"
                >
                  {busy ? "Listing" : "List it — ₹1,000"}
                </button>

                {myListings.length > 0 ? (
                  <div className="mt-16">
                    <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                      Your listings
                    </p>
                    {myListings.map((l) => (
                      <ListingRow key={l.id} listing={l} busy={busy} onUnlock={() => {}} />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        )}
      </div>

      {confirmUnlock ? (
        <Modal onClose={() => setConfirmUnlock(null)}>
          <p className="font-display text-xl text-foreground">{confirmUnlock.title}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            ₹1,000 to see the seller&apos;s contact details.
          </p>
          <div className="mt-8 flex gap-6">
            <button
              onClick={() => doUnlock(confirmUnlock)}
              disabled={busy}
              className="bg-primary px-6 py-3 font-mono text-xs tracking-widest text-primary-foreground uppercase enabled:hover:bg-accent disabled:opacity-40"
            >
              Pay ₹1,000
            </button>
            <button
              onClick={() => setConfirmUnlock(null)}
              className="font-mono text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </Modal>
      ) : null}

      {lowBalance ? (
        <Modal onClose={() => setLowBalance(false)}>
          <p className="font-display text-xl text-foreground">not enough balance</p>
          <button
            onClick={() => setLowBalance(false)}
            className="mt-8 font-mono text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground"
          >
            Close
          </button>
        </Modal>
      ) : null}

      {editingName ? (
        <Modal onClose={() => setEditingName(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nameDraft.trim()) return;
              const acc = await renameFn({ data: { clientId, name: nameDraft.trim() } });
              setAccount(acc);
              setEditingName(false);
            }}
          >
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              aria-label="Your name"
              autoFocus
              className="w-full border-b-2 border-foreground bg-transparent py-2 font-display text-xl text-foreground outline-none"
            />
            <button
              type="submit"
              className="mt-8 font-mono text-xs tracking-widest text-foreground uppercase underline underline-offset-4 hover:text-accent"
            >
              Save
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
