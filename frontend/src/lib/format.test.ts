import { describe, expect, it } from "vitest";
import { budgetTotals, daysBetween, inr, parseInline } from "./format";

describe("format helpers", () => {
  it("counts days inclusively", () => {
    expect(daysBetween("2027-01-10", "2027-01-10")).toBe(1);
    expect(daysBetween("2027-01-10", "2027-01-13")).toBe(4);
  });
  it("formats rupees and missing values", () => {
    expect(inr(20000)).toBe("₹20,000");
    expect(inr(null)).toBe("—");
  });
  it("totals a budget and flags overspend", () => {
    const t = budgetTotals({ food: 5400, transport: 3000 }, 3, 4, 8000);
    expect(t.total).toBe(8400);
    expect(t.perPerson).toBe(2800);
    expect(t.over).toBe(true);
    expect(t.difference).toBe(-400);
  });
  it("parses only bold and italic markup into tokens, never HTML", () => {
    const tokens = parseInline("**Goa** is _great_ <script>x</script>");
    expect(tokens[0]).toEqual({ text: "Goa", bold: true });
    expect(tokens.some((t) => t.italic && t.text === "great")).toBe(true);
    expect(tokens.map((t) => t.text).join("")).toContain("<script>");
  });
});
