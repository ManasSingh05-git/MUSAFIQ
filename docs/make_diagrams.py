"""Generate the project diagrams (PNG) with matplotlib. Run:  python docs/make_diagrams.py

Every box/entity mirrors the real code: backend/app/models.py (ER), backend/app/routers/* (API),
backend/app/{planner,recommender,ai,budget,travel}.py (modules).
Connectors are anchored to node edges so arrows never run through text.
"""
import math
import pathlib

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Polygon

OUT = pathlib.Path(__file__).resolve().parent.parent / "diagrams"
OUT.mkdir(exist_ok=True)

BG, PANEL, PANEL2, LINE, TEXT = "#08140f", "#12302b", "#1a4039", "#5f8f8b", "#f1ede4"
AMBER, CORAL, WARM = "#e9a24b", "#e8795f", "#3a2a1a"


def canvas(w, h, title):
    fig, ax = plt.subplots(figsize=(w, h), dpi=150)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(-2, w * 10 + 2)
    ax.set_ylim(-2, h * 10 + 12)
    ax.axis("off")
    ax.text(w * 5, h * 10 + 7, title, ha="center", va="center", color=TEXT, fontsize=15, fontweight="bold")
    return fig, ax


class Node:
    """Rectangle (kind 'r'), ellipse ('e') or diamond ('d') with a computed centre."""

    def __init__(self, x, y, w, h, text, kind="r", fc=PANEL, ec=LINE, fs=8, tc=TEXT, bold=False):
        self.x, self.y, self.w, self.h, self.kind = x, y, w, h, kind
        self.cx, self.cy = x + w / 2, y + h / 2
        self.text, self.fc, self.ec, self.fs, self.tc, self.bold = text, fc, ec, fs, tc, bold

    def draw(self, ax):
        if self.kind == "r":
            ax.add_patch(FancyBboxPatch((self.x, self.y), self.w, self.h, boxstyle="round,pad=0.3,rounding_size=1.4", fc=self.fc, ec=self.ec, lw=1.4, zorder=2))
        elif self.kind == "e":
            ax.add_patch(Ellipse((self.cx, self.cy), self.w, self.h, fc=self.fc, ec=self.ec, lw=1.4, zorder=2))
        else:
            ax.add_patch(Polygon([(self.x, self.cy), (self.cx, self.y + self.h), (self.x + self.w, self.cy), (self.cx, self.y)], fc=PANEL2, ec=AMBER, lw=1.3, zorder=2))
        ax.text(self.cx, self.cy, self.text, ha="center", va="center", color=self.tc, fontsize=self.fs,
                fontweight="bold" if self.bold else "normal", linespacing=1.3, zorder=3)
        return self

    def anchor(self, tx, ty):
        """Point on this node's border in the direction of (tx, ty)."""
        dx, dy = tx - self.cx, ty - self.cy
        if dx == 0 and dy == 0:
            return self.cx, self.cy
        a, b = self.w / 2 + 0.3, self.h / 2 + 0.3
        if self.kind == "e":
            t = 1 / math.sqrt((dx / a) ** 2 + (dy / b) ** 2)
        elif self.kind == "d":
            t = 1 / (abs(dx) / a + abs(dy) / b)
        else:
            t = min(a / abs(dx) if dx else 1e9, b / abs(dy) if dy else 1e9)
        return self.cx + dx * t, self.cy + dy * t


def link(ax, n1, n2, label="", color=AMBER, dashed=False, arrow=True, rad=0.0, lpos=0.5, ldx=0, ldy=1.6, both=False, fs=7):
    p1 = n1.anchor(n2.cx, n2.cy)
    p2 = n2.anchor(n1.cx, n1.cy)
    raw(ax, p1, p2, label, color, dashed, arrow, rad, lpos, ldx, ldy, both, fs)


def raw(ax, p1, p2, label="", color=AMBER, dashed=False, arrow=True, rad=0.0, lpos=0.5, ldx=0, ldy=1.6, both=False, fs=7):
    style = "<|-|>" if both else ("-|>" if arrow else "-")
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=11, color=color, lw=1.4, connectionstyle=f"arc3,rad={rad}",
                                 linestyle="--" if dashed else "-", zorder=1, shrinkA=0, shrinkB=0))
    if label:
        ax.text(p1[0] + (p2[0] - p1[0]) * lpos + ldx, p1[1] + (p2[1] - p1[1]) * lpos + ldy, label, ha="center", va="center", color=TEXT,
                fontsize=fs, bbox=dict(fc=BG, ec="none", pad=0.9), zorder=4)


