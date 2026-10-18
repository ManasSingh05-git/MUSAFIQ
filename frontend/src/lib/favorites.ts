import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth, useMotion, useToast } from "./contexts";
import type { Favorite } from "./types";

/** Favourites for the logged-in user. toggle() sends guests to the login page. */
export function useFavorites() {
  const { user } = useAuth();
  const toast = useToast();
  const { go } = useMotion();
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setFavs([]); return; }
    setLoading(true);
    try { setFavs(await api.get<Favorite[]>("/api/favorites")); }
    catch { /* the page shows its own error state */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const toggle = useCallback(async (destinationId: number) => {
    if (!user) { toast("info", "Log in to save favourites."); go("/login"); return; }
    const existing = favs.find((f) => f.destination_id === destinationId);
    try {
      if (existing) { await api.del(`/api/favorites/${existing.id}`); toast("success", "Removed from favourites"); }
      else { await api.post("/api/favorites", { destination_id: destinationId }); toast("success", "Saved to favourites"); }
      await load();
    } catch (e) { toast("error", (e as Error).message); }
  }, [user, favs, load, toast, go]);

  return { favs, loading, reload: load, toggle, isFav: (id: number) => favs.some((f) => f.destination_id === id) };
}
