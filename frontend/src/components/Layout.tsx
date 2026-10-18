import { Bell, LogOut, Menu, Plane, Search, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useMotion } from "../lib/contexts";
import { ChatWidget } from "./ChatWidget";
import { MusicPlayer } from "./MusicPlayer";
import { PlaneTransition } from "./PlaneTransition";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/discover", label: "Discover" },
  { to: "/trips", label: "My Trips" },
  { to: "/trips/new", label: "New Trip" },
  { to: "/flights", label: "Flights" },
  { to: "/map", label: "Maps" },
];

/** Link that triggers the plane transition instead of an instant jump. Still a real <a> for a11y/middle-click. */
export function TLink({ to, children, className, onClick }: { to: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  const { go } = useMotion();
  return (
    <a href={to} className={className} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault(); onClick?.(); go(to);
    }}>{children}</a>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const { go, flying } = useMotion();
  const loc = useLocation();
  const nav = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => { setMobile(false); setMenu(false); setNoteOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const active = (to: string) => (to === "/trips" ? loc.pathname === "/trips" : loc.pathname.startsWith(to));

  return (
    <div className={`min-h-screen transition duration-300 ${flying ? "scale-[0.995] blur-[2px]" : ""}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[300] focus:rounded-lg focus:bg-amber-accent focus:px-3 focus:py-2 focus:text-forest-950">Skip to content</a>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="glass mx-auto flex max-w-7xl items-center gap-3 rounded-full px-4 py-2.5">
          <TLink to={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-display text-xl font-black tracking-wider">
            <Plane className="h-5 w-5 text-[#ff6b2b]" aria-hidden="true" />
            <span className="text-white">MUSA<span className="text-amber-accent">FIQ</span></span>
          </TLink>
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <TLink key={n.to} to={n.to} className={`rounded-full px-3.5 py-1.5 text-sm transition ${active(n.to) ? "bg-white/15 font-semibold" : "text-cream/70 hover:text-cream"}`}>{n.label}</TLink>
            ))}
          </nav>
          <form className="ml-auto hidden items-center md:flex" role="search" onSubmit={(e) => { e.preventDefault(); go(`/discover?q=${encodeURIComponent(q)}`); }}>
            <label htmlFor="global-search" className="sr-only">Search destinations</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50" aria-hidden="true" />
              <input id="global-search" className="input !rounded-full !py-1.5 !pl-9 w-52" placeholder="Search destinations" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </form>
          <div className="relative">
            <button className="btn-ghost !px-2.5 !py-2" aria-label="Notifications" aria-expanded={noteOpen} onClick={() => setNoteOpen((v) => !v)}><Bell className="h-4 w-4" /></button>
            {noteOpen && (
              <div className="glass-strong absolute right-0 top-12 w-64 rounded-2xl p-4 text-sm">No notifications yet. Trip reminders are not implemented in this version.</div>
            )}
          </div>
          <button className="btn-ghost !px-2.5 !py-2" aria-label="Settings" onClick={() => go("/settings")}><Settings className="h-4 w-4" /></button>
          {user ? (
            <div className="relative">
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-accent font-bold text-forest-950" aria-label="Profile menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                {user.name.slice(0, 1).toUpperCase()}
              </button>
              {menu && (
                <div className="glass-strong absolute right-0 top-12 w-52 rounded-2xl p-2 text-sm">
                  <p className="px-3 py-2 text-xs text-cream/60">{user.email}</p>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10" onClick={() => go("/settings")}><Settings className="h-4 w-4" /> Profile & settings</button>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10" onClick={() => { logout(); nav("/"); }}><LogOut className="h-4 w-4" /> Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary !py-1.5">Log in</Link>
          )}
          <button className="btn-ghost !px-2.5 !py-2 lg:hidden" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} onClick={() => setMobile((v) => !v)}>
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {mobile && (
          <nav aria-label="Mobile" className="glass-strong mx-auto mt-2 max-w-7xl rounded-3xl p-3 lg:hidden">
            {NAV.map((n) => (
              <TLink key={n.to} to={n.to} className={`block rounded-xl px-4 py-3 ${active(n.to) ? "bg-white/15 font-semibold" : ""}`}>{n.label}</TLink>
            ))}
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-6"><Outlet /></main>
      <footer className="mx-auto max-w-7xl px-6 pb-10 text-center text-xs text-cream/50">
        MUSAFIQ AI — Intelligent Travel &amp; Tour Booking Companion.
      </footer>
      <ChatWidget />
      <MusicPlayer />
      <PlaneTransition />
    </div>
  );
}