def elbow(ax, pts, label="", color=AMBER, dashed=False, lpos=None, fs=7):
    """Polyline with an arrow head on the last segment."""
    for a, b in zip(pts[:-2], pts[1:-1]):
        ax.plot([a[0], b[0]], [a[1], b[1]], color=color, lw=1.4, ls="--" if dashed else "-", zorder=1)
    ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=11, color=color, lw=1.4, linestyle="--" if dashed else "-", zorder=1, shrinkA=0, shrinkB=0))
    if label and lpos:
        ax.text(lpos[0], lpos[1], label, ha="center", va="center", color=TEXT, fontsize=fs, bbox=dict(fc=BG, ec="none", pad=0.9), zorder=4)


def panel(ax, x, y, w, h, title, color=LINE):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3,rounding_size=2", fc="none", ec=color, lw=1.2, ls="--", zorder=0))
    ax.text(x + w / 2, y + h - 3, title, color=AMBER, ha="center", va="center", fontsize=9, fontweight="bold")


def save(fig, name):
    fig.savefig(OUT / name, facecolor=BG, bbox_inches="tight", pad_inches=0.3)
    plt.close(fig)


# ------------------------------------------------------------------ 1. architecture
def architecture():
    fig, ax = canvas(15, 8.4, "TourPlan AI: System Architecture")
    panel(ax, 2, 38, 36, 44, "Browser: React 18 + Vite + TypeScript")
    for i, t in enumerate(["Pages: Landing, Dashboard, Discover,\nDestination, New Trip, Trip View,\nMy Trips, Map, Settings",
                           "Tailwind glass design system\nFramer Motion plane transition",
                           "Leaflet + OpenStreetMap (map)\nRecharts (budget charts)",
                           "AI chat widget (every page)"]):
        Node(4.5, 66 - i * 9.4, 31, 7.8, t, fs=7.2).draw(ax)

    panel(ax, 58, 22, 62, 60, "FastAPI backend (Python)")
    routers = Node(61, 66, 26, 9, "Routers\nauth · catalog · chat · trips", fs=7.6).draw(ax)
    Node(91, 66, 26, 9, "Security\nbcrypt · JWT · rate limit\nPydantic validation", fs=7.4).draw(ax)
    Node(61, 51, 26, 11, "Domain engine\nplanner · recommender\nbudget · travel", fs=7.6).draw(ax)
    ai = Node(91, 51, 26, 11, "AI layer (ai.py)\nrequirement extraction\nLLM explain + fallback", fs=7.6).draw(ax)
    orm = Node(61, 36, 26, 9, "SQLAlchemy ORM\n12 tables", fs=7.6).draw(ax)
    Node(91, 36, 26, 9, "Seed dataset\n12 destinations (sample data)", fs=7.2).draw(ax)
    Node(91, 25.5, 26, 7, "PDF export (ReportLab)", fs=7.4).draw(ax)

    db = Node(62, 5, 22, 8, "SQLite\ntourplan.db", fc=PANEL2, fs=8.5, bold=True).draw(ax)
    gem = Node(126, 49, 22, 12, "Google Gemini API\n(optional; key only\nin backend .env)", fc=WARM, ec=AMBER, fs=7.2).draw(ax)
    pub = Node(2, 5, 40, 11, "Public services (all optional):\nOpenStreetMap tiles (browser)\nOpen-Meteo weather · frankfurter FX", fs=7, ec=CORAL).draw(ax)

    raw(ax, (38.4, 60), (57.6, 60), "HTTPS\nREST/JSON\nBearer JWT", ldy=6.5, fs=6.8)
    raw(ax, (73, 35.6), (73, 13.4), "SQL", color=LINE, ldx=4, ldy=0)
    raw(ax, (117.4, 56), (125.6, 56), "HTTPS\nif key set", color=AMBER, dashed=True, ldy=5.5, fs=6.8)
    raw(ax, (20, 37.6), (20, 16.4), "map tiles", color=CORAL, dashed=True, ldx=6, ldy=0)
    save(fig, "architecture.png")


