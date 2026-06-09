import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function resolveVideo(product: Product): string {
  if (product.videos?.[0]) return product.videos[0];
  if (product.video) return product.video;
  if (product.videoUrl) return product.videoUrl;
  if (product.media?.length) {
    const hit = (product.media as any[]).find(
      (m) => m.type === "video" || m.url?.includes(".mp4"),
    );
    if (hit?.url) return hit.url;
  }
  return "";
}

export default function CampaignHeroSlider({ heroes }: { heroes: Product[] }) {
  const navigate = useNavigate();
  const [currentDeck, setCurrentDeck] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  // Track whether user manually navigated (pauses auto-advance briefly)
  const userNavigatedRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heroIds = heroes
    .map((h) => h.id)
    .sort()
    .join(",");

  useEffect(() => {
    const hasTouch = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    ).matches;
    setIsTouchDevice(hasTouch);
  }, []);

  useEffect(() => {
    if (heroes.length > 0) {
      setCurrentDeck(shuffleArray([...heroes]));
      setCurrentIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroIds]);

  const goTo = useCallback(
    (index: number, isUserAction = false) => {
      if (isUserAction) {
        userNavigatedRef.current = true;
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        // Resume auto-advance after 6s of user inactivity
        pauseTimerRef.current = setTimeout(() => {
          userNavigatedRef.current = false;
        }, 6000);
      }

      setCurrentIndex((prev) => {
        let next = index;
        if (next < 0) {
          next = currentDeck.length - 1;
        } else if (next >= currentDeck.length) {
          setCurrentDeck((d) => shuffleArray([...d]));
          next = 0;
        }
        return next;
      });
    },
    [currentDeck.length],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      goTo(currentIndex - 1, true);
    },
    [currentIndex, goTo],
  );

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      goTo(currentIndex + 1, true);
    },
    [currentIndex, goTo],
  );

  // Touch device: auto-advance
  useEffect(() => {
    if (!isTouchDevice || currentDeck.length === 0) return;
    const timer = setInterval(() => {
      if (userNavigatedRef.current) return;
      setCurrentIndex((prev) => {
        if (prev >= currentDeck.length - 1) {
          setCurrentDeck((d) => shuffleArray([...d]));
          return 0;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isTouchDevice, currentDeck.length]);

  const handleVideoEnd = useCallback(() => {
    if (userNavigatedRef.current) return;
    setCurrentIndex((prev) => {
      if (prev >= currentDeck.length - 1) {
        setCurrentDeck((d) => shuffleArray([...d]));
        return 0;
      }
      return prev + 1;
    });
  }, [currentDeck.length]);

  const handleProductClick = (heroId: string) => {
    navigate(`/product/${encodeURIComponent(heroId)}`);
  };

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  if (currentDeck.length === 0) return null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black group/slider">
      {/* ── Slides ── */}
      {currentDeck.map((hero, index) => {
        const isActive = index === currentIndex;
        const heroImage = hero.images?.[0] || "";
        const heroVideo = resolveVideo(hero);

        return (
          <div
            key={`${hero.id}-${index}`}
            onClick={() => handleProductClick(hero.id)}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer ${
              isActive
                ? "opacity-100 z-10"
                : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {isTouchDevice ? (
              <img
                src={heroImage}
                alt={hero.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <HeroVideo
                src={heroVideo}
                poster={heroImage}
                isActive={isActive}
                onEnded={handleVideoEnd}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col gap-2 z-20 pointer-events-none">
              <span className="font-sans text-[8px] md:text-[10px] tracking-[0.3em] uppercase text-white/70">
                {hero.brand}
              </span>
              <h3 className="font-heading font-light text-2xl md:text-5xl text-white leading-tight pr-16 md:pr-24">
                {hero.name}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-sans text-[9px] tracking-widest uppercase text-white/80">
                  Discover →
                </span>
                {!isTouchDevice && heroVideo && (
                  <span className="font-sans text-[8px] tracking-widest uppercase text-white/40 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    Video
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Prev / Next arrows ── */}
      {currentDeck.length > 1 && (
        <>
          {/* Prev */}
          <button
            onClick={goPrev}
            aria-label="Previous"
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/20 text-white transition-all duration-200 opacity-0 group-hover/slider:opacity-100 hover:scale-105"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Next */}
          <button
            onClick={goNext}
            aria-label="Next"
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/20 text-white transition-all duration-200 opacity-0 group-hover/slider:opacity-100 hover:scale-105"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* ── Progress dots + counter ── */}
      <div className="absolute bottom-5 right-5 z-30 flex items-center gap-3">
        {/* Slide counter */}
        <span className="font-sans text-[8px] tracking-[0.16em] text-white/40 tabular-nums">
          {currentIndex + 1}/{currentDeck.length}
        </span>

        {/* Dots */}
        <div className="flex gap-1.5">
          {currentDeck.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i, true);
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-[2px] transition-all duration-500 ${
                i === currentIndex
                  ? "w-6 bg-white"
                  : "w-2.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HeroVideo ────────────────────────────────────────────────────────────────
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
        setVideoFailed(true);
        setTimeout(onEnded, 4000);
      });
    } else {
      const t = setTimeout(() => videoRef.current?.pause(), 1000);
      return () => clearTimeout(t);
    }
  }, [isActive, onEnded]);

  if (videoFailed || !src) {
    return (
      <img
        src={poster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
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
      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover/slider:opacity-100 transition-opacity duration-1000"
    />
  );
}
