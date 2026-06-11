import { useEffect, useRef, ReactNode } from "react";

/**
 * RevealOnScroll
 *
 * Wraps any content and reveals it when it enters the viewport.
 * Uses IntersectionObserver — no layout repaints, only transform + opacity.
 *
 * Constraints honoured:
 * - prefers-reduced-motion: skips animation entirely, renders content visible.
 * - Animates only transform (translateY) + opacity.
 * - Self-contained: zero Framer Motion, no state shared with parent.
 *
 * Props:
 *   delay     — ms delay before animation starts (for manual stagger)
 *   distance  — px distance for the translateY entry (default 28)
 *   threshold — 0–1, how much of element must be visible before trigger (default 0.12)
 *   once      — if true (default), animation only triggers once
 *   className — passed to the wrapper div
 */
interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  distance?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function RevealOnScroll({
  children,
  delay = 0,
  distance = 28,
  threshold = 0.12,
  once = true,
  className = "",
  as: Tag = "div",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement>(null);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced) return;

    // Set initial invisible state via inline style (not a class, so no FOUC)
    el.style.opacity = "0";
    el.style.transform = `translateY(${distance}px)`;
    el.style.transition = `opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            if (once) observer.unobserve(el);
          } else if (!once) {
            el.style.opacity = "0";
            el.style.transform = `translateY(${distance}px)`;
          }
        });
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, distance, threshold, once, prefersReduced]);

  return (
    // @ts-ignore – dynamic tag
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/**
 * StaggerReveal
 *
 * Wraps a list of items and reveals each child with an auto-calculated
 * stagger delay. Children are revealed sequentially as the container enters view.
 *
 * Usage:
 *   <StaggerReveal stagger={60}>
 *     {items.map(item => <ProductCard key={item.id} {...item} />)}
 *   </StaggerReveal>
 */
interface StaggerRevealProps {
  children: ReactNode[];
  stagger?: number;   // ms between each child's reveal (default 60)
  distance?: number;  // px translateY (default 24)
  threshold?: number; // IntersectionObserver threshold (default 0.05)
  className?: string; // class on the wrapper element
  itemClassName?: string; // class on each child wrapper
}

export function StaggerReveal({
  children,
  stagger = 60,
  distance = 24,
  threshold = 0.05,
  className = "",
  itemClassName = "",
}: StaggerRevealProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <RevealOnScroll
          key={i}
          delay={i * stagger}
          distance={distance}
          threshold={threshold}
          className={itemClassName}
        >
          {child}
        </RevealOnScroll>
      ))}
    </div>
  );
}
