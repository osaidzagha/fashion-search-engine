import { useState, useEffect, useRef } from "react";
import { Product } from "../types";

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
  const [isMobile, setIsMobile] = useState(false);

  const heroIds = heroes
    ? heroes
        .map((h) => h.id)
        .sort()
        .join(",")
    : "";

  useEffect(() => {
    // Detect mobile/tablet — iOS Safari blocks autoplay even with muted+playsInline
    // so we use image fallback on small screens
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // On mobile: auto-advance with a timer since video won't play
  useEffect(() => {
    if (!isMobile) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= currentDeck.length - 1) {
          setCurrentDeck(shuffleArray([...heroes]));
          return 0;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isMobile, currentDeck.length, heroes]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black cursor-pointer group">
      {currentDeck.map((hero, index) => {
        const isActive = index === currentIndex;
        // Use first image as fallback — always available
        const heroImage = hero.images?.[0] || "";
        const heroVideo = hero.videos?.[0] || "";

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
            {/* ── Mobile: image only (video autoplay blocked on iOS) ── */}
            {isMobile ? (
              <img
                src={heroImage}
                alt={hero.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              /* ── Desktop: video with image as poster/fallback ── */
              <HeroVideo
                src={heroVideo}
                poster={heroImage}
                isActive={isActive}
                onEnded={handleVideoEnd}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col gap-2 z-20">
              <span className="font-sans text-[8px] md:text-[10px] tracking-[0.3em] uppercase text-white/70">
                {hero.brand}
              </span>
              <h3 className="font-heading font-light text-2xl md:text-5xl text-white leading-tight pr-10 md:pr-16">
                {hero.name}
              </h3>
              <span className="font-sans text-[9px] md:text-[11px] tracking-widest uppercase text-white/80 mt-1">
                Discover →
              </span>
            </div>
          </div>
        );
      })}

      {/* Progress indicators */}
      <div className="absolute bottom-6 right-6 z-30 flex gap-2">
        {currentDeck.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(i);
            }}
            className={`h-[2px] transition-all duration-700 ${
              i === currentIndex ? "w-6 bg-white" : "w-3 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function HeroVideo({
  src,
  poster,
  isActive,
  onEnded,
}: {
  src: string;
  poster: string;
  isActive: boolean;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Video failed to play (e.g. no src) — show poster and advance
        setVideoFailed(true);
        setTimeout(onEnded, 4000);
      });
    } else {
      setTimeout(() => videoRef.current?.pause(), 1000);
    }
  }, [isActive, onEnded]);

  // If video failed or no src, show image instead
  if (videoFailed || !src) {
    return (
      <img
        src={poster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      playsInline
      onEnded={onEnded}
      onError={() => {
        setVideoFailed(true);
        setTimeout(onEnded, 4000);
      }}
      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-1000"
    />
  );
}
