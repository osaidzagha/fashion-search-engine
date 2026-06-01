/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── LIGHT MODE: crisp white + near-black for real contrast
        // ── DARK MODE: unchanged — it already looks great
        bgPrimary: {
          DEFAULT: "#ffffff", // was #faf9f6 — pure white, no more muddy cream
          dark: "#0a0a09",
        },
        bgSecondary: {
          DEFAULT: "#f7f7f5", // was #ffffff — now used for subtle card surfaces
          dark: "#1a1a18",
        },
        bgHover: {
          DEFAULT: "#f0f0ed", // was #f0f0f0 — warmer, more editorial
          dark: "#2e2e2c",
        },

        // ── TEXT: every level bumped for readability ──
        textPrimary: {
          DEFAULT: "#111111", // was #1a1a1a — near-black, strong
          dark: "#f0ede6",
        },
        textSecondary: {
          DEFAULT: "#444444", // was #888888 — this was the big readability culprit
          dark: "#d1ceca",
        },
        textTertiary: {
          DEFAULT: "#555555", // was #666666 — used for prices, slightly bolder
          dark: "#b5b2ac",
        },
        textMuted: {
          DEFAULT: "#777777", // was #a0a0a0 — invisible on white, now legible
          dark: "#8a8784",
        },

        // ── ACCENTS & BORDERS: unchanged ──
        accentRed: "#b94040",
        accentGreen: "#c8e6c9",

        borderLight: {
          DEFAULT: "#e2e2e2", // was #e8e4dc — neutral grey, not warm beige
          dark: "#2a2a28", // was #5a5754 — darker in dark mode for subtlety
        },
        borderDark: {
          DEFAULT: "#cccccc",
          dark: "#1e1e1c",
        },

        // ── SKELETON: matches new white bg ──
        skeletonBase: "#efefed", // was #F5F5F3 — slightly more visible on white
      },

      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        heading: ["'Cormorant Garamond'", "serif"],
      },

      letterSpacing: {
        widest: ".15em",
        editorial: ".25em",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        elegant: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      boxShadow: {
        premium: "0 10px 30px -10px rgba(0, 0, 0, 0.06)",
        "premium-dark": "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
      },

      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        watermarkFloat: {
          "0%, 100%": { transform: "translateY(0px)", opacity: "0.05" },
          "50%": { transform: "translateY(-6px)", opacity: "0.08" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        itemIn: {
          from: { transform: "scale(0.85)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
      },

      animation: {
        breathe: "breathe 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "item-in": "itemIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};
