// DopeLogo — Simple, clean wordmark using the site's existing Cormorant Garamond font.
// No SVG positioning tricks. currentColor means it auto-adapts to dark/light mode.

interface DopeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-[14px]",
  md: "text-[18px]",
  lg: "text-[24px]",
};

export default function DopeLogo({ className = "", size = "md" }: DopeLogoProps) {
  return (
    <span
      className={`font-heading font-light tracking-[0.22em] uppercase select-none ${sizes[size]} ${className}`}
      style={{ fontFamily: "'Cormorant Garamond', 'Cormorant', Georgia, serif" }}
    >
      dope
      <span
        className="inline-block ml-[0.08em] opacity-60"
        style={{ fontSize: "0.55em", verticalAlign: "super", letterSpacing: 0 }}
        aria-hidden="true"
      >
        ↓
      </span>
    </span>
  );
}
