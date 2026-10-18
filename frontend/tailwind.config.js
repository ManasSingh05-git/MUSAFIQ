/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 950: "#08140f", 900: "#0d211a", 800: "#12302b", 700: "#1a4039", 600: "#25574d" },
        teal: { muted: "#5f8f8b" },
        cream: "#f1ede4",
        amber: { accent: "#e9a24b" },
        coral: { accent: "#e8795f" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: { glass: "0 10px 40px -12px rgba(0,0,0,0.55)" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        drift: { from: { transform: "translateX(-10%)" }, to: { transform: "translateX(110vw)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
        pulseRing: { "0%": { transform: "scale(.6)", opacity: ".9" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        drift: "drift 90s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        spinSlow: "spinSlow 40s linear infinite",
        pulseRing: "pulseRing 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
