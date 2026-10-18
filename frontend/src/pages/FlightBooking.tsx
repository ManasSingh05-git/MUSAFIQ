import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Compass,
  CreditCard,
  Download,
  Info,
  Luggage,
  MapPin,
  Navigation,
  Plane,
  Printer,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AttractionImage, DestinationImage } from "../components/ui";
import { api } from "../lib/api";
import { useAuth, useMotion, useToast } from "../lib/contexts";
import { inr } from "../lib/format";
import {
  CURRENCIES,
  CurrencyCode,
  detectDefaultCurrency,
  formatFlightPrice,
  generateFlightsForRoute,
  resolveAirport,
  type FlightProposition,
} from "../lib/flightData";
import type { Destination, DestinationDetail, Trip, TripDraft } from "../lib/types";

// Seat layout definition: 6 rows, columns A-F
const SEAT_ROWS = [1, 2, 3, 4, 5, 6];
const INITIAL_OCCUPIED = new Set(["A1", "B1", "F1", "A2", "C2", "D2", "E2", "F2", "A3", "F3", "A4", "C4", "E4", "F4", "B5", "E5"]);

export default function FlightBooking() {
  const [sp] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { go } = useMotion();
  const toast = useToast();

  // Passed state from NewTrip or query params
  const tripDraft = (location.state as { tripDraft?: TripDraft; destinationId?: number })?.tripDraft;
  const passedDestId = (location.state as { destinationId?: number })?.destinationId || sp.get("destination");

  const [dests, setDests] = useState<Destination[]>([]);
  const [destDetail, setDestDetail] = useState<DestinationDetail | null>(null);

  // Flight search state - defaults to India's most popular route (Mumbai -> Goa)
  const initialFrom = tripDraft?.start_city || sp.get("from") || "Mumbai";
  const initialTo = (tripDraft as { destination_name?: string })?.destination_name || tripDraft?.title?.replace("Trip to ", "") || sp.get("to") || "Goa";

  const [fromCity, setFromCity] = useState(initialFrom);
  const [toCity, setToCity] = useState(initialTo);
  const [deptDate, setDeptDate] = useState(tripDraft?.start_date || "Mon, 20 Jan");
  const [retDate, setRetDate] = useState(tripDraft?.end_date || "Thu, 30 Jan");
  const [passengersCount, setPassengersCount] = useState(tripDraft?.travelers || 2);
  const [cabinClass, setCabinClass] = useState<"Business" | "First" | "Economy">("Business");

  // Multi-currency: defaults to INR if India origin, EUR if Europe, AED if UAE, etc.
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() =>
    detectDefaultCurrency(initialFrom, initialTo)
  );

  // Resolve airport codes dynamically for ANY route
  const fromAirport = useMemo(() => resolveAirport(fromCity), [fromCity]);
  const toAirport = useMemo(() => resolveAirport(toCity), [toCity]);

  // Generate realistic route-specific flights tailored to origin & destination
  const flights = useMemo(() => generateFlightsForRoute(fromCity, toCity), [fromCity, toCity]);
  const [selectedFlight, setSelectedFlight] = useState<FlightProposition>(() => flights[0]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["D1", "E1"]);

  // Sync selected flight when route changes
  useEffect(() => {
    if (flights.length > 0) {
      setSelectedFlight(flights[0]);
    }
  }, [flights]);

  // Auto-adapt currency if route changes between domestic and foreign
  useEffect(() => {
    setSelectedCurrency(detectDefaultCurrency(fromCity, toCity));
  }, [fromCity, toCity]);

  // Checkout modal & payment state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"form" | "processing" | "success">("form");
  const [cardNumber, setCardNumber] = useState("4532 8921 7410 9821");
  const [cardExpiry, setCardExpiry] = useState("08/28");
  const [cardCvv, setCardCvv] = useState("834");
  const [cardName, setCardName] = useState(user?.name || "Noah Turner");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbanking">("card");

  // Confirmed ticket state
  const [ticketConfirmed, setTicketConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState("VX-98241");
  const [showTourGuide, setShowTourGuide] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  // Load destinations to resolve real images and attractions
  useEffect(() => {
    api.get<Destination[]>("/api/destinations")
      .then((data) => {
        setDests(data);
        if (passedDestId) {
          const matched = data.find((d) => d.id === Number(passedDestId) || d.slug === String(passedDestId));
          if (matched) {
            setToCity(matched.name);
            api.get<DestinationDetail>(`/api/destinations/${matched.id}`).then(setDestDetail).catch(() => {});
          }
        } else {
          // If destination city matches one of our DB destinations
          const matched = data.find((d) => d.name.toLowerCase().includes(toCity.toLowerCase()) || toCity.toLowerCase().includes(d.name.toLowerCase()));
          if (matched) {
            api.get<DestinationDetail>(`/api/destinations/${matched.id}`).then(setDestDetail).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [passedDestId, toCity]);

  // Seat toggle handler
  const toggleSeat = (seatId: string) => {
    if (INITIAL_OCCUPIED.has(seatId)) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length >= passengersCount) {
        // replace earliest selection
        setSelectedSeats([...selectedSeats.slice(1), seatId]);
      } else {
        setSelectedSeats([...selectedSeats, seatId]);
      }
    }
  };

  // Dynamic ticket price calculation in selected currency
  const classMultiplier = cabinClass === "First" ? 1.8 : cabinClass === "Business" ? 1.0 : 0.45;
  const currentFlight = selectedFlight || flights[0];
  const totalBaseINR = Math.round((currentFlight?.priceINR ?? 4500) * classMultiplier * Math.max(1, selectedSeats.length));
  const totalFormatted = formatFlightPrice(totalBaseINR, selectedCurrency);
  const totalINR = totalBaseINR;

  // Handle fake payment processing
  const handlePayment = () => {
    setPaymentStep("processing");
    setTimeout(() => {
      setPaymentStep("success");
      setTicketConfirmed(true);
      const generatedRef = "VX-" + Math.floor(10000 + Math.random() * 90000);
      setBookingRef(generatedRef);
      toast("success", `Flight Booked! Reference: ${generatedRef}`);
    }, 1800);
  };

  // Convert to saved trip or view self-guided itinerary
  const handleSaveAndOpenTrip = async () => {
    setSavingTrip(true);
    try {
      // Find destination ID
      const dest = dests.find((d) => d.name.toLowerCase().includes(toCity.toLowerCase()) || toCity.toLowerCase().includes(d.name.toLowerCase())) || dests[0];
      const payload = {
        title: `Trip to ${dest?.name || toCity}`,
        start_city: fromCity,
        destination_id: dest?.id || null,
        start_date: "2026-11-10",
        end_date: "2026-11-15",
        travelers: passengersCount,
        budget: totalINR + 40000,
        currency: "INR",
        travel_style: cabinClass === "Business" ? "comfort" : "budget",
        pace: "balanced",
        transport: "flight",
        accommodation: "hotel",
        interests: ["culture", "photography", "food"],
        notes: `Flight: ${selectedFlight.airline} ${selectedFlight.flightNumber} | Seats: ${selectedSeats.join(", ")} | Booking Ref: ${bookingRef}`,
      };

      const saved = await api.post<Trip>("/api/trips", payload);
      toast("success", "Self-Guided Tour Itinerary Ready!");
      go(`/trips/${saved.id}`);
    } catch {
      setShowTourGuide(true);
    } finally {
      setSavingTrip(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] px-2 py-4 text-slate-100 sm:px-4 lg:px-6">
      {/* ----------------- Top Header / MUSAFIQ Navigation ----------------- */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#071513]/80 px-6 py-3.5 backdrop-blur-2xl">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-teal-900/40">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-2xl font-bold tracking-tight text-white">MUSA<span className="text-amber-400">FIQ</span></span>
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">FLIGHTS</span>
          </div>
        </div>

        {/* Center Nav Pills */}
        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
          <button className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
            Dashboard
          </button>
          <button onClick={() => navigate("/trips")} className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white">
            My Bookings
          </button>
          <button onClick={() => setShowTourGuide(true)} className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white">
            Tour Guide Plan
          </button>
          <button onClick={() => navigate("/discover")} className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white">
            Destinations
          </button>
          <button onClick={() => navigate("/settings")} className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white">
            Settings
          </button>
        </nav>

        {/* Right Search, Notification & Profile */}
        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              readOnly
              value="Search ⌘ + Space"
              className="w-44 rounded-full border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-slate-300 focus:outline-none"
            />
          </div>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff6b2b]" />
          </button>
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-xs font-bold text-slate-950">
              {user?.name ? user.name[0].toUpperCase() : "N"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[10px] text-slate-400">@{user?.name ? user.name.toLowerCase().replace(/\s/g, "_") : "tom_dawson"}</p>
              <p className="text-xs font-semibold leading-none text-slate-200">{user?.name || "Noah Turner"}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ----------------- Dashboard Main Title Bar ----------------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search flight route..."
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className="w-56 rounded-full border border-white/10 bg-black/40 py-2 pl-9 pr-12 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
              ⌘ + Space
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-Currency Switcher Pill Bar */}
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur-md">
            <span className="pl-3 pr-1 text-[11px] font-semibold text-slate-400">Currency:</span>
            {(["INR", "USD", "EUR", "AED", "GBP"] as CurrencyCode[]).map((cur) => {
              const active = selectedCurrency === cur;
              return (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setSelectedCurrency(cur)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    active
                      ? "bg-[#ff6b2b] text-white shadow-md shadow-orange-950/40 scale-105"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {CURRENCIES[cur].symbol.trim() || cur} {cur}
                </button>
              );
            })}
          </div>

          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <span className="chip border-teal-500/30 bg-teal-500/10 text-xs text-teal-400">
            <Sparkles className="mr-1 inline h-3 w-3" /> Live Aircraft Visualizer
          </span>
        </div>
      </div>

      {/* ----------------- Main 3-Column Cockpit Layout ----------------- */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr_380px]">
        {/* ===================== Column 1: Flight Search & Upcoming ===================== */}
        <div className="space-y-6">
          {/* Route Box */}
          <div className="rounded-3xl border border-white/10 bg-[#071513]/75 p-5 shadow-2xl backdrop-blur-xl">
            {/* Origin & Destination Interactive Inputs */}
            <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origin City</label>
                <input
                  type="text"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="input !py-1.5 !px-2.5 text-xs !bg-black/40 !border-white/10"
                  placeholder="e.g. Mumbai, Delhi"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</label>
                <input
                  type="text"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="input !py-1.5 !px-2.5 text-xs !bg-black/40 !border-white/10"
                  placeholder="e.g. Goa, Paris, Bali"
                />
              </div>
            </div>

            {/* Quick Route Shortcuts */}
            <div className="mb-4 space-y-1">
              <span className="text-[10px] text-slate-400">Quick Destination Routes:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { name: "Goa", from: "Mumbai", to: "Goa" },
                  { name: "Srinagar", from: "Delhi", to: "Srinagar" },
                  { name: "Jaipur", from: "Mumbai", to: "Jaipur" },
                  { name: "Bali", from: "Mumbai", to: "Bali" },
                  { name: "Paris", from: "Delhi", to: "Paris" },
                  { name: "Dubai", from: "Mumbai", to: "Dubai" },
                  { name: "Swiss Alps", from: "Delhi", to: "Zurich" },
                ].map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => {
                      setFromCity(r.from);
                      setToCity(r.to);
                    }}
                    className={`rounded-full px-2 py-0.5 text-[10px] transition ${
                      toCity.toLowerCase().includes(r.name.toLowerCase())
                        ? "bg-teal-500 font-bold text-slate-950"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">From</span>
                <p className="font-display text-4xl font-extrabold tracking-tight text-white">{fromAirport.code}</p>
                <p className="text-xs text-slate-300">{fromAirport.city}</p>
              </div>

              <button
                onClick={() => {
                  const t = fromCity;
                  setFromCity(toCity);
                  setToCity(t);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:scale-110 hover:text-white"
                title="Swap origin and destination"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>

              <div className="text-right">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">To</span>
                <p className="font-display text-4xl font-extrabold tracking-tight text-white">{toAirport.code}</p>
                <p className="text-xs text-slate-300">{toAirport.city}</p>
              </div>
            </div>

            <div className="my-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-xs">
              <div>
                <span className="text-slate-400">Departure Date</span>
                <p className="mt-0.5 font-semibold text-slate-200">{deptDate}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Return Date</span>
                <p className="mt-0.5 font-semibold text-slate-200">{retDate}</p>
              </div>
            </div>

            <button
              onClick={() => toast("info", "34 verified airline tickets found for this route!")}
              className="w-full rounded-2xl bg-white/95 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-white hover:shadow-lg active:scale-[0.98]"
            >
              Search Ticket (34)
            </button>
          </div>

          {/* Upcoming Flight Card */}
          <div className="rounded-3xl border border-white/10 bg-[#071513]/75 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Upcoming Flight</span>
              <button onClick={() => setShowTourGuide(true)} className="text-xs font-medium text-teal-400 hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 tracking-wider text-white">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> AIRFRANCE
                </span>
                <span className="text-slate-400">CX785</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Paris</p>
                  <p className="font-display text-2xl font-bold text-white">CDG</p>
                  <p className="text-[11px] text-slate-300">10:30 AM</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400">12 h 20 min</span>
                  <div className="my-1 flex items-center gap-1">
                    <span className="h-0.5 w-6 bg-teal-500/60" />
                    <Plane className="h-4 w-4 text-teal-400" />
                    <span className="h-0.5 w-6 bg-teal-500/60" />
                  </div>
                  <span className="text-[10px] text-emerald-400">Direct Flight</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Tokyo</p>
                  <p className="font-display text-2xl font-bold text-white">HND</p>
                  <p className="text-[11px] text-slate-300">6:50 AM</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-slate-300">Business Class</span>
                <span className="font-display text-base font-bold text-white">$450.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== Column 2: Flight Route Map & Hot Propositions ===================== */}
        <div className="space-y-6">
          {/* Flight Route Map Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#071513]/75 p-5 shadow-2xl backdrop-blur-xl">
            {/* World Map Graphical Canvas */}
            <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-[#081312] border border-white/5">
              {/* Silhouette Vector World Map Representation */}
              <svg className="h-full w-full opacity-35" viewBox="0 0 800 400" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="800" height="400" fill="url(#grid)" />
                {/* Landmass silhouettes */}
                <path d="M 120 100 Q 180 80 240 120 T 320 180 T 260 260 T 150 220 Z" fill="#1b3d36" />
                <path d="M 380 90 Q 480 70 560 110 T 640 160 T 580 280 T 450 220 Z" fill="#1b3d36" />
                <path d="M 470 240 Q 520 230 550 270 T 520 330 T 460 290 Z" fill="#1b3d36" />
              </svg>

              {/* Glowing Flight Arc Curve */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 800 400">
                <path
                  d="M 220 220 Q 400 90 600 170"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                />
                {/* Pulse Ring at origin */}
                <circle cx="220" cy="220" r="7" fill="#ff6b2b" className="animate-ping opacity-75" />
                <circle cx="220" cy="220" r="5" fill="#ff6b2b" />
                {/* Pulse Ring at destination */}
                <circle cx="600" cy="170" r="7" fill="#2dd4bf" className="animate-ping opacity-75" />
                <circle cx="600" cy="170" r="5" fill="#2dd4bf" />
              </svg>

              {/* Flying Airplane Marker */}
              <div
                className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff6b2b] shadow-[0_0_20px_#ff6b2b]"
                style={{ left: "48%", top: "38%" }}
              >
                <Plane className="h-5 w-5 rotate-45 text-slate-950" />
              </div>

              {/* Origin Marker Badge */}
              <div className="absolute left-6 top-16 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/75 px-3 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#ff6b2b]" />
                <span className="text-xs font-semibold text-white">
                  {fromAirport.city} • Departure 6:30 PM
                </span>
              </div>

              {/* Destination Marker Badge */}
              <div className="absolute right-6 top-10 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/75 px-3 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  {toAirport.city} • Arrival 08:15 AM
                </span>
              </div>

              {/* Bottom Flight Telemetry Bar */}
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/80 px-4 py-2.5 backdrop-blur-md">
                <div>
                  <p className="text-[10px] text-slate-400">Distance to arrival:</p>
                  <p className="font-display text-sm font-bold text-white">2 368 / 6 470 km</p>
                </div>

                {/* Progress bar with ticks */}
                <div className="flex h-3 w-40 items-center gap-1">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-full w-1 rounded-sm ${i < 8 ? "bg-emerald-400" : i < 11 ? "bg-teal-500" : "bg-white/20"}`}
                    />
                  ))}
                </div>

                <span className="chip border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-400">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Currently Flying
                </span>
              </div>
            </div>
          </div>

          {/* Route-Specific Available Flights Table */}
          <div className="rounded-3xl border border-white/10 bg-[#071513]/75 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Available Flights ({fromAirport.code} → {toAirport.code})
                </h2>
                <p className="text-xs text-slate-400">
                  {fromAirport.city} to {toAirport.city} • Prices in {CURRENCIES[selectedCurrency].name}
                </p>
              </div>
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-bold text-teal-300 border border-teal-500/30">
                {flights.length} Scheduled Flights
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="pb-3 font-semibold">Airline &amp; Aircraft</th>
                    <th className="pb-3 font-semibold">Departure</th>
                    <th className="pb-3 font-semibold">Arrival &amp; Route</th>
                    <th className="pb-3 text-right font-semibold">Fare ({selectedCurrency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {flights.map((f) => {
                    const isSelected = selectedFlight.id === f.id;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedFlight(f)}
                        className={`cursor-pointer transition hover:bg-white/5 ${isSelected ? "bg-teal-900/30 font-medium" : ""}`}
                      >
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{f.logo}</span>
                            <div>
                              <p className="font-semibold text-white">{f.airline}</p>
                              <p className="text-[10px] text-slate-400">{f.flightNumber} • {f.aircraft}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <p className="font-semibold text-white">{f.departureTime}</p>
                          <p className="text-[10px] text-slate-400">{f.departureCode} ({fromAirport.city})</p>
                        </td>
                        <td className="py-3.5">
                          <p className="text-[10px] text-slate-400">{f.duration} • {f.stops}</p>
                          <p className="font-semibold text-white">{f.arrivalTime} ({f.arrivalCode})</p>
                        </td>
                        <td className="py-3.5 text-right">
                          <p className="font-display text-sm font-bold text-white">
                            {formatFlightPrice(f.priceINR, selectedCurrency)}
                          </p>
                          {selectedCurrency !== "INR" && (
                            <p className="text-[10px] text-slate-400">{inr(f.priceINR)}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===================== Column 3: Select Seats (Cockpit & Interactive Matrix) ===================== */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#071513]/75 p-5 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <h2 className="font-display text-xl font-bold text-white">Select Seats</h2>
              <button
                onClick={() => toast("info", "Select your seats in the cockpit cabin below. Orange indicates your confirmed seat.")}
                className="text-slate-400 hover:text-white"
                aria-label="Seat info"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

            {/* Aircraft Cockpit Silhouette & Canopy Visual Container */}
            <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-[#0e2c26] via-[#091b17] to-[#071310] p-6">
              {/* Aircraft Nose & Curved Glass Cockpit Canopy */}
              <div className="relative mb-6 flex h-28 w-60 items-center justify-center overflow-hidden rounded-t-[100px] border-t-2 border-emerald-400/50 bg-gradient-to-b from-emerald-500/20 to-transparent shadow-[0_-10px_35px_rgba(16,185,129,0.3)]">
                {/* Radial HUD Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(45,212,191,0.35),transparent_70%)]" />

                {/* Cockpit Canopy Windows */}
                <div className="flex gap-2 opacity-60">
                  <div className="h-10 w-8 rounded-tl-2xl border-t border-l border-emerald-300/40 bg-emerald-400/10" />
                  <div className="h-12 w-16 rounded-t-xl border-t border-emerald-300/40 bg-emerald-400/15" />
                  <div className="h-10 w-8 rounded-tr-2xl border-t border-r border-emerald-300/40 bg-emerald-400/10" />
                </div>

                {/* Class selector pill */}
                <div className="absolute bottom-2">
                  <button
                    onClick={() => {
                      const next = cabinClass === "Business" ? "First" : cabinClass === "First" ? "Economy" : "Business";
                      setCabinClass(next);
                    }}
                    className="rounded-full border border-white/20 bg-black/60 px-4 py-1 text-xs font-semibold text-white shadow-md transition hover:bg-black/90"
                  >
                    {cabinClass}
                  </button>
                </div>
              </div>

              {/* Column Letters (A B C | gap | D E F) */}
              <div className="mb-2 grid w-full max-w-[280px] grid-cols-[repeat(3,1fr)_18px_repeat(3,1fr)] items-center text-center text-xs font-bold text-slate-400">
                <span>A</span>
                <span>B</span>
                <span>C</span>
                <span className="text-[9px] text-slate-600">|</span>
                <span>D</span>
                <span>E</span>
                <span>F</span>
              </div>

              {/* Seat Matrix Rows */}
              <div className="w-full max-w-[280px] space-y-2.5">
                {SEAT_ROWS.map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[repeat(3,1fr)_18px_repeat(3,1fr)] items-center gap-1.5"
                  >
                    {["A", "B", "C"].map((col) => {
                      const seatId = `${col}${row}`;
                      const isOccupied = INITIAL_OCCUPIED.has(seatId);
                      const isSelected = selectedSeats.includes(seatId);

                      return (
                        <button
                          key={seatId}
                          disabled={isOccupied}
                          onClick={() => toggleSeat(seatId)}
                          className={`flex h-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? "bg-[#ff6b2b] text-white shadow-[0_0_12px_#ff6b2b] ring-2 ring-orange-300"
                              : isOccupied
                              ? "border border-white/5 bg-white/5 text-slate-600 cursor-not-allowed"
                              : "border border-white/20 bg-white/10 text-slate-200 hover:border-emerald-400 hover:bg-emerald-950/40"
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : isOccupied ? "✕" : seatId}
                        </button>
                      );
                    })}

                    {/* Aisle Row Number */}
                    <span className="text-center text-[10px] font-bold text-slate-500">{row}</span>

                    {["D", "E", "F"].map((col) => {
                      const seatId = `${col}${row}`;
                      const isOccupied = INITIAL_OCCUPIED.has(seatId);
                      const isSelected = selectedSeats.includes(seatId);

                      return (
                        <button
                          key={seatId}
                          disabled={isOccupied}
                          onClick={() => toggleSeat(seatId)}
                          className={`flex h-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? "bg-[#ff6b2b] text-white shadow-[0_0_12px_#ff6b2b] ring-2 ring-orange-300"
                              : isOccupied
                              ? "border border-white/5 bg-white/5 text-slate-600 cursor-not-allowed"
                              : "border border-white/20 bg-white/10 text-slate-200 hover:border-emerald-400 hover:bg-emerald-950/40"
                          }`}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : isOccupied ? "✕" : seatId}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Selection Summary Tally */}
              <div className="mt-6 flex w-full items-center justify-between border-t border-white/10 pt-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Passengers</span>
                  <p className="font-semibold text-white">{selectedSeats.length || passengersCount} people</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Class</span>
                  <p className="font-semibold text-white">{cabinClass}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Seat</span>
                  <p className="flex items-center gap-1 font-semibold text-white">
                    {selectedSeats.join(", ") || "None selected"} <ChevronDown className="h-3 w-3 text-slate-400" />
                  </p>
                </div>
              </div>

              {/* Checkout Pill Button */}
              <div className="mt-5 w-full">
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="group flex w-full items-center justify-between overflow-hidden rounded-full border border-white/10 bg-white/10 p-1 transition hover:bg-white/15"
                >
                  <span className="pl-5 text-sm font-bold text-white">Checkout ({selectedCurrency})</span>
                  <span className="flex items-center gap-1 rounded-full bg-[#ff6b2b] px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(255,107,43,0.6)] transition group-hover:brightness-110">
                    {totalFormatted} <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- PAYMENT & CHECKOUT MODAL ----------------- */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0a1815] p-6 shadow-2xl">
            {paymentStep === "form" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-white">MUSAFIQ Secure Checkout</h3>
                    <p className="text-xs text-slate-400">Flight {selectedFlight.flightNumber} • Seats: {selectedSeats.join(", ")}</p>
                  </div>
                  <button onClick={() => setCheckoutOpen(false)} className="rounded-full p-2 text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Amount Summary */}
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                  <div>
                    <span className="text-xs text-slate-400">Total Payable ({selectedSeats.length} Seats)</span>
                    <p className="font-display text-2xl font-bold text-white">{totalFormatted}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">{selectedCurrency === "INR" ? "Base Currency" : "INR Equivalent"}</span>
                    <p className="text-sm font-semibold text-teal-400">{selectedCurrency === "INR" ? "All Taxes & Fees Included" : inr(totalINR)}</p>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold ${
                      paymentMethod === "card" ? "border-[#ff6b2b] bg-[#ff6b2b]/15 text-[#ff6b2b]" : "border-white/10 text-slate-400"
                    }`}
                  >
                    💳 Card (Mock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold ${
                      paymentMethod === "upi" ? "border-[#ff6b2b] bg-[#ff6b2b]/15 text-[#ff6b2b]" : "border-white/10 text-slate-400"
                    }`}
                  >
                    ⚡ UPI / GPay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold ${
                      paymentMethod === "netbanking" ? "border-[#ff6b2b] bg-[#ff6b2b]/15 text-[#ff6b2b]" : "border-white/10 text-slate-400"
                    }`}
                  >
                    🏦 Net Banking
                  </button>
                </div>

                {/* Fake Details Form */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Card Number (Sample Test Card)</label>
                    <input
                      className="input !rounded-xl"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Valid Thru</label>
                      <input
                        className="input !rounded-xl"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">CVV</label>
                      <input
                        className="input !rounded-xl"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Cardholder Name</label>
                    <input
                      className="input !rounded-xl"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>256-bit encrypted test gateway. No real money will be charged.</span>
                </div>

                <button
                  type="button"
                  onClick={handlePayment}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-[#ff6b2b] py-3.5 text-center font-display text-base font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
                >
                  Pay & Confirm Booking ({totalFormatted})
                </button>
              </div>
            )}

            {paymentStep === "processing" && (
              <div className="py-12 text-center space-y-4">
                <div className="relative mx-auto h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-emerald-400" />
                </div>
                <h4 className="font-display text-xl font-bold text-white">Authorizing Payment...</h4>
                <p className="text-xs text-slate-400">Assigning seats {selectedSeats.join(", ")} on {selectedFlight.airline}...</p>
              </div>
            )}

            {paymentStep === "success" && (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-xs text-emerald-400">Booking Reference: <strong className="text-white">{bookingRef}</strong></p>
                  <p className="mt-1 text-xs text-slate-400">
                    Seats <strong className="text-white">{selectedSeats.join(", ")}</strong> confirmed on {selectedFlight.airline}.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setCheckoutOpen(false);
                      setShowTourGuide(true);
                    }}
                    className="w-full rounded-2xl bg-[#ff6b2b] py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/40 hover:brightness-110"
                  >
                    🧭 View Confirmed Tickets & Self-Guided Tour Plan
                  </button>
                  <button
                    onClick={handleSaveAndOpenTrip}
                    disabled={savingTrip}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    {savingTrip ? "Opening Itinerary..." : "Save to My Trips Dashboard"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- BOARDING PASS & TOUR GUIDE MODAL ----------------- */}
      {(showTourGuide || ticketConfirmed) && (
        <section className="mt-10 rounded-3xl border border-white/10 bg-[#0c1816]/95 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="chip border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
                <Check className="mr-1 inline h-3.5 w-3.5" /> Booking Verified & Confirmed
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                Official E-Ticket & Self-Guided Tour Itinerary
              </h2>
              <p className="text-xs text-slate-400">
                Complete trip blueprint with verified landmark photos, exact routing, and insider secrets — no tourist guide needed!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Printer className="h-4 w-4" /> Print / Save PDF
              </button>
              <button
                onClick={handleSaveAndOpenTrip}
                disabled={savingTrip}
                className="flex items-center gap-1.5 rounded-full bg-[#ff6b2b] px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
              >
                <Compass className="h-4 w-4" /> Save to My Trips
              </button>
            </div>
          </div>

          {/* 1. Official Boarding Pass Component */}
          <div className="mx-auto mb-8 max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-[#102320] to-[#0a1815] shadow-2xl">
            {/* Boarding pass top banner */}
            <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-emerald-900 px-6 py-3 text-white">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <Plane className="h-5 w-5" /> MUSAFIQ Digital Boarding Pass
              </div>
              <span className="text-xs font-mono font-bold tracking-widest">{bookingRef}</span>
            </div>

            {/* Pass details */}
            <div className="grid gap-6 p-6 sm:grid-cols-3">
              <div className="space-y-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400">Passenger</span>
                    <p className="font-semibold text-white">{cardName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400">Flight</span>
                    <p className="font-mono font-bold text-white">{selectedFlight.flightNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400">Class</span>
                    <p className="font-bold text-[#ff6b2b]">{cabinClass}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-y border-white/10 py-3">
                  <div>
                    <p className="font-display text-3xl font-black text-white">{fromAirport.code}</p>
                    <p className="text-xs text-slate-300">{fromAirport.city}</p>
                  </div>
                  <div className="text-center">
                    <Plane className="mx-auto h-4 w-4 text-teal-400" />
                    <span className="text-[10px] text-slate-400">Direct Flight</span>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-black text-white">{toAirport.code}</p>
                    <p className="text-xs text-slate-300">{toAirport.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Date</span>
                    <p className="font-semibold text-white">{deptDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Boarding</span>
                    <p className="font-semibold text-white">06:05 AM</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Gate</span>
                    <p className="font-semibold text-emerald-400">14B</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Seats</span>
                    <p className="font-mono font-bold text-[#ff6b2b]">{selectedSeats.join(", ")}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Total Fare Paid</span>
                    <p className="font-bold text-emerald-400">{totalFormatted}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Airline Carrier</span>
                    <p className="font-bold text-white">{selectedFlight.airline}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Status</span>
                    <p className="font-bold text-emerald-400">Confirmed (E-Ticket)</p>
                  </div>
                </div>
              </div>

              {/* Barcode & QR Code Stub */}
              <div className="flex flex-col items-center justify-center border-t border-dashed border-white/20 pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
                <div className="rounded-xl bg-white p-2 text-slate-950 shadow-md">
                  <QrCode className="h-24 w-24" />
                </div>
                <p className="mt-2 text-center font-mono text-[10px] tracking-widest text-slate-400">
                  ||||| | ||||| || |||
                </p>
                <span className="mt-1 text-[9px] uppercase tracking-wider text-emerald-400">E-Gate Ready</span>
              </div>
            </div>
          </div>

          {/* 2. Self-Guided Tour Itinerary ("No Guide Needed") */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-[#ff6b2b]" />
              <h3 className="font-display text-2xl font-bold text-white">
                Self-Guided Tour Master Plan for {destDetail?.name || toCity}
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              Aapko kisi guide ki jarurat nahi hogi! Yaha har attraction ka real photo, timing, ticket fee, aur exact guidance di gayi hai:
            </p>

            {/* Real HD Attraction Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {(destDetail?.attractions || [
                {
                  id: 1,
                  name: `${toCity} Central Landmark`,
                  description: "Iconic historic architectural highlight with panoramic view.",
                  image_url: `/images/${toCity.toLowerCase().replace(/\s/g, "-")}.jpg`,
                  duration_hours: 2.5,
                  entry_fee_inr: 250,
                  best_time: "morning",
                  crowded: false,
                },
              ]).map((a, i) => (
                <div
                  key={a.id || i}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg transition hover:border-[#ff6b2b]/40"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="h-44 sm:h-auto sm:w-48 shrink-0 overflow-hidden bg-forest-900">
                      <AttractionImage src={a.image_url} alt={a.name} className="h-full w-full" />
                    </div>
                    <div className="flex-1 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff6b2b] text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <h4 className="font-bold text-white">{a.name}</h4>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-3">{a.description}</p>
                      <div className="flex flex-wrap gap-3 pt-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-teal-400" /> {a.duration_hours}h • Best in {a.best_time}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Ticket className="h-3 w-3 text-amber-400" /> {a.entry_fee_inr ? inr(a.entry_fee_inr) : "Free"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Guide-Free Local Insider Advice Box */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-5 space-y-3">
              <h4 className="flex items-center gap-2 font-display text-base font-bold text-teal-300">
                <Navigation className="h-4 w-4" /> Essential Self-Guided Insider Secrets
              </h4>
              <ul className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#ff6b2b] font-bold">✓</span>
                  <span><strong>Local Transport:</strong> Metro card / prepaid counter se cab book karein. Airport par unauthorized agents se bachein.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ff6b2b] font-bold">✓</span>
                  <span><strong>Best Photography:</strong> Golden hour (sunrise 6:00 AM ya sunset 5:30 PM) me crowd kam aur light perfect hoti hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ff6b2b] font-bold">✓</span>
                  <span><strong>Food Guide:</strong> Traditional authentic eateries near old city markets me genuine local taste milta hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ff6b2b] font-bold">✓</span>
                  <span><strong>Offline Navigation:</strong> Google Maps offline download karke rakhein taki bina internet ke route trace ho sake.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