# ------------------------------------------------------------------ 2. data-flow diagram (level 1)
def dfd():
    fig, ax = canvas(14, 8.4, "Data-Flow Diagram: Level 1")
    user = Node(1, 8, 16, 76, "User\n(traveller)", fc=WARM, ec=AMBER, bold=True, fs=9).draw(ax)
    ys = [78, 62, 46, 30, 14]
    names = ["1.0\nAuthenticate", "2.0\nBrowse destinations", "3.0\nGenerate plan\n(recommend + budget)", "4.0\nAI chat\nassistant", "5.0\nManage trips,\nbudget, packing"]
    procs = [Node(36, y - 6, 30, 12, n, kind="e", fs=7.2).draw(ax) for y, n in zip(ys, names)]

    def store(x, y, text):
        ax.plot([x, x + 32], [y + 4.5, y + 4.5], color=AMBER, lw=1.5)
        ax.plot([x, x + 32], [y - 4.5, y - 4.5], color=AMBER, lw=1.5)
        ax.text(x + 16, y, text, ha="center", va="center", color=TEXT, fontsize=7.2)
        return Node(x, y - 4.5, 32, 9, "", fc="none", ec="none")
    d1, d5, d2, d4, d3 = store(100, 78, "D1  Users, preferences"), store(100, 66, "D5  Favorites"), store(100, 54, "D2  Destinations, attractions"), \
        store(100, 30, "D4  Conversations, messages"), store(100, 14, "D3  Trips, itinerary,\nexpenses, packing")
    llm = Node(100, 38, 32, 8, "External LLM (optional)", fc=WARM, ec=AMBER, fs=7.4).draw(ax)

    flows = ["credentials", "search / filter", "trip requirements", "chat message", "edits, saves"]
    for p, y, f in zip(procs, ys, flows):
        raw(ax, (17.4, y), (p.x - 0.4, y), f, color=LINE, ldy=2.2)
    raw(ax, (p3 := procs[2]).anchor(17, 41)[0:2] if False else (procs[2].x + 2, 41.5), (17.4, 41.5), "plan, budget, itinerary", color=CORAL, ldy=-2.2, fs=6.6)

    raw(ax, (66.4, 78), (99.6, 78), "login data", both=True, ldy=2.2)
    raw(ax, (66.4, 64), (99.6, 66), "favourite", ldy=2.4)
    raw(ax, (99.6, 54.5), (66, 62), "read destinations", color=LINE, ldy=-1.2, ldx=3, lpos=0.55)
    raw(ax, (99.6, 52), (66, 47), "candidate data", color=LINE, ldy=-2.4, lpos=0.55)
    raw(ax, (66.4, 43), (99.6, 41.5), "explain request", color=AMBER, dashed=True, ldy=2.2, lpos=0.5)
    raw(ax, (51, 40), (51, 36), "plan request", color=CORAL, ldx=11, ldy=0, fs=6.8)
    raw(ax, (66.4, 30), (99.6, 30), "history", both=True, ldy=2.2)
    raw(ax, (66.4, 14), (99.6, 14), "save / edit / load", both=True, ldy=2.2)
    save(fig, "data_flow.png")


