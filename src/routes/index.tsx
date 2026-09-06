import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadState,
  saveState,
  newId,
  formatTime,
  START_BALANCE,
  PUBLIC_PRICE,
  PRIVATE_PRICE,
  type MarketState,
  type Message,
} from "@/lib/market-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Market — speak for ₹1, privately for ₹5" },
      {
        name: "description",
        content:
          "One common public market. Reading is free. Public messages cost ₹1, private messages cost ₹5. Enter with just your name.",
      },
      { property: "og:title", content: "The Market — speak for ₹1, privately for ₹5" },
      {
        property: "og:description",
        content: "One common public market. Reading is free. Speak for ₹1, privately for ₹5.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/* ---------------- entry ---------------- */

function Entry({ onEnter }: { onEnter: (name: string) => void }) {
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
        <h1 className="font-display text-5xl font-black tracking-tight text-foreground">THE MARKET</h1>
        <p className="mt-8 font-display text-2xl text-foreground">Thank you for joining.</p>
        <p className="font-display text-2xl text-foreground">This place won&apos;t disappoint you</p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          autoFocus
          className="mt-12 w-full border-b-2 border-foreground bg-transparent py-3 font-display text-2xl text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent"
        />

        <button
          type="submit"
          disabled={!value.trim()}
          className="mt-10 w-full bg-primary py-4 font-mono text-sm tracking-widest text-primary-foreground uppercase transition-colors enabled:hover:bg-accent disabled:opacity-40"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function MessageRow({
  msg,
  self,
  onName,
}: {
  msg: Message;
  self: boolean;
  onName?: (name: string) => void;
}) {
  return (
    <div className="py-4">
      <div className="flex items-baseline gap-2">
        {onName && !self ? (
          <button
            onClick={() => onName(msg.from)}
            className="font-mono text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            {msg.from}
          </button>
        ) : (
          <span className={`font-mono text-xs font-medium ${self ? "text-accent" : "text-foreground"}`}>
            {msg.from}
          </span>
        )}
        <span className="font-mono text-[10px] text-muted-foreground">{formatTime(msg.at)}</span>
      </div>
      <p className="mt-1 font-display text-lg leading-snug break-words text-foreground">{msg.text}</p>
    </div>
  );
}

function Composer({
  placeholder,
  onSend,
}: {
  placeholder: string;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex items-center gap-3 border-t border-border bg-background py-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent py-2 font-display text-lg text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="font-mono text-xs tracking-widest text-foreground uppercase transition-colors enabled:hover:text-accent disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}

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

/* ---------------- main ---------------- */

function Index() {
  const [state, setState] = useState<MarketState | null>(null);
  const [side, setSide] = useState<"private" | "public">("public");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [noBalance, setNoBalance] = useState(false);
  const [nameTarget, setNameTarget] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const publicEnd = useRef<HTMLDivElement>(null);
  const privateEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  useEffect(() => {
    publicEnd.current?.scrollIntoView({ block: "nearest" });
    privateEnd.current?.scrollIntoView({ block: "nearest" });
  }, [state, activeChat, side]);

  const conversations = useMemo(
    () => (state ? Object.keys(state.privateMessages) : []),
    [state],
  );

  if (!state) return <div className="min-h-screen bg-background" />;

  if (!state.name) {
    return (
      <Entry
        onEnter={(name) =>
          setState((s) => ({ ...(s as MarketState), name, balance: s?.balance ?? START_BALANCE }))
        }
      />
    );
  }

  const me = state.name;

  const sendPublic = (text: string) => {
    if (state.balance < PUBLIC_PRICE) return setNoBalance(true);
    setState((s) => {
      const cur = s as MarketState;
      return {
        ...cur,
        balance: cur.balance - PUBLIC_PRICE,
        publicMessages: [...cur.publicMessages, { id: newId(), from: me, text, at: Date.now() }],
      };
    });
  };

  const sendPrivate = (to: string, text: string) => {
    if (state.balance < PRIVATE_PRICE) return setNoBalance(true);
    setState((s) => {
      const cur = s as MarketState;
      return {
        ...cur,
        balance: cur.balance - PRIVATE_PRICE,
        privateMessages: {
          ...cur.privateMessages,
          [to]: [...(cur.privateMessages[to] ?? []), { id: newId(), from: me, text, at: Date.now() }],
        },
      };
    });
  };

  const openPrivate = (who: string) => {
    setState((s) => {
      const cur = s as MarketState;
      if (cur.privateMessages[who]) return cur;
      return { ...cur, privateMessages: { ...cur.privateMessages, [who]: [] } };
    });
    setActiveChat(who);
    setSide("private");
    setNameTarget(null);
  };

  const activeMsgs = activeChat ? (state.privateMessages[activeChat] ?? []) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-5 py-6">
        {/* header */}
        <header className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-black tracking-tight text-foreground">THE MARKET</h1>
          <p className="font-mono text-sm text-foreground">₹{state.balance}</p>
        </header>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {me} ·{" "}
          <button
            onClick={() => {
              setNameDraft(me);
              setEditingName(true);
            }}
            className="underline underline-offset-2 hover:text-accent"
          >
            edit name
          </button>
        </p>

        {/* two parts */}
        <div className="mt-6 grid grid-cols-2 gap-6 md:gap-10">
          <button
            onClick={() => setSide("private")}
            className={`border-b-2 pb-2 text-left font-mono text-xs tracking-widest uppercase transition-colors ${
              side === "private" ? "border-foreground text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            Private Market
          </button>
          <button
            onClick={() => setSide("public")}
            className={`border-b-2 pb-2 text-left font-mono text-xs tracking-widest uppercase transition-colors ${
              side === "public" ? "border-foreground text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            Public Market
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* PRIVATE */}
          <section className={`${side === "private" ? "block" : "hidden"} md:block`}>
            {!activeChat ? (
              <>
                {conversations.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    no private conversations yet — tap a name in the public market
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {conversations.map((c) => (
                      <li key={c}>
                        <button
                          onClick={() => setActiveChat(c)}
                          className="w-full py-4 text-left font-display text-lg text-foreground hover:text-accent"
                        >
                          {c}
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                            {(state.privateMessages[c] ?? []).length} messages
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg font-semibold text-foreground">{activeChat}</p>
                  <button
                    onClick={() => setActiveChat(null)}
                    className="font-mono text-[11px] text-muted-foreground uppercase hover:text-accent"
                  >
                    back
                  </button>
                </div>
                <div className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto">
                  {activeMsgs.map((m) => (
                    <MessageRow key={m.id} msg={m} self={m.from === me} />
                  ))}
                  <div ref={privateEnd} />
                </div>
                <Composer
                  placeholder="write a message — ₹5"
                  onSend={(t) => sendPrivate(activeChat, t)}
                />
              </>
            )}
          </section>

          {/* PUBLIC */}
          <section className={`${side === "public" ? "block" : "hidden"} md:block`}>
            <div className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto">
              {state.publicMessages.length === 0 ? (
                <p className="py-4 font-display text-lg text-muted-foreground">the market is waiting...</p>
              ) : (
                state.publicMessages.map((m) => (
                  <MessageRow key={m.id} msg={m} self={m.from === me} onName={setNameTarget} />
                ))
              )}
              <div ref={publicEnd} />
            </div>
            <Composer placeholder="write something — ₹1" onSend={sendPublic} />
          </section>
        </div>
      </div>

      {noBalance && (
        <Modal onClose={() => setNoBalance(false)}>
          <p className="font-display text-2xl text-foreground">not enough balance</p>
          <button
            onClick={() => setNoBalance(false)}
            className="mt-6 w-full bg-primary py-3 font-mono text-xs tracking-widest text-primary-foreground uppercase hover:bg-accent"
          >
            Close
          </button>
        </Modal>
      )}

      {nameTarget && (
        <Modal onClose={() => setNameTarget(null)}>
          <p className="font-display text-2xl text-foreground">{nameTarget}</p>
          <button
            onClick={() => openPrivate(nameTarget)}
            className="mt-6 w-full bg-primary py-3 font-mono text-xs tracking-widest text-primary-foreground uppercase hover:bg-accent"
          >
            Talk privately — ₹5/message
          </button>
        </Modal>
      )}

      {editingName && (
        <Modal onClose={() => setEditingName(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = nameDraft.trim();
              if (!n) return;
              setState((s) => ({ ...(s as MarketState), name: n }));
              setEditingName(false);
            }}
          >
            <label className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Your name
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
              className="mt-2 w-full border-b-2 border-foreground bg-transparent py-2 font-display text-xl text-foreground outline-none"
            />
            <button
              type="submit"
              className="mt-6 w-full bg-primary py-3 font-mono text-xs tracking-widest text-primary-foreground uppercase hover:bg-accent"
            >
              Save
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
