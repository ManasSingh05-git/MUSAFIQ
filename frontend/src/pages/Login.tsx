import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, useMotion, useToast } from "../lib/contexts";

export default function Login() {
  const { user, login, register } = useAuth();
  const { go } = useMotion();
  const toast = useToast();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? "/dashboard";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (mode === "register" && !name.trim()) { setError("Enter your name."); return; }
    if (mode === "register" && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      if (mode === "login") await login(email, password); else await register(name.trim(), email, password);
      toast("success", mode === "login" ? "Welcome back!" : "Account created.");
      go(from);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4 p-7" noValidate>
        <h1 className="font-display text-3xl">{mode === "login" ? "Log in" : "Create account"}</h1>
        {mode === "register" && (
          <div><label className="label" htmlFor="name">Name</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        )}
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "register" && <p className="mt-1 text-xs text-cream/50">At least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="rounded-xl border border-coral-accent/50 bg-coral-accent/10 px-3 py-2 text-sm">{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{mode === "login" ? "Log in" : "Sign up"}</button>
        {mode === "login" && (
          <button type="button" className="btn-ghost w-full" onClick={() => { setEmail("demo@tourplan.ai"); setPassword("demo12345"); }}>
            Fill demo account (demo@tourplan.ai)
          </button>
        )}
        <p className="text-center text-sm text-cream/70">
          {mode === "login" ? "New here? " : "Already registered? "}
          <button type="button" className="text-amber-accent underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}
