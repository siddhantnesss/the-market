import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  adminBootstrap,
  adminDeleteListing,
  adminGetConfig,
  adminListings,
  adminSaveConfig,
  adminSaveListing,
  type AdminListing,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — THE MARKET" },
      { name: "description", content: "Private administration for THE MARKET." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const bootstrap = useServerFn(adminBootstrap);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    void bootstrap({})
      .then((r) => setIsAdmin(r.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [session, bootstrap]);

  if (session === null) return <Shell>loading…</Shell>;
  if (!session) return <SignIn />;
  if (!isAdmin)
    return (
      <Shell>
        <p className="text-sm">This account is not an administrator.</p>
        <button className="mt-4 text-sm underline" onClick={() => void supabase.auth.signOut()}>
          sign out
        </button>
      </Shell>
    );
  return <Console />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState("");

  const go = async () => {
    setError("");
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    if (res.error) setError(res.error.message);
  };

  return (
    <Shell>
      <h1 className="text-sm tracking-[0.18em]">ADMIN</h1>
      <div className="mt-6 max-w-sm space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={password}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          onClick={() => void go()}
          className="border border-[color:var(--muted-foreground)] px-4 py-2 text-sm"
        >
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="block text-xs underline text-muted-foreground"
        >
          {mode === "in" ? "create the first admin account" : "back to sign in"}
        </button>
      </div>
    </Shell>
  );
}

const emptyDraft = (): AdminListing => ({
  id: "",
  productName: "",
  specifications: "",
  contact: "",
  photos: [],
  hidden: false,
  deleted: false,
  expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
  createdAt: new Date().toISOString(),
});

function Console() {
  const list = useServerFn(adminListings);
  const save = useServerFn(adminSaveListing);
  const remove = useServerFn(adminDeleteListing);
  const getConfig = useServerFn(adminGetConfig);
  const saveConfig = useServerFn(adminSaveConfig);

  const [rows, setRows] = useState<AdminListing[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AdminListing | null>(null);
  const [copy, setCopy] = useState<Record<string, string | number | boolean>>({});
  const [tab, setTab] = useState<"listings" | "copy">("listings");

  const refresh = useCallback(
    async (q: string) => setRows(await list({ data: { query: q } })),
    [list],
  );

  useEffect(() => {
    void refresh(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    void getConfig({}).then((c) => setCopy({ ...(c["copy"] ?? {}), ...(c["settings"] ?? {}) }));
  }, [getConfig]);

  const commit = async (l: AdminListing) => {
    await save({
      data: {
        ...(l.id ? { id: l.id } : {}),
        productName: l.productName,
        specifications: l.specifications,
        contact: l.contact,
        photos: l.photos,
        hidden: l.hidden,
        deleted: l.deleted,
        expiresAt: l.expiresAt,
      },
    });
    setDraft(null);
    await refresh(query);
  };

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-sm tracking-[0.18em]">ADMIN</h1>
        <button className="text-xs underline" onClick={() => void supabase.auth.signOut()}>
          sign out
        </button>
      </div>

      <div className="mt-4 flex gap-4 text-xs">
        <button className={tab === "listings" ? "underline" : ""} onClick={() => setTab("listings")}>
          listings
        </button>
        <button className={tab === "copy" ? "underline" : ""} onClick={() => setTab("copy")}>
          site copy & settings
        </button>
      </div>

      {tab === "listings" ? (
        <>
          <div className="mt-6 flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search all listings"
              className="flex-1 border border-border bg-transparent px-3 py-2 text-sm"
            />
            <button
              className="border border-[color:var(--muted-foreground)] px-3 text-sm"
              onClick={() => setDraft(emptyDraft())}
            >
              new
            </button>
          </div>

          {draft && <Editor draft={draft} setDraft={setDraft} onSave={commit} />}

          <div className="mt-6 space-y-3">
            {rows.map((l) => {
              const expired = new Date(l.expiresAt).getTime() <= Date.now();
              return (
                <div key={l.id} className="border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{l.productName || "(no name)"}</p>
                      <p className="text-muted-foreground">{l.specifications}</p>
                      <p className="text-xs text-muted-foreground">contact: {l.contact || "—"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {expired ? "expired" : "active"} · {l.hidden ? "hidden" : "visible"}
                        {l.deleted ? " · deleted" : ""} · until {new Date(l.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                      <button className="underline" onClick={() => setDraft(l)}>
                        edit
                      </button>
                      <button className="underline" onClick={() => void commit({ ...l, hidden: !l.hidden })}>
                        {l.hidden ? "show" : "hide"}
                      </button>
                      <button
                        className="underline"
                        onClick={() =>
                          void commit({
                            ...l,
                            deleted: false,
                            hidden: false,
                            expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
                          })
                        }
                      >
                        +24h
                      </button>
                      <button
                        className="underline"
                        onClick={() => void commit({ ...l, deleted: !l.deleted })}
                      >
                        {l.deleted ? "restore" : "soft delete"}
                      </button>
                      <button
                        className="underline text-destructive"
                        onClick={async () => {
                          await remove({ data: { id: l.id } });
                          await refresh(query);
                        }}
                      >
                        delete forever
                      </button>
                    </div>
                  </div>
                  {l.photos.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {l.photos.map((p) => (
                        <img key={p} src={p} alt="" className="h-16 w-16 border border-border object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-3">
          {Object.entries(copy).map(([k, v]) => (
            <div key={k}>
              <label className="text-xs text-muted-foreground">{k}</label>
              <input
                value={String(v)}
                onChange={(e) => setCopy((prev) => ({ ...prev, [k]: e.target.value }))}
                className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm"
              />
            </div>
          ))}
          <button
            className="border border-[color:var(--muted-foreground)] px-4 py-2 text-sm"
            onClick={async () => {
              const numeric = [
                "listingHours",
                "maxPhotos",
                "productNameMax",
                "specificationsMax",
                "contactMax",
              ];
              const copyValues: Record<string, string | number | boolean> = {};
              const settingValues: Record<string, string | number | boolean> = {};
              for (const [k, v] of Object.entries(copy)) {
                if (numeric.includes(k)) settingValues[k] = Number(v);
                else copyValues[k] = String(v);
              }
              await saveConfig({ data: { key: "copy", value: copyValues } });
              await saveConfig({ data: { key: "settings", value: settingValues } });
            }}
          >
            save
          </button>
        </div>
      )}
    </Shell>
  );
}

function Editor({
  draft,
  setDraft,
  onSave,
}: {
  draft: AdminListing;
  setDraft: (l: AdminListing | null) => void;
  onSave: (l: AdminListing) => Promise<void>;
}) {
  const toLocal = (iso: string) => new Date(iso).toISOString().slice(0, 16);
  return (
    <div className="mt-6 border border-border p-4">
      <div className="space-y-3">
        {(
          [
            ["Product Name", "productName"],
            ["Specifications", "specifications"],
            ["Contact", "contact"],
          ] as const
        ).map(([label, key]) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground">{label}</label>
            <input
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-muted-foreground">Expires at</label>
          <input
            type="datetime-local"
            value={toLocal(draft.expiresAt)}
            onChange={(e) => setDraft({ ...draft, expiresAt: new Date(e.target.value).toISOString() })}
            className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Photos (drag order via arrows)</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.photos.map((p, i) => (
              <div key={p} className="text-xs">
                <img src={p} alt="" className="h-16 w-16 border border-border object-cover" />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const next = [...draft.photos];
                      if (i > 0) {
                        [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                        setDraft({ ...draft, photos: next });
                      }
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => {
                      const next = [...draft.photos];
                      if (i < next.length - 1) {
                        [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                        setDraft({ ...draft, photos: next });
                      }
                    }}
                  >
                    →
                  </button>
                  <button
                    onClick={() =>
                      setDraft({ ...draft, photos: draft.photos.filter((_, j) => j !== i) })
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <label className="mt-2 inline-block cursor-pointer border border-border px-3 py-1.5 text-xs">
            add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const { downscale, fileToDataUrl } = await import("@/lib/market-client");
                const files = Array.from(e.target.files ?? []);
                const urls: string[] = [];
                for (const f of files) urls.push(await downscale(await fileToDataUrl(f)));
                setDraft({ ...draft, photos: [...draft.photos, ...urls].slice(0, 10) });
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <div className="mt-4 flex gap-3 text-sm">
        <button
          className="border border-[color:var(--muted-foreground)] px-4 py-1.5"
          onClick={() => void onSave(draft)}
        >
          save
        </button>
        <button className="underline" onClick={() => setDraft(null)}>
          cancel
        </button>
      </div>
    </div>
  );
}
