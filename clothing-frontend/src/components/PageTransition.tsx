import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      // 1. Initial state before it enters the screen (slightly lower and invisible)
      initial={{ opacity: 0, y: 12 }}
      // 2. The state when it is fully mounted
      animate={{ opacity: 1, y: 0 }}
      // 3. The state when it is unmounting (fades out and moves up slightly)
      exit={{ opacity: 0, y: -12 }}
      // 4. The "Easing": We use a very smooth, deliberate curve for that luxury feel
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1], // This is a custom cubic-bezier for a "silky" stop
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
