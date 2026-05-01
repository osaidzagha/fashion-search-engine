/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bgPrimary: "#faf9f6",
        textPrimary: "#1a1a1a",
        textSecondary: "#888",
        borderDark: "#e8e4dc",
        skeletonBase: "#F5F5F3",
      },

      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        heading: ["'Cormorant Garamond'", "serif"],
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
      },

      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        watermark: "watermarkFloat 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
