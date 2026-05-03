/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // <--- This is the magic key for your toggle
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bgPrimary: {
          DEFAULT: "#faf9f6",
          dark: "#0a0a09",
        },
        bgSecondary: {
          DEFAULT: "#ffffff",
          dark: "#1a1a18",
        },
        bgHover: {
          DEFAULT: "#f0f0f0",
          dark: "#2e2e2c",
        },
        textPrimary: {
          DEFAULT: "#1a1a1a",
          dark: "#f0ede6",
        },
        textSecondary: {
          DEFAULT: "#888888",
          dark: "#d1ceca",
        },
        textTertiary: {
          DEFAULT: "#666666",
          dark: "#b5b2ac",
        },
        textMuted: {
          DEFAULT: "#a0a0a0",
          dark: "#8a8784",
        },
        accentRed: "#b94040",
        accentGreen: "#c8e6c9",
        borderLight: {
          DEFAULT: "#e8e4dc",
          dark: "#5a5754",
        },
        borderDark: {
          DEFAULT: "#cccccc",
          dark: "#1e1e1c",
        },
        skeletonBase: "#F5F5F3",
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
        premium: "0 10px 30px -10px rgba(0, 0, 0, 0.05)",
        "premium-dark": "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
      },

      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        watermarkFloat: {
          "0%, 100%": {
            transform: "translateY(0px)",
            opacity: "0.05",
          },
          "50%": {
            transform: "translateY(-6px)",
            opacity: "0.08",
          },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      slideUp: {
        from: { transform: "translateY(100%)", opacity: "0" },
        to: { transform: "translateY(0)", opacity: "1" },
      },
      itemIn: {
        from: { transform: "scale(0.85)", opacity: "0" },
        to: { transform: "scale(1)", opacity: "1" },
      },
    },
    animation: {
      // ...your existing animations...
      "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      "item-in": "itemIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
    },
  },
  plugins: [],
};
