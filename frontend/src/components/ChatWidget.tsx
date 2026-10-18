import { Bot, Loader2, MapPin, Save, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth, useMotion, useToast } from "../lib/contexts";
import { inr, parseInline } from "../lib/format";
import type { ChatMessage, Conversation, Trip } from "../lib/types";

const SUGGESTIONS = [
  "I live in Mumbai. 4 days next month with two friends, budget ₹20,000. I like mountains, photography and local food. Suggest a destination.",
  "Plan a five-day Goa trip, budget ₹30,000 for 2 people",
  "Suggest a destination under ₹10,000 for 3 days",
];

function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((para, i) => (
        <p key={i} className="mb-2 last:mb-0">
          {parseInline(para).map((t, j) =>
            t.bold ? <strong key={j}>{t.text}</strong> : t.italic ? <em key={j} className="text-cream/70">{t.text}</em> : <span key={j}>{t.text}</span>)}
        </p>
      ))}
    </>
  );
}

/** Streaming-style reveal of text that has already arrived (cosmetic; disabled for reduced motion). */
function Reveal({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) { setN(text.length); return; }
    const id = setInterval(() => setN((v) => { if (v >= text.length) { clearInterval(id); return v; } return v + 6; }), 16);
    return () => clearInterval(id);
  }, [text, animate]);
  return <RichText text={text.slice(0, n)} />;
}

export function ChatWidget() {
  const { user } = useAuth();
  const { go, reducedMotion } = useMotion();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [convId, setConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState<"llm" | "rule_based" | null>(null);
  const [freshId, setFreshId] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    api.get<{ mode: "llm" | "rule_based" }>("/api/ai/status").then((s) => setAiMode(s.mode)).catch(() => setAiMode(null));
    api.get<Conversation[]>("/api/ai/conversations").then((list) => {
      if (list.length) { setConvId(list[0].id); setMsgs(list[0].messages); }
    }).catch(() => { /* history is optional */ });
  }, [open, user]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }); }, [msgs, busy, reducedMotion]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { id: -Date.now(), role: "user", content: t, source: "user" }]);
    try {
      const r = await api.post<{ conversation_id: number; message: ChatMessage }>("/api/ai/chat", { message: t, conversation_id: convId });
      setConvId(r.conversation_id);
      setFreshId(r.message.id);
      setMsgs((m) => [...m, r.message]);
      if (r.message.payload?.action === "open_map") go(`/map?destination=${r.message.payload.destination_id}`);
    } catch (e) {
      setMsgs((m) => [...m, { id: -Date.now() - 1, role: "assistant", source: "error", content: (e as Error).message }]);
    } finally { setBusy(false); }
  }

  async function clear() {
    if (convId) { try { await api.del(`/api/ai/conversations/${convId}`); } catch { /* already gone */ } }
    setMsgs([]); setConvId(null);
    toast("info", "Chat cleared.");
  }

  async function saveTrip(m: ChatMessage) {
    if (!m.payload?.trip) return;
    setSaving(m.id);
    try {
      const trip = await api.post<Trip>("/api/trips", m.payload.trip);
      toast("success", "Trip saved. You can now edit it.");
      setOpen(false);
      go(`/trips/${trip.id}`);
    } catch (e) { toast("error", (e as Error).message); } finally { setSaving(null); }
  }

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close travel assistant" : "Open travel assistant"} aria-expanded={open}
        className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-amber-accent text-forest-950 shadow-glass transition hover:scale-105 active:scale-95">
        {open ? <X /> : <Bot />}
      </button>
      {open && (
        <section aria-label="AI travel assistant" className="glass-strong fixed bottom-24 right-3 z-[90] flex h-[min(620px,78vh)] w-[min(420px,calc(100vw-1.5rem))] flex-col rounded-3xl">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="font-display text-lg leading-none">Travel assistant</h2>
              <p className="mt-1 text-[11px] text-cream/60">
                {aiMode === "llm" ? "AI-assisted explanations" : aiMode === "rule_based" ? "Rule-based mode (no AI key configured)" : "Planner only. Cannot book anything."}
              </p>
            </div>
            <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={clear} aria-label="Clear chat" disabled={!msgs.length}><Trash2 className="h-4 w-4" /> Clear</button>
          </header>

          {!user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <p>Log in to chat with the planner and save your history.</p>
              <Link to="/login" className="btn-primary" onClick={() => setOpen(false)}>Log in</Link>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
                {msgs.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-cream/70">Describe your trip in your own words. I will extract the details, ask for anything missing and build a plan you can save.</p>
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => send(s)} className="glass block w-full rounded-xl p-3 text-left text-xs hover:bg-white/10">{s}</button>
                    ))}
                  </div>
                )}
                {msgs.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${m.role === "user" ? "bg-amber-accent text-forest-950" : m.source === "error" ? "border border-coral-accent/50 bg-coral-accent/10" : "bg-white/10"}`}>
                      {m.role === "assistant" && m.source !== "error" && (
                        <span className="mb-1 inline-block rounded-full bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cream/70">
                          {m.source === "llm" ? "AI-assisted" : "Rule-based"}
                        </span>
                      )}
                      {m.role === "assistant" ? <Reveal text={m.content} animate={!reducedMotion && m.id === freshId} /> : <p>{m.content}</p>}
                      {m.payload?.type === "plan" && m.payload.trip && (
                        <div className="mt-3 space-y-2 rounded-xl border border-white/15 bg-black/20 p-3 text-xs">
                          <p className="font-semibold">{m.payload.trip.title}</p>
                          <p>Estimated total {inr(m.payload.budget?.total)} · {m.payload.trip.days.length} days</p>
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => saveTrip(m)} disabled={saving === m.id}>
                              {saving === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save as trip
                            </button>
                            <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => { setOpen(false); go(`/map?destination=${m.payload?.destination_id}`); }}>
                              <MapPin className="h-3.5 w-3.5" /> Show on map
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex" aria-label="Assistant is typing">
                    <div className="flex gap-1 rounded-2xl bg-white/10 px-4 py-3">
                      {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-cream/70" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={end} />
              </div>
              <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <label htmlFor="chat-input" className="sr-only">Message the travel assistant</label>
                <input id="chat-input" className="input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000}
                  placeholder="e.g. Make this trip cheaper" disabled={busy} />
                <button className="btn-primary !px-4" aria-label="Send message" disabled={busy || !input.trim()}><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