# ------------------------------------------------------------------ 3. ER diagram
W, H = 26, 13
COL = [3, 34, 65, 96, 127]
ROW = {"A": 72, "B": 52, "C": 32, "D": 12}
ENT = {  # name: (fields, col, row)
    "user_preferences": ("id PK · user_id FK UNIQUE\nhome_city, currency\ntravel_style, interests", 0, "A"),
    "users": ("id PK · email UNIQUE\nname · password_hash\ncreated_at", 0, "B"),
    "chat_conversations": ("id PK · user_id FK\ntitle\ncontext (JSON)", 0, "C"),
    "chat_messages": ("id PK · conversation_id FK\nrole · content · source\npayload (JSON)", 0, "D"),
    "trips": ("id PK · user_id FK\ndestination_id FK (optional)\ntitle, dates, travelers, budget...", 2, "B"),
    "budget_expenses": ("id PK · trip_id FK\ncategory\nestimated · actual", 2, "A"),
    "packing_items": ("id PK · trip_id FK\nlabel · packed", 3, "A"),
    "itinerary_days": ("id PK · trip_id FK\nday_number\nUNIQUE(trip_id, day_number)", 3, "B"),
    "itinerary_activities": ("id PK · day_id FK\nattraction_id FK (optional)\nslot, title, hours, cost, lat/lng", 4, "B"),
    "destinations": ("id PK · slug UNIQUE\nname, country, region, lat/lng\nclimate, costs (INR), months", 3, "C"),
    "attractions": ("id PK · destination_id FK\nname, lat/lng, tags\nfee, duration, best_time", 4, "C"),
    "favorites": ("id PK · user_id FK\ndestination_id FK\nUNIQUE(user, destination)", 2, "C"),
}


def er():
    fig, ax = canvas(16, 9.4, "Entity-Relationship Diagram")
    nodes = {}
    for name, (fields, c, r) in ENT.items():
        x, y = COL[c], ROW[r]
        n = Node(x, y, W, H, "", fs=6.6)
        n.draw(ax)
        ax.add_patch(FancyBboxPatch((x, y + H - 4), W, 4, boxstyle="round,pad=0.3,rounding_size=1.2", fc=AMBER, ec=AMBER, zorder=3))
        ax.text(x + W / 2, y + H - 2, name, ha="center", va="center", color="#08140f", fontsize=7.6, fontweight="bold", zorder=4)
        ax.text(x + W / 2, y + (H - 4) / 2, fields, ha="center", va="center", color=TEXT, fontsize=6.3, linespacing=1.35, zorder=4)
        nodes[name] = n

    def rel(a, b, ca="1", cb="N", rad=0.0):
        A, B = nodes[a], nodes[b]
        p1, p2 = A.anchor(B.cx, B.cy), B.anchor(A.cx, A.cy)
        ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle="-", color=LINE, lw=1.4, connectionstyle=f"arc3,rad={rad}", zorder=1))
        for (px, py), (qx, qy), t in ((p1, p2, ca), (p2, p1, cb)):
            d = math.hypot(qx - px, qy - py) or 1
            ax.text(px + (qx - px) / d * 3.4, py + (qy - py) / d * 3.4, t, color=CORAL, fontsize=7.5, fontweight="bold", ha="center", va="center", bbox=dict(fc=BG, ec="none", pad=0.5), zorder=5)
    rel("users", "user_preferences", "1", "1")
    rel("users", "chat_conversations")
    rel("chat_conversations", "chat_messages")
    rel("users", "trips")
    rel("users", "favorites")
    rel("trips", "budget_expenses")
    rel("trips", "packing_items")
    rel("trips", "itinerary_days")
    rel("itinerary_days", "itinerary_activities")
    rel("trips", "destinations", "0..1", "N")
    rel("destinations", "attractions")
    rel("destinations", "favorites")
    rel("attractions", "itinerary_activities", "0..1", "N")
    save(fig, "er_diagram.png")


