import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_COPY,
  DEFAULT_LIMITS,
  createListing,
  getMarket,
  unlockContact,
  type MarketListing,
} from "@/lib/market.functions";
import {
  downscale,
  fileToDataUrl,
  matches,
  readUnlocked,
  rememberUnlocked,
  renderCrop,
  type PickedPhoto,
} from "@/lib/market-client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "THE MARKET — We help you find buyers." },
      {
        name: "description",
        content:
          "A plain, open market. Post what you have to sell in seconds. Every listing stays on for 24 hours.",
      },
      { property: "og:title", content: "THE MARKET — We help you find buyers." },
      {
        property: "og:description",
        content: "A plain, open market. Post what you have to sell. Listings last 24 hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Signature({ handle, url }: { handle: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="fixed bottom-4 left-4 z-20 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <span>{handle}</span>
    </a>
  );
}

function Page() {
  const [entered, setEntered] = useState(false);
  const fetchMarket = useServerFn(getMarket);
  const { data } = useQuery({
    queryKey: ["market"],
    queryFn: () => fetchMarket(),
    refetchInterval: entered ? 10000 : false,
    refetchOnWindowFocus: true,
  });

  const copy = { ...DEFAULT_COPY, ...(data?.copy ?? {}) };
  const limits = { ...DEFAULT_LIMITS, ...(data?.limits ?? {}) };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {entered ? (
        <Market copy={copy} limits={limits} incoming={data?.listings ?? []} />
      ) : (
        <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl tracking-[0.18em]">{copy["brand"]}</h1>
          <p className="mt-6 text-sm text-muted-foreground">{copy["tagline"]}</p>
          <button
            type="button"
            onClick={() => setEntered(true)}
            className="mt-16 border border-[color:var(--muted-foreground)] px-8 py-2 text-sm hover:bg-secondary"
          >
            {copy["enterLabel"]}
          </button>
        </section>
      )}
      <Signature handle={copy["instagramHandle"] ?? ""} url={copy["instagramUrl"] ?? "#"} />
    </main>
  );
}

type Copy = Record<string, string>;
type Limits = typeof DEFAULT_LIMITS;

