import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          DEFAULT: "#1A1A2E",
          2: "#23233D",
          3: "#2d2d48",
        },
        green: {
          DEFAULT: "#00C896",
          d: "#00a87e",
        },
        ice: "#EAF9F4",
        cool: "#E8E8F0",
        gray: {
          DEFAULT: "#6B6B8A",
        },
        // Keep old colors for other pages that may use them
        "ns-blue": {
          500: "#030386",
          600: "#05015B",
        },
        "ns-light": "#E3ECF8",
        "ns-text": "#3B3B39",
        "ns-accent": "#DCDCEE",
        "ms-blue": {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#0078D4",
          600: "#0067b8",
          700: "#005a9e",
          800: "#004578",
          900: "#003057",
          950: "#001e36",
        },
        "dark-slate": {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        heading: [
          "'Bricolage Grotesque'",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        body: ["'Figtree'", "system-ui", "-apple-system", "sans-serif"],
        sans: ["'Figtree'", "system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
