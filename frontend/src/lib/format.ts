export const inr = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : "₹" + Math.round(n).toLocaleString("en-IN");

export const fmtDate = (iso: string): string =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

export type Token = { text: string; bold?: boolean; italic?: boolean };

/** Minimal, XSS-safe inline markup for chat: **bold** and _italic_. Returns tokens, never HTML. */
export function parseInline(line: string): Token[] {
  const out: Token[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  for (const m of line.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: line.slice(last, idx) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ text: tok.slice(2, -2), bold: true });
    else out.push({ text: tok.slice(1, -1), italic: true });
    last = idx + tok.length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

/** Same rules as backend budget.summarize: total is the sum of category amounts. */
export function budgetTotals(categories: Record<string, number>, travelers: number, days: number, budget: number) {
  const total = Object.values(categories).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  return {
    total: Math.round(total),
    perPerson: Math.round(total / Math.max(travelers, 1)),
    perDay: Math.round(total / Math.max(days, 1)),
    over: budget > 0 && total > budget,
    difference: Math.round(budget - total),
  };
}

export function tripShareText(t: { title: string; start_city: string; start_date: string; end_date: string; travelers: number; days: { day_number: number; title: string; activities: { slot: string; title: string }[] }[] }, total: number): string {
  const lines = [`${t.title}`, `${t.start_city} | ${fmtDate(t.start_date)} to ${fmtDate(t.end_date)} | ${t.travelers} traveller(s)`, ""];
  t.days.forEach((d) => {
    lines.push(`Day ${d.day_number}: ${d.title}`);
    d.activities.forEach((a) => lines.push(`  - ${a.slot}: ${a.title}`));
  });
  lines.push("", `Estimated total: ${inr(total)} (indicative estimate, not a booking)`, "Planned with TourPlan AI");
  return lines.join("\n");
}

export const monthName = (m: number) => MONTHS[m - 1] ?? "";