function Market({
  copy,
  limits,
  incoming,
}: {
  copy: Copy;
  limits: Limits;
  incoming: MarketListing[];
}) {
  const [shown, setShown] = useState<MarketListing[]>([]);
  const [pending, setPending] = useState<MarketListing[]>([]);
  const [query, setQuery] = useState("");
  const [selling, setSelling] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const seeded = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      setShown(incoming);
      return;
    }
    const known = new Set([...shown, ...pending].map((l) => l.id));
    const fresh = incoming.filter((l) => !known.has(l.id));
    const live = new Set(incoming.map((l) => l.id));
    setShown((prev) => prev.filter((l) => live.has(l.id)));
    setPending((prev) => [...prev.filter((l) => live.has(l.id)), ...fresh]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const visible = useMemo(
    () =>
      shown.filter(
        (l) => new Date(l.expiresAt).getTime() > now && matches(query, l.productName, l.specifications),
      ),
    [shown, query, now],
  );

  const pendingMatching = useMemo(
    () => pending.filter((l) => matches(query, l.productName, l.specifications)),
    [pending, query],
  );

  const showPending = useCallback(() => {
    setShown((prev) => {
      const ids = new Set(prev.map((l) => l.id));
      return [...pending.filter((l) => !ids.has(l.id)), ...prev];
    });
    setPending([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pending]);

  const onCreated = useCallback((listing: MarketListing) => {
    setShown((prev) => [listing, ...prev.filter((l) => l.id !== listing.id)]);
    setSelling(false);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[540px] px-5 pb-24 pt-10 md:max-w-[38%]">
      {selling ? (
        <SellForm copy={copy} limits={limits} onCancel={() => setSelling(false)} onCreated={onCreated} />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSelling(true)}
            className="w-full border border-[color:var(--muted-foreground)] px-4 py-2 text-sm hover:bg-secondary"
          >
            {copy["sellButton"]}
          </button>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy["searchPlaceholder"]}
            aria-label={copy["searchPlaceholder"]}
            className="mt-6 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-[color:var(--muted-foreground)]"
          />

          {pendingMatching.length > 0 && (
            <button
              type="button"
              onClick={showPending}
              className="mt-4 w-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {pendingMatching.length === 1 ? "1 new listing" : `${pendingMatching.length} new listings`}
            </button>
          )}

          <div className="mt-8 space-y-6">
            {visible.map((listing) => (
              <ListingCard key={listing.id} listing={listing} copy={copy} />
            ))}
          </div>

          {visible.length === 0 && (
            <p className="mt-10 text-sm text-muted-foreground">
              {query.trim() && shown.length > 0 ? copy["noResults"] : copy["emptyMarket"]}
            </p>
          )}

          <p className="mt-16 text-[11px] text-muted-foreground/70">{copy["expiryNote"]}</p>
        </>
      )}
    </div>
  );
}

function ListingCard({ listing, copy }: { listing: MarketListing; copy: Copy }) {
  const unlock = useServerFn(unlockContact);
  const [contact, setContact] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (readUnlocked().includes(listing.id) && listing.hasContact) {
      void unlock({ data: { id: listing.id } })
        .then((r) => setContact(r.contact))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  const doUnlock = async () => {
    try {
      const r = await unlock({ data: { id: listing.id } });
      rememberUnlocked(listing.id);
      setContact(r.contact);
    } catch {
      /* listing gone */
    }
  };

  return (
    <article className="border border-border p-4">
      {listing.productName && <h2 className="text-sm font-bold">{listing.productName}</h2>}
      {listing.specifications && (
        <p className="mt-1 text-sm text-muted-foreground">{listing.specifications}</p>
      )}

      {listing.photos.length > 0 && (
        <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {listing.photos.map((src, i) => (
            <button key={src} type="button" onClick={() => setViewer(i)} className="shrink-0 snap-start">
              <img
                src={src}
                alt={listing.productName || "listing photo"}
                loading="lazy"
                className="h-24 w-24 border border-border object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {listing.hasContact &&
        (contact ? (
          <p className="mt-3 text-sm">
            <span className="underline">{copy["contactLabel"]}</span>{" "}
            <span className="font-bold break-words">{contact}</span>
          </p>
        ) : (
          <button type="button" onClick={doUnlock} className="mt-3 text-sm underline">
            {copy["unlockLabel"]}
          </button>
        ))}

      {viewer !== null && (
        <PhotoViewer photos={listing.photos} index={viewer} onClose={() => setViewer(null)} />
      )}
    </article>
  );
}

function PhotoViewer({
  photos,
  index,
  onClose,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const startX = useRef<number | null>(null);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-background/95 p-6"
      onClick={onClose}
      onTouchStart={(e) => {
        startX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const x0 = startX.current;
        const x1 = e.changedTouches[0]?.clientX ?? null;
        if (x0 !== null && x1 !== null && Math.abs(x1 - x0) > 40) {
          setI((prev) => Math.min(photos.length - 1, Math.max(0, prev + (x1 < x0 ? 1 : -1))));
        }
      }}
    >
      <img
        src={photos[i]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-full border border-border object-contain"
      />
    </div>
  );
}

function SellForm({
  copy,
  limits,
  onCancel,
  onCreated,
}: {
  copy: Copy;
  limits: Limits;
  onCancel: () => void;
  onCreated: (l: MarketListing) => void;
}) {
  const create = useServerFn(createListing);
  const [productName, setProductName] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [contact, setContact] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    Boolean(productName.trim() || specifications.trim() || contact.trim() || photos.length) && !busy;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = limits.maxPhotos - photos.length;
    const picked: PickedPhoto[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      const raw = await fileToDataUrl(file);
      const source = await downscale(raw);
      picked.push({
        id: crypto.randomUUID(),
        source,
        mode: "original",
        crop: { zoom: 1, x: 0, y: 0 },
        preview: source,
      });
    }
    setPhotos((prev) => [...prev, ...picked]);
  };

  const setCrop = async (id: string, mode: "original" | "cropped", zoom: number) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, mode, crop: { ...p.crop, zoom } } : p)));
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    const preview =
      mode === "original" ? target.source : await renderCrop(target.source, { ...target.crop, zoom });
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, preview } : p)));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const listing = await create({
        data: {
          productName: productName.trim(),
          specifications: specifications.trim(),
          contact: contact.trim(),
          photos: photos.map((p) => p.preview),
        },
      });
      onCreated(listing);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm">{copy["sellHeading"]}</h2>
        <button type="button" aria-label="cancel" onClick={onCancel} className="text-sm leading-none">
          ×
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <Field
          label="Product Name"
          value={productName}
          onChange={setProductName}
          max={limits.productNameMax}
        />
        <Field
          label="Specifications"
          value={specifications}
          onChange={setSpecifications}
          max={limits.specificationsMax}
        />

        <div>
          <p className="text-xs text-muted-foreground">Photos</p>
          <label className="mt-2 inline-block cursor-pointer border border-[color:var(--muted-foreground)] px-3 py-1.5 text-xs">
            {copy["photosLabel"]}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {photos.length > 0 && (
            <div className="mt-3 space-y-3">
              {photos.map((p) => (
                <div key={p.id} className="flex items-start gap-3">
                  <img src={p.preview} alt="" className="h-20 w-20 border border-border object-cover" />
                  <div className="text-xs">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => void setCrop(p.id, "original", 1)}
                        className={p.mode === "original" ? "underline" : "text-muted-foreground"}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() => void setCrop(p.id, "cropped", Math.max(1, p.crop.zoom))}
                        className={p.mode === "cropped" ? "underline" : "text-muted-foreground"}
                      >
                        Cropped
                      </button>
                    </div>
                    {p.mode === "cropped" && (
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={p.crop.zoom}
                        onChange={(e) => void setCrop(p.id, "cropped", Number(e.target.value))}
                        className="mt-2 w-32"
                        aria-label="zoom"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                      className="mt-2 block text-muted-foreground underline"
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field label="Contact" value={contact} onChange={setContact} max={limits.contactMax} />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void submit()}
        className="mt-10 w-full border border-[color:var(--muted-foreground)] px-4 py-2 text-sm disabled:opacity-40"
      >
        {copy["submitLabel"]}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground" htmlFor={label}>
        {label}
      </label>
      <input
        id={label}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--muted-foreground)]"
      />
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        {value.length}/{max}
      </p>
    </div>
  );
}