# ------------------------------------------------------------------ 4. sequence: AI trip generation
def sequence():
    fig, ax = canvas(16, 8.8, "Sequence Diagram: AI Trip Generation")
    lanes = [("User", 14), ("React UI", 40), ("FastAPI\n/api/trips/generate", 70), ("Recommender +\nPlanner + Budget", 100), ("Gemini API\n(optional)", 126), ("SQLite", 150)]
    for name, x in lanes:
        Node(x - 10, 77, 20, 8, name, fs=7, bold=True).draw(ax)
        ax.plot([x, x], [77, 3], color=LINE, lw=1, ls="--", zorder=0)
    X = {i: x for i, (_, x) in enumerate(lanes)}
    steps = [(0, 1, "1  fill form, press Generate", 70), (1, 2, "2  POST /generate (Bearer JWT)", 64), ("self", 2, "3  validate (Pydantic), rate-limit if LLM on", 58),
             (2, 3, "4  score all destinations (100 pts)", 50), (3, 5, "5  read destinations, attractions", 45), (5, 3, "6  rows", 41),
             (3, 2, "7  itinerary + budget + reasons", 36), (2, 4, "8  explain (only if key set)", 30), (4, 2, "9  JSON validated, else fallback", 25),
             (2, 1, "10  plan + source label + disclaimer", 19), (1, 0, "11  preview; user presses Save", 14), (1, 2, "12  POST /api/trips (persisted)", 8)]
    for a, b, text, y in steps:
        if a == "self":
            x = X[b]
            ax.plot([x, x + 9, x + 9], [y, y, y - 4], color=AMBER, lw=1.4)
            ax.add_patch(FancyArrowPatch((x + 9, y - 4), (x + 0.4, y - 4), arrowstyle="-|>", mutation_scale=11, color=AMBER, lw=1.4))
            ax.text(x + 11, y - 2, text, color=TEXT, fontsize=6.9, va="center")
            continue
        back = a > b
        ax.add_patch(FancyArrowPatch((X[a], y), (X[b], y), arrowstyle="-|>", mutation_scale=11, color=CORAL if back else AMBER, lw=1.4, linestyle="--" if back else "-", shrinkA=0, shrinkB=0))
        ax.text((X[a] + X[b]) / 2, y + 1.8, text, color=TEXT, fontsize=6.9, ha="center", bbox=dict(fc=BG, ec="none", pad=0.5))
    save(fig, "sequence_ai_generation.png")


# ------------------------------------------------------------------ 5. use-case diagram
def usecase():
    fig, ax = canvas(13, 9.4, "Use-Case Diagram")
    guest_uc = ["Browse and filter destinations", "View destination details and map", "Register / log in"]
    user_uc = ["Generate trip plan (form)", "Chat with AI assistant", "Edit itinerary (add, remove, reorder)", "Edit budget, track actual spend",
               "Save / duplicate / delete trip", "Export itinerary as PDF", "Manage favourites", "Use packing checklist", "Set travel preferences"]
    ys = [86 - i * 6.9 for i in range(len(guest_uc) + len(user_uc))]
    ax.add_patch(FancyBboxPatch((46, 2), 56, 92, boxstyle="round,pad=0.3,rounding_size=2", fc="none", ec=LINE, lw=1.2, ls="--", zorder=0))
    ax.text(74, 91.5, "TourPlan AI", color=AMBER, ha="center", fontsize=9, fontweight="bold")
    ells = [Node(51, y - 2.9, 46, 5.8, t, kind="e", fs=6.9).draw(ax) for y, t in zip(ys, guest_uc + user_uc)]

    def actor(x, y, label):
        ax.plot(x, y + 9, "o", color=AMBER, ms=9)
        ax.plot([x, x], [y + 7, y], color=AMBER, lw=1.6)
        ax.plot([x - 6, x + 6], [y + 5, y + 5], color=AMBER, lw=1.6)
        ax.plot([x, x - 5], [y, y - 8], color=AMBER, lw=1.6)
        ax.plot([x, x + 5], [y, y - 8], color=AMBER, lw=1.6)
        ax.text(x, y - 11, label, ha="center", va="top", color=TEXT, fontsize=8)
    guest_y, reg_y = 70, 30
    actor(16, guest_y, "Guest")
    actor(16, reg_y, "Registered\nuser")
    for e in ells[:3]:
        raw(ax, (22, guest_y + 5), (e.x - 0.3, e.cy), color=LINE, arrow=False)
    for e in ells[3:]:
        raw(ax, (22, reg_y + 5), (e.x - 0.3, e.cy), color=LINE, arrow=False)
    raw(ax, (16, reg_y + 20), (16, guest_y - 13), "is a\n(inherits)", color=AMBER, ldx=7, ldy=0, fs=6.8)
    gem = Node(108, 40, 22, 14, "Gemini API\n(secondary\nactor, optional)", fc=WARM, ec=AMBER, fs=7).draw(ax)
    for idx in (3, 4):
        raw(ax, (ells[idx].x + ells[idx].w + 0.3, ells[idx].cy), (gem.x - 0.3, gem.cy), "", color=AMBER, dashed=True, arrow=False)
    save(fig, "use_case.png")


