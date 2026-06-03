// DopeLogo — Clean Cormorant Garamond wordmark. No arrow, just pure typography.
// Inherits color from parent via className so it works in light and dark mode.

interface DopeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "text-[13px]",
  md: "text-[17px]",
  lg: "text-[22px]",
};

export default function DopeLogo({ className = "", size = "md" }: DopeLogoProps) {
  return (
    <span
      className={`font-heading font-light tracking-[0.28em] uppercase select-none ${SIZES[size]} ${className}`}
      style={{ fontFamily: "'Cormorant Garamond', 'Cormorant', Georgia, serif" }}
    >
      Dope
    </span>
  );
}
