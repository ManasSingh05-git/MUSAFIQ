import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, tokenStore } from "./api";
import type { User } from "./types";

/* ------------------------------------------------------------------ auth */
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Auth = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const c = useContext(Auth);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get<User>("/api/auth/me").then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("tourplan:unauthorized", onUnauthorized);
    return () => window.removeEventListener("tourplan:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, loading,
    login: async (email, password) => {
      const r = await api.post<{ access_token: string; user: User }>("/api/auth/login", { email, password });
      tokenStore.set(r.access_token); setUser(r.user);
    },
    register: async (name, email, password) => {
      const r = await api.post<{ access_token: string; user: User }>("/api/auth/register", { name, email, password });
      tokenStore.set(r.access_token); setUser(r.user);
    },
    logout: () => { tokenStore.clear(); setUser(null); },
  }), [user, loading]);

  return <Auth.Provider value={value}>{children}</Auth.Provider>;
}

/* ------------------------------------------------------------------ toasts */
type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; text: string }
const ToastCtx = createContext<(kind: ToastKind, text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++idRef.current;
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  const color = { success: "border-emerald-400/50", error: "border-coral-accent/70", info: "border-teal-muted/60" };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[200] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`glass rounded-xl border ${color[t.kind]} px-4 py-3 text-sm shadow-glass`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ motion settings + plane transition */
interface MotionCtx {
  fancyTransitions: boolean;
  setFancyTransitions: (v: boolean) => void;
  reducedMotion: boolean;
  go: (to: string) => void;
  flying: boolean;
  flightKey: number;
}
const Motion = createContext<MotionCtx | null>(null);
export const useMotion = () => {
  const c = useContext(Motion);
  if (!c) throw new Error("useMotion outside provider");
  return c;
};

const PREF_KEY = "tourplan_fancy_transitions";
export const FLIGHT_MS = 1100;
export const NAVIGATE_AT_MS = 520;

export function MotionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [fancy, setFancy] = useState(() => {
    try { return localStorage.getItem(PREF_KEY) !== "off"; } catch { return true; }
  });
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [flying, setFlying] = useState(false);
  const [flightKey, setFlightKey] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const h = () => setReduced(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const setFancyTransitions = useCallback((v: boolean) => {
    setFancy(v);
    try { localStorage.setItem(PREF_KEY, v ? "on" : "off"); } catch { /* storage blocked */ }
  }, []);

  const go = useCallback((to: string) => {
    // Plain navigation when transitions are off, reduced motion is requested, or one is already running.
    if (!fancy || reduced || busy.current) { navigate(to); return; }
    busy.current = true;
    setFlightKey((k) => k + 1);
    setFlying(true);
    setTimeout(() => navigate(to), NAVIGATE_AT_MS);   // route changes while the screen is covered by cloud
    setTimeout(() => { setFlying(false); busy.current = false; }, FLIGHT_MS);
  }, [fancy, reduced, navigate]);

  const value = useMemo(() => ({
    fancyTransitions: fancy, setFancyTransitions, reducedMotion: reduced, go, flying, flightKey,
  }), [fancy, setFancyTransitions, reduced, go, flying, flightKey]);

  return <Motion.Provider value={value}>{children}</Motion.Provider>;
}

/* ------------------------------------------------------------------ small data hook */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fn().then((d) => { if (alive) setData(d); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}
