const KEY = "tourplan_recent_destinations";

export function getRecent(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number").slice(0, 8) : [];
  } catch { return []; }
}

export function pushRecent(id: number): void {
  try {
    const next = [id, ...getRecent().filter((x) => x !== id)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage blocked: recently viewed simply stays empty */ }
}
