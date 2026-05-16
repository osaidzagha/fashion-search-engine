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

// ✅ Resolves video from ALL brand field shapes:
// Zara uses: video, videoUrl
// Massimo uses: media[].url (type=video)
// Mango uses: videos[]
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

  // ✅ Don't use window.innerWidth for mobile detection —
  // use pointer/hover media query which is more reliable across Android/iOS
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const heroIds = heroes
    .map((h) => h.id)
    .sort()
    .join(",");

  useEffect(() => {
    // Touch detection — works on Android Chrome, iOS Safari, tablets
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

  // Touch device: auto-advance with timer (video won't autoplay reliably)
  useEffect(() => {
    if (!isTouchDevice || currentDeck.length === 0) return;
    const timer = setInterval(() => {
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

  if (currentDeck.length === 0) return null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black group">
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
              // Touch devices: image slideshow (video autoplay blocked)
              <img
                src={heroImage}
                alt={hero.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              // Desktop: video with image poster fallback
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
              <h3 className="font-heading font-light text-2xl md:text-5xl text-white leading-tight pr-10 md:pr-16">
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

      {/* Progress dots */}
      <div className="absolute bottom-5 right-5 z-30 flex gap-2">
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
      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-1000"
    />
  );
}
