import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Market — See free. Speak for ₹1." },
      {
        name: "description",
        content:
          "One public market chat. Reading is free. Public messages cost ₹1, private messages cost ₹5. Enter with just your name.",
      },
      { property: "og:title", content: "The Market — See free. Speak for ₹1." },
      {
        property: "og:description",
        content:
          "One public market chat. Reading is free. Public messages cost ₹1, private messages cost ₹5.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/* ---------------- demo data ---------------- */

type Message = { id: number; from: string; text: string; time: string };

const PARTICIPANTS = [
  "Ramesh Textiles",
  "Kolkata Sourcing Co",
  "Meena Handicrafts",
  "Surat Fabrics",
  "AgroBulk India",
  "Punjab Steel Works",
  "Jaipur Gems House",
  "Chennai Plastics",
];

const DEMO_PUBLIC: Message[] = [
  { id: 1, from: "Ramesh Textiles", text: "Cotton shirting, 40s count, available 5000m. Tirupur. DM for rate.", time: "09:12" },
  { id: 2, from: "Surat Fabrics", text: "What is your best rate for 2000m? Grey fabric also needed.", time: "09:14" },
  { id: 3, from: "AgroBulk India", text: "Basmati 1121 steam, FOB Mundra. Container loads only.", time: "09:20" },
  { id: 4, from: "Kolkata Sourcing Co", text: "Looking for jute bag manufacturer, 50k pcs monthly. Serious suppliers only.", time: "09:31" },
  { id: 5, from: "Meena Handicrafts", text: "Export quality brass diya and decor. Diwali stock ready. MOQ 200 pcs.", time: "09:47" },
  { id: 6, from: "Punjab Steel Works", text: "TMT bars Fe550, all sizes. Dispatch from Ludhiana within 48 hrs.", time: "10:02" },
  { id: 7, from: "Chennai Plastics", text: "HDPE granules, virgin and regrind. Rate list on private chat.", time: "10:15" },
  { id: 8, from: "Jaipur Gems House", text: "Wholesale silver jewellery, hallmarked. Resellers welcome.", time: "10:28" },
  { id: 9, from: "Ramesh Textiles", text: "Surat Fabrics — sent you rates privately.", time: "10:30" },
];

const DEMO_PRIVATE: Record<string, Message[]> = {
  "Ramesh Textiles": [
    { id: 1, from: "Ramesh Textiles", text: "Namaste. You asked about shirting rates?", time: "10:30" },
    { id: 2, from: "Ramesh Textiles", text: "40s count: ₹68/m for 2000m+. GST extra. Delivery 5 days.", time: "10:31" },
  ],
};

const START_BALANCE = 50;
const PUBLIC_PRICE = 1;
const PRIVATE_PRICE = 5;

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ---------------- entry screen ---------------- */

function Entry({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          One market. Everyone welcome.
        </p>
        <h1 className="mt-6 font-display text-6xl font-black tracking-tight text-foreground">
          THE
          <br />
          MARKET
        </h1>

        <div className="mt-12 space-y-4 font-display text-2xl leading-snug text-foreground">
          <p>
            See. <span className="font-semibold">Free.</span>
          </p>
          <p>
            Speak publicly. <span className="font-semibold text-accent">₹1/message.</span>
          </p>
          <p>
            Talk privately. <span className="font-semibold text-accent">₹5/message.</span>
          </p>
        </div>

        <p className="mt-8 font-mono text-xs leading-relaxed text-muted-foreground">
          The sender pays. Receiving is free. No judging what you say — the price is the only rule.
        </p>

        <form
          className="mt-auto pt-12"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onEnter(name.trim());
          }}
        >
          <label htmlFor="name" className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ashok Traders"
            autoFocus
            className="mt-2 w-full border-b-2 border-foreground bg-transparent py-3 font-display text-2xl text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="mt-8 w-full bg-primary py-4 font-mono text-sm tracking-widest text-primary-foreground uppercase transition-colors enabled:hover:bg-accent disabled:opacity-40"
          >
            Enter the market →
          </button>
          <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
            Demo version — you start with ₹50 of demo credit.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ---------------- chat bubbles ---------------- */

function PublicMessage({ msg, self }: { msg: Message; self: boolean }) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-xs font-medium ${self ? "text-accent" : "text-foreground"}`}>
          {msg.from}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{msg.time}</span>
        {msg.demo && (
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground/70 uppercase">demo</span>
        )}
      </div>
      <p className="mt-1 font-display text-lg leading-snug text-foreground">{msg.text}</p>
    </div>
  );
}

type Msg = Message & { demo?: boolean };

/* ---------------- main ---------------- */

function Index() {
  const [name, setName] = useState<string | null>(null);
  const [balance, setBalance] = useState(START_BALANCE);
  const [publicMsgs, setPublicMsgs] = useState<Msg[]>(DEMO_PUBLIC.map((m) => ({ ...m, demo: true })));
  const [privateMsgs, setPrivateMsgs] = useState<Record<string, Msg[]>>(
    Object.fromEntries(Object.entries(DEMO_PRIVATE).map(([k, v]) => [k, v.map((m) => ({ ...m, demo: true }))])),
  );
  const [activeChat, setActiveChat] = useState<string | null>(null); // null = public market
  const [draft, setDraft] = useState("");
  const idRef = useRef(100);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [publicMsgs, privateMsgs, activeChat]);

  if (!name) return <Entry onEnter={setName} />;

  const price = activeChat ? PRIVATE_PRICE : PUBLIC_PRICE;
  const canAfford = balance >= price;

  const send = () => {
    const text = draft.trim();
    if (!text || !canAfford) return;
    const msg: Msg = { id: idRef.current++, from: name, text, time: nowTime() };
    if (activeChat) {
      setPrivateMsgs((p) => ({ ...p, [activeChat]: [...(p[activeChat] ?? []), msg] }));
    } else {
      setPublicMsgs((p) => [...p, msg]);
    }
    setBalance((b) => b - price);
    setDraft("");
  };

  /* ---------- private chat view ---------- */
  if (activeChat) {
    const msgs = privateMsgs[activeChat] ?? [];
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 py-4">
            <button
              onClick={() => setActiveChat(null)}
              aria-label="Back to market"
              className="text-foreground transition-colors hover:text-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <p className="font-display text-lg font-semibold text-foreground">{activeChat}</p>
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Private · ₹5/message · only you two see this
              </p>
            </div>
            <p className="font-mono text-sm text-foreground">₹{balance}</p>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col divide-y divide-border/60">
          {msgs.length === 0 && (
            <p className="px-5 py-8 font-mono text-xs text-muted-foreground">
              No messages yet. Your first word costs ₹5.
            </p>
          )}
          {msgs.map((m) => (
            <PublicMessage key={m.id} msg={m} self={m.from === name} />
          ))}
          <div ref={endRef} />
        </main>

        <Composer
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          price={price}
          canAfford={canAfford}
          onTopUp={() => setBalance((b) => b + 50)}
          placeholder={`Message ${activeChat}…`}
        />
      </div>
    );
  }

  /* ---------- public market view ---------- */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto w-full max-w-2xl px-5 py-4">
          <div className="flex items-baseline justify-between">
            <h1 className="font-display text-2xl font-black tracking-tight text-foreground">THE MARKET</h1>
            <div className="text-right">
              <p className="font-mono text-sm font-medium text-foreground">₹{balance}</p>
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">demo credit</p>
            </div>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Public floor · speak for <span className="text-accent">₹1/message</span> · signed in as {name}
          </p>

          {/* participants */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[name, ...PARTICIPANTS].map((p) => (
              <button
                key={p}
                onClick={() => p !== name && setActiveChat(p)}
                disabled={p === name}
                className={`shrink-0 border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors ${
                  p === name
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                {p === name ? `${p} (you)` : p}
              </button>
            ))}
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Tap a name to talk privately · ₹5/message
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col divide-y divide-border/60">
        <p className="bg-muted px-5 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Conversation below is demo data — the floor resets soon
        </p>
        {publicMsgs.map((m) => (
          <PublicMessage key={m.id} msg={m} self={m.from === name} />
        ))}
        <div ref={endRef} />
      </main>

      <Composer
        draft={draft}
        setDraft={setDraft}
        onSend={send}
        price={price}
        canAfford={canAfford}
        onTopUp={() => setBalance((b) => b + 50)}
        placeholder="Say it to the whole market…"
      />
    </div>
  );
}

/* ---------------- composer ---------------- */

function Composer({
  draft,
  setDraft,
  onSend,
  price,
  canAfford,
  onTopUp,
  placeholder,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  price: number;
  canAfford: boolean;
  onTopUp: () => void;
  placeholder: string;
}) {
  return (
    <footer className="sticky bottom-0 border-t border-border bg-background">
      <div className="mx-auto w-full max-w-2xl px-5 py-4">
        {canAfford ? (
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className="flex-1 border-b-2 border-foreground bg-transparent py-2 font-display text-lg text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex items-center gap-2 bg-primary px-4 py-3 font-mono text-xs tracking-widest text-primary-foreground uppercase transition-colors enabled:hover:bg-accent disabled:opacity-40"
            >
              Send ₹{price}
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-muted-foreground">
              Out of credit. A message costs ₹{price}.
            </p>
            <button
              onClick={onTopUp}
              className="bg-primary px-4 py-3 font-mono text-xs tracking-widest text-primary-foreground uppercase transition-colors hover:bg-accent"
            >
              Add ₹50 demo credit
            </button>
          </div>
        )}
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          You pay to send. Reading is always free.
        </p>
      </div>
    </footer>
  );
}
