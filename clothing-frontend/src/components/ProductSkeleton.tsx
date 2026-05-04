import React from "react";

interface SkeletonProps {
  isCardMode?: boolean;
}

// ─── Shared Image Placeholder ───────────────────────────────────────────────
const ImagePlaceholder = () => (
  <>
    <div className="absolute inset-0 animate-breathe bg-gradient-to-br from-skeletonBase via-[#EEECE6] to-skeletonBase dark:from-bgHover-dark dark:via-bgSecondary-dark dark:to-bgHover-dark transition-colors duration-500 ease-smooth" />
    <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] mix-blend-multiply dark:mix-blend-screen noise-texture pointer-events-none" />
    <span className="relative z-10 font-heading text-6xl md:text-7xl font-extralight italic text-textPrimary dark:text-textPrimary-dark opacity-[0.05] dark:opacity-[0.04] tracking-tight animate-watermark select-none transition-colors duration-500 ease-smooth">
      DOPE
    </span>
  </>
);

// ─── Text Line Skeletons ─────────────────────────────────────────────────────
const TextSkeletons = () => (
  <div className="pt-4 pb-2 flex flex-col gap-3">
    <div className="h-[7px] w-12 rounded-[1px] bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe" />
    <div className="flex flex-col gap-1.5">
      <div className="h-[10px] w-[85%] rounded-[1px] bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe" />
      <div className="h-[10px] w-[50%] rounded-[1px] bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe" />
    </div>
    <div className="h-[10px] w-16 rounded-[1px] mt-1 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe" />
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const ProductSkeleton: React.FC<SkeletonProps> = ({
  isCardMode = false,
}) => {
  if (isCardMode) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-skeletonBase dark:bg-bgHover-dark transition-colors duration-500 ease-smooth">
        <ImagePlaceholder />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full animate-fade-in">
      <div className="relative aspect-[3/4] w-full overflow-hidden flex items-center justify-center bg-skeletonBase dark:bg-bgHover-dark transition-colors duration-500 ease-smooth">
        <ImagePlaceholder />
      </div>
      <TextSkeletons />
    </div>
  );
};

/**
 * Helper to render a full grid of skeletons to prevent layout shift.
 * Usage: <SkeletonGrid count={12} />
 */
export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </>
);
