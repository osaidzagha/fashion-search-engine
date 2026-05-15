import { useState, useEffect, useRef } from "react";
import { Product } from "../types";

// ─── The Shuffle Algorithm (Fisher-Yates) ─────────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function CampaignHeroSlider({ heroes }: { heroes: Product[] }) {
  const [currentDeck, setCurrentDeck] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const heroIds = heroes
    ? heroes
        .map((h) => h.id)
        .sort()
        .join(",")
    : "";

  useEffect(() => {
    if (heroes && heroes.length > 0) {
      setCurrentDeck(shuffleArray([...heroes]));
      setCurrentIndex(0);
    }
  }, [heroIds]);

  if (!currentDeck || currentDeck.length === 0) return null;

  const handleVideoEnd = () => {
    if (currentIndex >= currentDeck.length - 1) {
      setCurrentDeck(shuffleArray([...heroes]));
      setCurrentIndex(0);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black cursor-pointer group">
      {currentDeck.map((hero, index) => {
        const isActive = index === currentIndex;

        return (
          <div
            key={`${hero.id}-${index}`}
            onClick={() => (window.location.href = `/product/${hero.id}`)}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive
                ? "opacity-100 z-10"
                : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <HeroVideo
              src={hero.videos?.[0] || ""}
              isActive={isActive}
              onEnded={handleVideoEnd}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            {/* ✅ FIX: Responsive padding and responsive typography scale */}
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col gap-2 md:gap-3 transform translate-y-2 md:translate-y-4 transition-transform duration-700 md:group-hover:translate-y-0 z-20">
              <span className="font-sans text-[8px] md:text-[10px] tracking-[0.3em] uppercase text-white/70 drop-shadow-md">
                {hero.brand}
              </span>
              <h3 className="font-heading font-light text-3xl md:text-5xl text-white leading-tight drop-shadow-xl pr-12">
                {hero.name}
              </h3>
              <span className="font-sans text-[9px] md:text-[11px] tracking-widest uppercase text-white opacity-80 md:opacity-0 transition-opacity duration-700 md:group-hover:opacity-100 mt-1 md:mt-2 drop-shadow-md">
                Discover Campaign →
              </span>
            </div>
          </div>
        );
      })}

      {/* Progress Line Indicators */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-12 z-30 flex gap-2">
        {currentDeck.map((_, i) => (
          <div
            key={i}
            className={`h-[2px] transition-all duration-700 ${
              i === currentIndex
                ? "w-6 md:w-8 bg-white"
                : "w-3 md:w-4 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-Component: Manages the actual video play state ──────────────
function HeroVideo({
  src,
  isActive,
  onEnded,
}: {
  src: string;
  isActive: boolean;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((e) => {
        console.error("Autoplay prevented or failed:", e);
        onEnded();
      });
    } else {
      const timeout = setTimeout(() => {
        videoRef.current?.pause();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isActive, onEnded]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      onEnded={onEnded}
      onError={onEnded}
      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-1000"
    />
  );
}
