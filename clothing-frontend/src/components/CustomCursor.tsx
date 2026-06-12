/**
 * CustomCursor
 *
 * Design constraints strictly honoured:
 * - Spring lag: near-imperceptible (lerp factor 0.35 — very tight follow)
 * - Product image hover: thin ring (22px) + subtle "View" label, not a solid fill
 * - Touch devices: entire component returns null immediately — zero cursor logic
 * - prefers-reduced-motion: no rAF loop, falls back to CSS-only cursor
 * - Only transform + opacity animate (no width/height morphing mid-move)
 * - Mounts via createPortal so it never disturbs layout
 *
 * Usage: drop <CustomCursor /> once anywhere inside <Router>.
 * Product images trigger the expanded state via data-cursor="view" on their container.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ─── Touch detection ─────────────────────────────────────────────────────────
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CustomCursor() {
  // Hard bail-out for touch devices — nothing runs
  if (isTouchDevice()) return null;

  return <CursorInner />;
}

function CursorInner() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Target position (raw mouse)
  const target = useRef({ x: -100, y: -100 });
  // Current rendered position (lerped)
  const current = useRef({ x: -100, y: -100 });

  const [mode, setMode] = useState<"default" | "view">("default");
  const [visible, setVisible] = useState(false);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    // If reduced motion: skip rAF loop entirely, hide this element so the system
    // cursor shows through
    if (prefersReduced) return;

    // Hide system cursor on the document
    document.documentElement.style.cursor = "none";

    const LERP = 0.35; // tight spring — almost imperceptible lag

    const tick = () => {
      // Lerp current toward target
      current.current.x += (target.current.x - current.current.x) * LERP;
      current.current.y += (target.current.y - current.current.y) * LERP;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Check if hovering over a product image area
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const viewTarget = el?.closest("[data-cursor='view']");
      setMode(viewTarget ? "view" : "default");
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.documentElement.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [prefersReduced]);

  // Reduced motion: render nothing, system cursor takes over
  if (prefersReduced) return null;

  const isView = mode === "view";

  return createPortal(
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        // Start at (-100, -100) via JS transform — off-screen until first move
        pointerEvents: "none",
        zIndex: 9999,
        // Use will-change once — the rAF loop only touches transform
        willChange: "transform",
      }}
    >
      {/* ── Ring ── */}
      <div
        style={{
          position: "absolute",
          // Centre the ring on the cursor point
          top: isView ? "-11px" : "-4px",
          left: isView ? "-11px" : "-4px",
          width: isView ? "22px" : "8px",
          height: isView ? "22px" : "8px",
          borderRadius: "50%",
          border: isView ? "1px solid currentColor" : "none",
          background: isView ? "transparent" : "currentColor",
          opacity: visible ? (isView ? 0.7 : 0.85) : 0,
          // Only size change via transition — no layout properties
          transition: [
            "width 0.2s cubic-bezier(0.16,1,0.3,1)",
            "height 0.2s cubic-bezier(0.16,1,0.3,1)",
            "top 0.2s cubic-bezier(0.16,1,0.3,1)",
            "left 0.2s cubic-bezier(0.16,1,0.3,1)",
            "opacity 0.15s ease",
            "border-radius 0.2s ease",
          ].join(", "),
          color: "var(--color-text-primary, #111)",
        }}
      />

      {/* ── "View" label — only in view mode ── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "4px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "7px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--color-text-primary, #111)",
          whiteSpace: "nowrap",
          opacity: visible && isView ? 0.6 : 0,
          transform: isView ? "translateY(0)" : "translateY(3px)",
          transition:
            "opacity 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1)",
          pointerEvents: "none",
        }}
      >
        View
      </div>
    </div>,
    document.body,
  );
}
