/**
 * Flight route resolution and multi-currency pricing engine
 * Resolves real airport codes, route-tailored airline schedules, and currency conversions.
 */

export type CurrencyCode = "INR" | "USD" | "EUR" | "AED" | "GBP";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateFromINR: number; // 1 INR = X currency
  format: (amount: number) => string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee (INR)",
    rateFromINR: 1,
    format: (amt) => `₹${Math.round(amt).toLocaleString("en-IN")}`,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar (USD)",
    rateFromINR: 1 / 83.5,
    format: (amt) => `$${Math.round(amt).toLocaleString("en-US")}`,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro (EUR)",
    rateFromINR: 1 / 91.0,
    format: (amt) => `€${Math.round(amt).toLocaleString("de-DE")}`,
  },
  AED: {
    code: "AED",
    symbol: "AED ",
    name: "UAE Dirham (AED)",
    rateFromINR: 1 / 22.7,
    format: (amt) => `AED ${Math.round(amt).toLocaleString("en-AE")}`,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound (GBP)",
    rateFromINR: 1 / 108.5,
    format: (amt) => `£${Math.round(amt).toLocaleString("en-GB")}`,
  },
};

export interface AirportInfo {
  code: string;
  airport: string;
  city: string;
  country: string;
}

export const AIRPORTS: Record<string, AirportInfo> = {
  mumbai: { code: "BOM", airport: "Chhatrapati Shivaji Maharaj Intl", city: "Mumbai", country: "India" },
  delhi: { code: "DEL", airport: "Indira Gandhi Intl", city: "Delhi", country: "India" },
  pune: { code: "PNQ", airport: "Pune International Airport", city: "Pune", country: "India" },
  bengaluru: { code: "BLR", airport: "Kempegowda Intl Airport", city: "Bengaluru", country: "India" },
  bangalore: { code: "BLR", airport: "Kempegowda Intl Airport", city: "Bengaluru", country: "India" },
  chennai: { code: "MAA", airport: "Chennai Intl Airport", city: "Chennai", country: "India" },
  hyderabad: { code: "HYD", airport: "Rajiv Gandhi Intl Airport", city: "Hyderabad", country: "India" },
  kolkata: { code: "CCU", airport: "Netaji Subhash Chandra Bose Intl", city: "Kolkata", country: "India" },
  ahmedabad: { code: "AMD", airport: "Sardar Vallabhbhai Patel Intl", city: "Ahmedabad", country: "India" },
  jaipur: { code: "JAI", airport: "Jaipur International Airport", city: "Jaipur", country: "India" },
  rajasthan: { code: "JAI", airport: "Jaipur International Airport", city: "Jaipur / Rajasthan", country: "India" },
  lucknow: { code: "LKO", airport: "Chaudhary Charan Singh Intl", city: "Lucknow", country: "India" },
  goa: { code: "GOI", airport: "Manohar Intl Airport (Mopa / Dabolim)", city: "Goa", country: "India" },
  kashmir: { code: "SXR", airport: "Sheikh ul-Alam Intl Airport", city: "Srinagar / Kashmir", country: "India" },
  srinagar: { code: "SXR", airport: "Sheikh ul-Alam Intl Airport", city: "Srinagar", country: "India" },
  manali: { code: "KUU", airport: "Kullu–Manali Airport (Bhuntar)", city: "Manali / Kullu", country: "India" },
  himachal: { code: "KUU", airport: "Kullu–Manali Airport (Bhuntar)", city: "Himachal Pradesh", country: "India" },
  kerala: { code: "COK", airport: "Cochin International Airport", city: "Kochi / Kerala", country: "India" },
  munnar: { code: "COK", airport: "Cochin International Airport", city: "Kochi / Munnar", country: "India" },
  varanasi: { code: "VNS", airport: "Lal Bahadur Shastri Intl Airport", city: "Varanasi", country: "India" },
  agra: { code: "AGR", airport: "Agra Domestic Airport / Kheria", city: "Agra", country: "India" },
  amritsar: { code: "ATQ", airport: "Sri Guru Ram Dass Jee Intl", city: "Amritsar", country: "India" },
  ladakh: { code: "IXL", airport: "Kushok Bakula Rimpochee Airport", city: "Leh / Ladakh", country: "India" },
  leh: { code: "IXL", airport: "Kushok Bakula Rimpochee Airport", city: "Leh", country: "India" },
  bali: { code: "DPS", airport: "Ngurah Rai International Airport", city: "Denpasar / Bali", country: "Indonesia" },
  paris: { code: "CDG", airport: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  france: { code: "CDG", airport: "Charles de Gaulle Airport", city: "Paris / France", country: "France" },
  dubai: { code: "DXB", airport: "Dubai International Airport", city: "Dubai", country: "UAE" },
  uae: { code: "DXB", airport: "Dubai International Airport", city: "Dubai / UAE", country: "UAE" },
  zurich: { code: "ZRH", airport: "Zurich International Airport", city: "Zurich", country: "Switzerland" },
  switzerland: { code: "ZRH", airport: "Zurich International Airport", city: "Zurich / Swiss Alps", country: "Switzerland" },
  alps: { code: "ZRH", airport: "Zurich International Airport", city: "Swiss Alps", country: "Switzerland" },
  rome: { code: "FCO", airport: "Leonardo da Vinci–Fiumicino", city: "Rome", country: "Italy" },
  italy: { code: "FCO", airport: "Leonardo da Vinci–Fiumicino", city: "Rome / Italy", country: "Italy" },
  tokyo: { code: "HND", airport: "Haneda / Narita International", city: "Tokyo", country: "Japan" },
  kyoto: { code: "KIX", airport: "Kansai International Airport", city: "Osaka / Kyoto", country: "Japan" },
  japan: { code: "KIX", airport: "Kansai International Airport", city: "Kyoto / Japan", country: "Japan" },
  bangkok: { code: "BKK", airport: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
  thailand: { code: "BKK", airport: "Suvarnabhumi Airport", city: "Bangkok / Thailand", country: "Thailand" },
  newyork: { code: "JFK", airport: "John F. Kennedy Intl", city: "New York", country: "USA" },
  london: { code: "LHR", airport: "Heathrow Airport", city: "London", country: "United Kingdom" },
  singapore: { code: "SIN", airport: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },
};

export function resolveAirport(cityName?: string | null): AirportInfo {
  if (!cityName) {
    return { code: "BOM", airport: "Chhatrapati Shivaji Maharaj Intl", city: "Mumbai", country: "India" };
  }
  const clean = cityName.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, info] of Object.entries(AIRPORTS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return info;
    }
  }
  const code = cityName.slice(0, 3).toUpperCase();
  return {
    code,
    airport: `${cityName} Airport`,
    city: cityName,
    country: "World",
  };
}

