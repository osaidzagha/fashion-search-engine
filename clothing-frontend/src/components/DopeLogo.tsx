// DopeLogo — SVG wordmark that matches the site's Cormorant Garamond typography.
// Uses currentColor so it automatically adapts to dark/light mode.
// The ↓ inside the O represents the core value prop: price drops.

interface DopeLogoProps {
  className?: string;
  height?: number;
}

export default function DopeLogo({ className = "", height = 22 }: DopeLogoProps) {
  return (
    <svg
      viewBox="0 0 220 36"
      height={height}
      aria-label="Dope"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Uses the page's loaded Cormorant Garamond font */}
      <text
        fontFamily="'Cormorant Garamond', 'Cormorant', Georgia, serif"
        fontWeight="300"
        fontSize="32"
        letterSpacing="10"
        fill="currentColor"
        x="0"
        y="28"
        style={{ fontVariantLigatures: "none" }}
      >
        D
        {/* O with price-drop arrow overlay */}
      </text>

      {/* Custom O with embedded ↓ arrow */}
      <g transform="translate(38, 0)">
        {/* The O letterform — drawn as ellipse strokes to match thin-weight serif */}
        <ellipse
          cx="18"
          cy="17"
          rx="16"
          ry="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        {/* Thin downward arrow inside the O */}
        <line x1="18" y1="8" x2="18" y2="24" stroke="currentColor" strokeWidth="0.9" />
        <polyline
          points="13,20 18,26 23,20"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>

      {/* P and E */}
      <text
        fontFamily="'Cormorant Garamond', 'Cormorant', Georgia, serif"
        fontWeight="300"
        fontSize="32"
        letterSpacing="10"
        fill="currentColor"
        x="76"
        y="28"
        style={{ fontVariantLigatures: "none" }}
      >
        PE
      </text>
    </svg>
  );
}
