const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
const TOKEN_KEY = "tourplan_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

/** Turn FastAPI error bodies (string or validation list) into one readable sentence. */
export function errorMessage(body: unknown, status: number): string {
  const d = (body as { detail?: unknown } | null)?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map((e: { loc?: unknown[]; msg?: string }) => {
      const field = (e.loc ?? []).filter((x) => x !== "body").join(".");
      return field ? `${field}: ${e.msg}` : e.msg ?? "Invalid input";
    }).join("; ");
  }
  return `Request failed (${status}).`;
}

async function request<T>(method: string, path: string, body?: unknown, raw = false): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running on " + BASE + "?");
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let parsed: unknown = null;
    try { parsed = await res.json(); } catch { /* not json */ }
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event("tourplan:unauthorized"));
    }
    throw new ApiError(res.status, errorMessage(parsed, res.status));
  }
  return (raw ? await res.blob() : await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  put: <T>(p: string, b: unknown) => request<T>("PUT", p, b),
  del: (p: string) => request<void>("DELETE", p),
  blob: (p: string) => request<Blob>("GET", p, undefined, true),
};

export function qs(params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") u.set(k, String(v)); });
  const s = u.toString();
  return s ? `?${s}` : "";
}