export function detectDefaultCurrency(originCity?: string | null, destCity?: string | null): CurrencyCode {
  const o = resolveAirport(originCity);
  const d = resolveAirport(destCity);

  if (o.country === "India") return "INR";
  if (o.country === "France" || o.country === "Italy" || o.country === "Switzerland" || d.country === "France" || d.country === "Switzerland") return "EUR";
  if (o.country === "UAE" || d.country === "UAE") return "AED";
  if (o.country === "United Kingdom" || d.country === "United Kingdom") return "GBP";
  if (o.country === "USA") return "USD";
  return "INR";
}

export interface FlightProposition {
  id: string;
  airline: string;
  flightNumber: string;
  aircraft: string;
  logo: string;
  departureTime: string;
  departureCode: string;
  duration: string;
  stops: string;
  arrivalTime: string;
  arrivalCode: string;
  priceINR: number;
}

export function formatFlightPrice(priceINR: number, currency: CurrencyCode): string {
  const conf = CURRENCIES[currency] || CURRENCIES.INR;
  const converted = priceINR * conf.rateFromINR;
  return conf.format(converted);
}

export function generateFlightsForRoute(
  fromCity: string,
  toCity: string
): FlightProposition[] {
  const origin = resolveAirport(fromCity);
  const dest = resolveAirport(toCity);
  const isDomesticIndia = origin.country === "India" && dest.country === "India";
  const isBali = dest.city.toLowerCase().includes("bali") || dest.code === "DPS";
  const isParis = dest.city.toLowerCase().includes("paris") || dest.code === "CDG";
  const isDubai = dest.city.toLowerCase().includes("dubai") || dest.code === "DXB";
  const isSwiss = dest.city.toLowerCase().includes("swiss") || dest.city.toLowerCase().includes("zurich") || dest.code === "ZRH";

  if (isDomesticIndia) {
    return [
      {
        id: "fl-6e-1",
        airline: "IndiGo",
        flightNumber: `6E-${Math.floor(2000 + Math.random() * 4000)}`,
        aircraft: "Airbus A320neo",
        logo: "🇮🇳",
        departureTime: "06:15 AM",
        departureCode: origin.code,
        duration: "1h 15m",
        stops: "Non-stop",
        arrivalTime: "07:30 AM",
        arrivalCode: dest.code,
        priceINR: 4250,
      },
      {
        id: "fl-ai-2",
        airline: "Air India",
        flightNumber: `AI-${Math.floor(400 + Math.random() * 500)}`,
        aircraft: "Airbus A321neo",
        logo: "🇮🇳",
        departureTime: "10:30 AM",
        departureCode: origin.code,
        duration: "1h 20m",
        stops: "Non-stop",
        arrivalTime: "11:50 AM",
        arrivalCode: dest.code,
        priceINR: 4890,
      },
      {
        id: "fl-qp-3",
        airline: "Akasa Air",
        flightNumber: `QP-${Math.floor(1100 + Math.random() * 400)}`,
        aircraft: "Boeing 737 MAX 8",
        logo: "🇮🇳",
        departureTime: "02:15 PM",
        departureCode: origin.code,
        duration: "1h 15m",
        stops: "Non-stop",
        arrivalTime: "03:30 PM",
        arrivalCode: dest.code,
        priceINR: 3750,
      },
      {
        id: "fl-uk-4",
        airline: "Vistara",
        flightNumber: `UK-${Math.floor(800 + Math.random() * 150)}`,
        aircraft: "Airbus A321LR",
        logo: "🇮🇳",
        departureTime: "06:00 PM",
        departureCode: origin.code,
        duration: "1h 25m",
        stops: "Non-stop",
        arrivalTime: "07:25 PM",
        arrivalCode: dest.code,
        priceINR: 5490,
      },
      {
        id: "fl-sg-5",
        airline: "SpiceJet",
        flightNumber: `SG-${Math.floor(200 + Math.random() * 300)}`,
        aircraft: "Boeing 737-800",
        logo: "🇮🇳",
        departureTime: "09:10 PM",
        departureCode: origin.code,
        duration: "1h 15m",
        stops: "Non-stop",
        arrivalTime: "10:25 PM",
        arrivalCode: dest.code,
        priceINR: 3490,
      },
    ];
  }

  if (isBali) {
    return [
      {
        id: "fl-ga-1",
        airline: "Garuda Indonesia",
        flightNumber: "GA-832",
        aircraft: "Airbus A330-300",
        logo: "🇮🇩",
        departureTime: "05:45 AM",
        departureCode: origin.code,
        duration: "8h 45m",
        stops: "1 stop (CGK)",
        arrivalTime: "04:30 PM",
        arrivalCode: dest.code,
        priceINR: 26500,
      },
      {
        id: "fl-sq-2",
        airline: "Singapore Airlines",
        flightNumber: "SQ-421",
        aircraft: "Boeing 787-10 Dreamliner",
        logo: "🇸🇬",
        departureTime: "11:20 AM",
        departureCode: origin.code,
        duration: "9h 10m",
        stops: "1 stop (SIN)",
        arrivalTime: "10:30 PM",
        arrivalCode: dest.code,
        priceINR: 32400,
      },
      {
        id: "fl-6e-3",
        airline: "IndiGo",
        flightNumber: "6E-1051",
        aircraft: "Airbus A321neo XLR",
        logo: "🇮🇳",
        departureTime: "07:15 AM",
        departureCode: origin.code,
        duration: "7h 55m",
        stops: "Non-stop",
        arrivalTime: "05:10 PM",
        arrivalCode: dest.code,
        priceINR: 21900,
      },
      {
        id: "fl-id-4",
        airline: "Batik Air",
        flightNumber: "OD-206",
        aircraft: "Boeing 737-800",
        logo: "🇲🇾",
        departureTime: "11:10 PM",
        departureCode: origin.code,
        duration: "9h 30m",
        stops: "1 stop (KUL)",
        arrivalTime: "10:40 AM",
        arrivalCode: dest.code,
        priceINR: 23800,
      },
    ];
  }

  if (isParis) {
    return [
      {
        id: "fl-af-1",
        airline: "Air France",
        flightNumber: "AF-217",
        aircraft: "Boeing 777-300ER",
        logo: "🇫🇷",
        departureTime: "02:10 AM",
        departureCode: origin.code,
        duration: "9h 25m",
        stops: "Non-stop",
        arrivalTime: "07:35 AM",
        arrivalCode: dest.code,
        priceINR: 48900,
      },
      {
        id: "fl-ai-2",
        airline: "Air India",
        flightNumber: "AI-143",
        aircraft: "Boeing 787-8 Dreamliner",
        logo: "🇮🇳",
        departureTime: "09:45 AM",
        departureCode: origin.code,
        duration: "9h 35m",
        stops: "Non-stop",
        arrivalTime: "03:20 PM",
        arrivalCode: dest.code,
        priceINR: 44200,
      },
      {
        id: "fl-ek-3",
        airline: "Emirates",
        flightNumber: "EK-501",
        aircraft: "Airbus A380-800",
        logo: "🇦🇪",
        departureTime: "04:30 AM",
        departureCode: origin.code,
        duration: "11h 20m",
        stops: "1 stop (DXB)",
        arrivalTime: "01:25 PM",
        arrivalCode: dest.code,
        priceINR: 46500,
      },
      {
        id: "fl-qr-4",
        airline: "Qatar Airways",
        flightNumber: "QR-557",
        aircraft: "Airbus A350-1000",
        logo: "🇶🇦",
        departureTime: "03:55 AM",
        departureCode: origin.code,
        duration: "11h 45m",
        stops: "1 stop (DOH)",
        arrivalTime: "01:40 PM",
        arrivalCode: dest.code,
        priceINR: 43800,
      },
    ];
  }

  if (isDubai) {
    return [
      {
        id: "fl-ek-1",
        airline: "Emirates",
        flightNumber: "EK-507",
        aircraft: "Boeing 777-300ER",
        logo: "🇦🇪",
        departureTime: "04:15 AM",
        departureCode: origin.code,
        duration: "3h 40m",
        stops: "Non-stop",
        arrivalTime: "06:55 AM",
        arrivalCode: dest.code,
        priceINR: 19400,
      },
      {
        id: "fl-6e-2",
        airline: "IndiGo",
        flightNumber: "6E-1461",
        aircraft: "Airbus A320neo",
        logo: "🇮🇳",
        departureTime: "09:20 AM",
        departureCode: origin.code,
        duration: "3h 45m",
        stops: "Non-stop",
        arrivalTime: "12:05 PM",
        arrivalCode: dest.code,
        priceINR: 13900,
      },
      {
        id: "fl-fz-3",
        airline: "FlyDubai",
        flightNumber: "FZ-446",
        aircraft: "Boeing 737 MAX 8",
        logo: "🇦🇪",
        departureTime: "02:30 PM",
        departureCode: origin.code,
        duration: "3h 45m",
        stops: "Non-stop",
        arrivalTime: "05:15 PM",
        arrivalCode: dest.code,
        priceINR: 14800,
      },
      {
        id: "fl-ai-4",
        airline: "Air India",
        flightNumber: "AI-995",
        aircraft: "Airbus A321neo",
        logo: "🇮🇳",
        departureTime: "08:15 PM",
        departureCode: origin.code,
        duration: "3h 40m",
        stops: "Non-stop",
        arrivalTime: "10:55 PM",
        arrivalCode: dest.code,
        priceINR: 16200,
      },
    ];
  }

  if (isSwiss) {
    return [
      {
        id: "fl-lx-1",
        airline: "SWISS International",
        flightNumber: "LX-155",
        aircraft: "Boeing 777-300ER",
        logo: "🇨🇭",
        departureTime: "01:25 AM",
        departureCode: origin.code,
        duration: "9h 15m",
        stops: "Non-stop",
        arrivalTime: "06:40 AM",
        arrivalCode: dest.code,
        priceINR: 52400,
      },
      {
        id: "fl-lh-2",
        airline: "Lufthansa",
        flightNumber: "LH-757",
        aircraft: "Airbus A350-900",
        logo: "🇩🇪",
        departureTime: "03:10 AM",
        departureCode: origin.code,
        duration: "11h 10m",
        stops: "1 stop (FRA)",
        arrivalTime: "12:20 PM",
        arrivalCode: dest.code,
        priceINR: 47800,
      },
      {
        id: "fl-ek-3",
        airline: "Emirates",
        flightNumber: "EK-87",
        aircraft: "Airbus A380-800",
        logo: "🇦🇪",
        departureTime: "04:30 AM",
        departureCode: origin.code,
        duration: "11h 45m",
        stops: "1 stop (DXB)",
        arrivalTime: "01:45 PM",
        arrivalCode: dest.code,
        priceINR: 46200,
      },
    ];
  }

  // Generic international fallback with customized origin/dest codes
  return [
    {
      id: "fl-gen-1",
      airline: "Star Alliance Flagship",
      flightNumber: `SA-${Math.floor(100 + Math.random() * 800)}`,
      aircraft: "Boeing 787-9 Dreamliner",
      logo: "✈️",
      departureTime: "06:45 AM",
      departureCode: origin.code,
      duration: "6h 30m",
      stops: "Non-stop",
      arrivalTime: "01:15 PM",
      arrivalCode: dest.code,
      priceINR: 28500,
    },
    {
      id: "fl-gen-2",
      airline: "SkyTeam International",
      flightNumber: `ST-${Math.floor(200 + Math.random() * 700)}`,
      aircraft: "Airbus A350-900",
      logo: "🌐",
      departureTime: "11:20 AM",
      departureCode: origin.code,
      duration: "8h 15m",
      stops: "1 stop",
      arrivalTime: "07:35 PM",
      arrivalCode: dest.code,
      priceINR: 24900,
    },
    {
      id: "fl-gen-3",
      airline: "OneWorld Global Express",
      flightNumber: `OW-${Math.floor(300 + Math.random() * 600)}`,
      aircraft: "Boeing 777-300ER",
      logo: "🛫",
      departureTime: "04:40 PM",
      departureCode: origin.code,
      duration: "6h 45m",
      stops: "Non-stop",
      arrivalTime: "11:25 PM",
      arrivalCode: dest.code,
      priceINR: 27200,
    },
  ];
}
