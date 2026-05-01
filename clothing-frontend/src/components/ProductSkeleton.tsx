import React from "react";

interface SkeletonProps {
  isCardMode?: boolean;
}

export const ProductSkeleton: React.FC<SkeletonProps> = ({
  isCardMode = false,
}) => {
  // ── 1. The Core UI (Your beautiful animation) ──
  const ImageBox = (
    <>
      {/* Soft breathing gradient */}
      <div className="absolute inset-0 animate-breathe bg-gradient-to-br from-skeletonBase via-[#EEECE6] to-skeletonBase" />
      {/* Noise texture (premium feel) */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-multiply noise-texture pointer-events-none" />
      {/* Watermark */}
      <span className="relative z-10 font-heading text-6xl md:text-7xl font-extralight italic text-textPrimary opacity-[0.05] tracking-tight animate-watermark select-none">
        DOPE
      </span>
    </>
  );

  // ── 2. CARD MODE (Returns only the absolute overlay) ──
  if (isCardMode) {
    return (
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-20 bg-skeletonBase">
        {ImageBox}
      </div>
    );
  }

  // ── 3. GRID MODE (Returns the full structural block + text lines) ──
  return (
    <div className="flex flex-col w-full">
      {/* Image Frame (Holds physical shape!) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden flex items-center justify-center bg-skeletonBase">
        {ImageBox}
      </div>

      {/* Text Skeletons (Also using your animate-breathe!) */}
      <div className="pt-4 pb-2 flex flex-col gap-3">
        <div className="h-[7px] w-12 bg-black/[0.04] animate-breathe" />
        <div className="flex flex-col gap-1.5">
          <div className="h-[10px] w-[85%] bg-black/[0.04] animate-breathe" />
          <div className="h-[10px] w-[50%] bg-black/[0.04] animate-breathe" />
        </div>
        <div className="h-[10px] w-16 bg-black/[0.04] mt-1 animate-breathe" />
      </div>
    </div>
  );
};