# ------------------------------------------------------------------ 6. activity diagram
def activity():
    fig, ax = canvas(12, 9.6, "Activity Diagram: Trip Planning")
    ax.set_ylim(-12, 9.6 * 10 + 12)
    MX, RX, LX = 60, 104, 17
    start = Node(MX - 7, 90, 14, 5, "Start", kind="e", fc=AMBER, ec=AMBER, tc="#08140f", bold=True).draw(ax)
    enter = Node(MX - 14, 78, 28, 8, "Enter requirements\n(form or chat)", fs=7).draw(ax)
    valid = Node(MX - 15, 66, 30, 9, "Input valid?", kind="d", fs=7).draw(ax)
    errs = Node(RX - 14, 66.5, 28, 8, "Show field errors", fs=7).draw(ax)
    chosen = Node(MX - 15, 54, 30, 9, "Destination chosen?", kind="d", fs=7).draw(ax)
    score = Node(RX - 14, 53.5, 28, 10, "Score destinations\n(budget, interests, season,\nduration, style)", fs=6.6).draw(ax)
    build = Node(MX - 14, 41, 28, 8, "Build itinerary +\ntransport + budget", fs=7).draw(ax)
    llm = Node(MX - 16, 28.5, 32, 10, "LLM key set and\nrequest succeeds?", kind="d", fs=6.8).draw(ax)
    ai = Node(RX - 14, 29.5, 28, 8, "Add AI explanation", fs=7).draw(ax)
    rule = Node(LX - 14, 29.5, 28, 8, "Label plan\n'rule-based'", fs=7).draw(ax)
    within = Node(MX - 15, 13, 30, 9, "Within budget?", kind="d", fs=7).draw(ax)
    warn = Node(RX - 14, 12.5, 28, 10, "Show warning +\ncheaper alternatives", fs=6.8).draw(ax)
    save_n = Node(MX - 14, 0, 28, 7.5, "User edits / saves trip", fs=7).draw(ax)
    end = Node(MX - 6, -9, 12, 5, "End", kind="e", fc=AMBER, ec=AMBER, tc="#08140f", bold=True).draw(ax)

    def down(a, b, label=""):
        raw(ax, (MX, a.y - 0.3), (MX, b.y + b.h + 0.3), label, ldx=4, ldy=0)
    down(start, enter); down(enter, valid)
    down(valid, chosen, "yes"); down(chosen, build, "yes"); down(build, llm)
    raw(ax, (MX + 15.3, valid.cy), (errs.x - 0.3, errs.cy), "no", ldy=1.8)
    elbow(ax, [(RX, errs.y + errs.h + 0.3), (RX, enter.cy), (MX + 14.3, enter.cy)], "retry", color=CORAL, dashed=True, lpos=(RX - 8, enter.cy))
    raw(ax, (MX + 15.3, chosen.cy), (score.x - 0.3, score.cy), "no: suggest", ldy=1.8)
    elbow(ax, [(RX, score.y - 0.3), (RX, build.cy), (MX + 14.3, build.cy)])
    raw(ax, (MX + 16.3, llm.cy), (ai.x - 0.3, ai.cy), "yes", ldy=1.8)
    raw(ax, (MX - 16.3, llm.cy), (rule.x + rule.w + 0.3, rule.cy), "no / error", ldy=1.8)
    merge_y = 25.2
    elbow(ax, [(RX, ai.y - 0.3), (RX, merge_y), (MX + 0.4, merge_y)], color=AMBER)
    elbow(ax, [(LX, rule.y - 0.3), (LX, merge_y), (MX - 0.4, merge_y)], color=AMBER)
    raw(ax, (MX, merge_y), (MX, within.y + within.h + 0.3))
    raw(ax, (MX + 15.3, within.cy), (warn.x - 0.3, warn.cy), "no", ldy=1.8)
    elbow(ax, [(RX, warn.y - 0.3), (RX, save_n.cy), (MX + 14.3, save_n.cy)])
    down(within, save_n, "yes")
    down(save_n, end)
    save(fig, "activity_trip_planning.png")


if __name__ == "__main__":
    for fn in (architecture, dfd, er, sequence, usecase, activity):
        fn()
    print("diagrams written to", OUT)
