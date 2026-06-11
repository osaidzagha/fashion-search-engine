import { useState, useEffect, useRef } from "react";

/**
 * useScrollBehavior
 *
 * Tracks scroll direction and depth to drive navbar shrink/hide behaviour.
 *
 * Rules:
 * - Only transforms (translateY) are used — never top/margin/height.
 * - prefers-reduced-motion: navbar never hides, it only transitions opacity.
 * - Passive listener for zero jank on scroll thread.
 */
export function useScrollBehavior(threshold = 12) {
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [isScrolled, setIsScrolled] = useState(false); // past the threshold → compact state
  const [isHidden, setIsHidden] = useState(false); // scrolling down fast → slide navbar up

  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastY.current;

        // Crossed the visual threshold → enter compact mode
        setIsScrolled(currentY > threshold);

        // Only hide/show if motion is allowed
        if (!prefersReduced) {
          if (delta > 6 && currentY > 80) {
            // Scrolling down past 80px → hide navbar
            setIsHidden(true);
          } else if (delta < -4) {
            // Any upward scroll → reveal immediately
            setIsHidden(false);
          }
        }

        lastY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prefersReduced, threshold]);

  return { isScrolled, isHidden };
}
