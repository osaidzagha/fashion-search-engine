// src/styles/theme.ts

export const theme = {
  colors: {
    // ── BACKGROUNDS ──
    bgPrimary: "#0a0a09", // The deepest dark for the main page
    bgSecondary: "#1a1a18", // Slightly lighter for cards/panels
    bgHover: "#2e2e2c", // For button hovers

    // ── TEXT ──
    textPrimary: "#f0ede6", // Purest white/cream for main titles
    textSecondary: "#d1ceca", // Slightly dimmed for subtitles
    textTertiary: "#b5b2ac", // Soft grey for descriptions/paragraphs
    textMuted: "#8a8784", // Dark grey for tiny uppercase labels

    // ── ACCENTS & BORDERS ──
    accentRed: "#b94040", // For sale tags and warnings
    accentGreen: "#c8e6c9", // For "winner" and success states
    borderLight: "#5a5754", // Visible borders
    borderDark: "#1e1e1c", // Very subtle dividers
  },

  fonts: {
    heading: "'Cormorant Garamond', serif",
    sans: "'DM Sans', sans-serif",
  },
};
