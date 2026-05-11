import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

// ─── Variants ─────────────────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // The delay between each card
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      // The 'as const' forces TS to read this as exactly 4 numbers, not a generic array
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// ─── Components ───────────────────────────────────────────────────────────────
export function AnimatedGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      // "whileInView" triggers the animation when the grid scrolls into view!
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGridItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
