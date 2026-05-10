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
  // We now store the actively shuffled deck in State, not just useMemo!
  const [currentDeck, setCurrentDeck] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Create a "fingerprint" so React knows when the actual database products change
  const heroIds = heroes
    ? heroes
        .map((h) => h.id)
        .sort()
        .join(",")
    : "";

  // 2. Initialize the first deck when the page loads
  useEffect(() => {
    if (heroes && heroes.length > 0) {
      setCurrentDeck(shuffleArray([...heroes]));
      setCurrentIndex(0);
    }
  }, [heroIds]);

  if (!currentDeck || currentDeck.length === 0) return null;

  // 3. The Playlist Engine
  const handleVideoEnd = () => {
    if (currentIndex >= currentDeck.length - 1) {
      // 🏆 We reached the end of the playlist!
      // Shuffle the original heroes array to create a brand new deck, and reset to 0.
      setCurrentDeck(shuffleArray([...heroes]));
      setCurrentIndex(0);
    } else {
      // Move to the next video in the current deck
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

            {/* The Luxury Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            {/* The Typography */}
            <div className="absolute bottom-0 left-0 w-full p-12 flex flex-col gap-3 transform translate-y-4 transition-transform duration-700 group-hover:translate-y-0 z-20">
              <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-white/70 drop-shadow-md">
                {hero.brand}
              </span>
              <h3 className="font-heading font-light text-5xl text-white leading-tight drop-shadow-xl">
                {hero.name}
              </h3>
              <span className="font-sans text-[11px] tracking-widest uppercase text-white opacity-0 transition-opacity duration-700 group-hover:opacity-100 mt-2 drop-shadow-md">
                Discover Campaign →
              </span>
            </div>
          </div>
        );
      })}

      {/* Progress Line Indicators */}
      <div className="absolute bottom-8 right-12 z-30 flex gap-2">
        {currentDeck.map((_, i) => (
          <div
            key={i}
            className={`h-[2px] transition-all duration-700 ${
              i === currentIndex ? "w-8 bg-white" : "w-4 bg-white/30"
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
        // If a video is blocked by the browser, skip it immediately!
        onEnded();
      });
    } else {
      // Secret sauce: Wait 1 second before pausing the outgoing video
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
      onError={onEnded} // 👈 MASSIVE FAILSAFE: If the Zara video link is broken, it instantly skips to the next one!
      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-1000"
    />
  );
}
