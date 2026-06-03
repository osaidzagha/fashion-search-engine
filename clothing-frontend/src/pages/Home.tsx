import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { Product } from "../types";
import { SearchBar } from "../components/SearchBar";
import CampaignHeroSlider from "../components/CampaignHeroSlider";
import ProductCard from "../components/ProductCard";
import ProductMosaic from "../components/ProductMosaic";
import { ProductSkeleton } from "../components/ProductSkeleton";
import { setSearchTerm, clearFilters } from "../store/productSlice";
import PageTransition from "../components/PageTransition";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface FeaturedData {
  onSale: Product[];
  newIn: Product[];
  withVideo: Product[];
  campaignHeroes: Product[];
  categoryTiles: {
    jackets: Product | null;
    shirts: Product | null;
    trousers: Product | null;
    knitwear: Product | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcDiscount(p: Product): number {
  if (!p.originalPrice || p.originalPrice <= p.price) return 0;
  return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
}

function getMosaicImages(featured: FeaturedData): Product[] {
  if (!featured?.newIn) return [];
  return [...featured.newIn]
    .filter((p) => p.images?.[0])
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);
}

const NON_CLOTHING_RE =
  /hair|perfume|fragrance|cologne|accessori|belt|wallet|watch|jewel/i;

function isClothing(p: Product): boolean {
  const text = `${p.name || ""} ${(p as any).category || ""} ${(p as any).subcategory || ""}`;
  return !NON_CLOTHING_RE.test(text);
}

const CARD_WRAPPER =
  "min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px] md:min-w-[240px] md:max-w-[240px] lg:min-w-[260px] lg:max-w-[260px] flex-shrink-0";

const SKELETON_COUNT = 6;

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES: {
  label: string;
  key: keyof FeaturedData["categoryTiles"];
  search: string;
}[] = [
  { label: "Jackets", key: "jackets", search: "jacket" },
  { label: "Shirts", key: "shirts", search: "shirt" },
  { label: "Trousers", key: "trousers", search: "trouser" },
  { label: "Knitwear", key: "knitwear", search: "knitwear" },
];

// ─── Feature strip content ────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "↓",
    title: "Track price drops",
    desc: "Prices monitored daily across Zara, Mango & Massimo Dutti",
  },
  {
    icon: "⇄",
    title: "Compare side-by-side",
    desc: "Hit + on any product card to compare styles and prices at a glance",
  },
  {
    icon: "◎",
    title: "Get notified",
    desc: "Set a target price and we'll alert you the moment it's reached",
  },
];

// ─── ScrollCarousel ───────────────────────────────────────────────────────────
interface ScrollCarouselProps {
  products: Product[];
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

function ScrollCarousel({
  products,
  onLoadMore,
  hasMore,
  loadingMore,
}: ScrollCarouselProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMoreRef = useRef(hasMore);
  const fetchingRef = useRef(loadingMore);
  const onLoadMoreRef = useRef(onLoadMore);
  hasMoreRef.current = hasMore;
  fetchingRef.current = loadingMore;
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !fetchingRef.current
        ) {
          onLoadMoreRef.current();
        }
      },
      {
        root: sentinel.parentElement,
        rootMargin: "0px 300px 0px 0px",
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 scroll-smooth scrollbar-hide snap-x snap-mandatory">
      {products.map((p, i) => (
        <div
          key={`${p.id}-${i}`}
          className={`${CARD_WRAPPER} mr-3 md:mr-5 flex-shrink-0 snap-start`}
        >
          <ProductCard product={p} />
        </div>
      ))}
      {loadingMore && (
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`loader-${i}`}
              className={`${CARD_WRAPPER} mr-3 md:mr-5 flex-shrink-0`}
            >
              <ProductSkeleton isCardMode={false} />
            </div>
          ))}
        </div>
      )}
      <div
        ref={sentinelRef}
        className="w-0 h-0 flex-shrink-0"
        aria-hidden="true"
      />
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className={`${CARD_WRAPPER} mr-3 md:mr-5 flex-shrink-0`}>
          <ProductSkeleton isCardMode={false} />
        </div>
      ))}
    </div>
  );
}

function SeeAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-sans text-[9px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer opacity-70 hover:opacity-40 transition-opacity"
    >
      See all →
    </button>
  );
}

// ─── Feature Strip ────────────────────────────────────────────────────────────
function FeatureStrip() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-b border-borderLight dark:border-borderLight-dark">
      {FEATURES.map((f, i) => (
        <div
          key={f.title}
          className={`px-6 md:px-12 lg:px-16 py-7 flex gap-5 items-start ${
            i < 2
              ? "border-b md:border-b-0 md:border-r border-borderLight dark:border-borderLight-dark"
              : ""
          }`}
        >
          <span className="font-heading text-xl text-textMuted dark:text-textMuted-dark mt-0.5 flex-shrink-0 w-5 text-center">
            {f.icon}
          </span>
          <div>
            <p className="font-sans text-[10px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark mb-1.5">
              {f.title}
            </p>
            <p className="font-sans text-[11px] leading-relaxed text-textMuted dark:text-textMuted-dark max-w-[240px]">
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper (Editor's Choice only) ───────────────────────────────────
function Section({
  title,
  subtitle,
  action,
  loading,
  children,
  accentLabel,
  accentColor,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  loading: boolean;
  children: React.ReactNode;
  accentLabel?: string;
  accentColor?: string;
  className?: string;
}) {
  return (
    <section
      className={`px-4 md:px-8 lg:px-16 py-10 lg:py-16 border-b border-borderLight dark:border-borderLight-dark ${className}`}
    >
      <div className="flex justify-between items-baseline mb-6 border-b border-borderLight dark:border-borderLight-dark pb-4">
        <div className="flex flex-col gap-1">
          {accentLabel && (
            <p
              className={`font-sans text-[9px] tracking-editorial uppercase ${accentColor || "text-textMuted dark:text-textMuted-dark"}`}
            >
              {accentLabel}
            </p>
          )}
          <div className="flex items-baseline gap-2 lg:gap-4">
            <h2 className="font-heading font-light text-xl lg:text-[28px] text-textPrimary dark:text-textPrimary-dark">
              {title}
            </h2>
            {subtitle && (
              <span className="hidden sm:inline font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {action}
      </div>
      {loading ? <CarouselSkeleton /> : children}
    </section>
  );
}

// ─── The Drop ─────────────────────────────────────────────────────────────────
// Editorial section replacing the two price-change carousels.
// Left: one large hero card with full image + price overlay.
// Right: 3 stacked horizontal mini cards.
function TheDropSection({
  products,
  loading,
  onSeeAll,
}: {
  products: Product[];
  loading: boolean;
  onSeeAll: () => void;
}) {
  const navigate = useNavigate();
  const [hero, ...rest] = products;
  const sideItems = rest.slice(0, 3);

  if (loading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-10 lg:py-16 border-b border-borderLight dark:border-borderLight-dark">
        <div className="flex justify-between items-baseline mb-6 border-b border-borderLight dark:border-borderLight-dark pb-4">
          <div className="space-y-2">
            <div className="h-2 w-16 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
            <div className="h-7 w-32 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-3 md:gap-4">
          <div className="min-h-[380px] lg:min-h-[520px] bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe" />
          <div className="flex flex-col border border-borderLight dark:border-borderLight-dark">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex gap-4 p-4 flex-1 items-center ${i < 2 ? "border-b border-borderLight dark:border-borderLight-dark" : ""}`}
              >
                <div className="w-20 h-20 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-12 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
                  <div className="h-3 w-36 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
                  <div className="h-2 w-20 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="px-4 md:px-8 lg:px-16 py-10 lg:py-16 border-b border-borderLight dark:border-borderLight-dark">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-6 border-b border-borderLight dark:border-borderLight-dark pb-4">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-[9px] tracking-editorial uppercase text-accentRed">
            Limited time
          </p>
          <h2 className="font-heading font-light text-xl lg:text-[28px] text-textPrimary dark:text-textPrimary-dark">
            The Drop
          </h2>
        </div>
        <SeeAllButton onClick={onSeeAll} />
      </div>

      {/* Grid: 60% hero | 40% stack */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-3 md:gap-4">
        {/* Hero card */}
        {hero && (() => {
          const heroDiscount = calcDiscount(hero);
          return (
            <div
              onClick={() => navigate(`/product/${hero.id}`)}
              className="relative cursor-pointer overflow-hidden group min-h-[380px] lg:min-h-[520px] bg-bgSecondary dark:bg-bgSecondary-dark"
            >
              {hero.images?.[0] && (
                <img
                  src={hero.images[0]}
                  alt={hero.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              {/* Discount badge */}
              {heroDiscount > 0 && (
                <div className="absolute top-4 left-4 bg-accentRed text-white font-sans text-[11px] tracking-widest uppercase px-3 py-1.5">
                  −{heroDiscount}%
                </div>
              )}

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <p className="font-sans text-[9px] tracking-editorial uppercase text-white/50 mb-1">
                  {hero.brand}
                </p>
                <h3 className="font-heading font-light text-[clamp(20px,3vw,32px)] leading-tight text-white mb-3 max-w-xs">
                  {hero.name}
                </h3>
                <div className="flex items-baseline gap-3">
                  <span className="font-heading text-xl text-white">
                    {hero.price.toLocaleString("tr-TR")} {hero.currency}
                  </span>
                  {hero.originalPrice && (
                    <span className="font-heading text-base text-white/40 line-through">
                      {hero.originalPrice.toLocaleString("tr-TR")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Stacked mini cards — only render when we have side items */}
        {sideItems.length > 0 && (
          <div className="flex flex-col border border-borderLight dark:border-borderLight-dark">
            {sideItems.map((product, i) => {
              const disc = calcDiscount(product);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className={`flex gap-4 p-4 lg:p-5 cursor-pointer hover:bg-bgHover dark:hover:bg-bgHover-dark transition-colors duration-200 flex-1 items-center ${
                    i < sideItems.length - 1
                      ? "border-b border-borderLight dark:border-borderLight-dark"
                      : ""
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0 overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-1">
                      {product.brand}
                    </p>
                    <p className="font-sans text-[12px] text-textPrimary dark:text-textPrimary-dark leading-snug mb-2 line-clamp-2">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-sans text-[12px] font-medium text-textPrimary dark:text-textPrimary-dark">
                        {product.price.toLocaleString("tr-TR")} {product.currency}
                      </span>
                      {product.originalPrice && (
                        <span className="font-sans text-[10px] text-textMuted dark:text-textMuted-dark line-through">
                          {product.originalPrice.toLocaleString("tr-TR")}
                        </span>
                      )}
                      {disc > 0 && (
                        <span className="font-sans text-[9px] tracking-widest uppercase text-accentRed">
                          −{disc}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Category Grid ────────────────────────────────────────────────────────────
function CategoryGrid({
  tiles,
  loading,
  onNavigate,
}: {
  tiles: FeaturedData["categoryTiles"] | null;
  loading: boolean;
  onNavigate: (search: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="aspect-[3/4] bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {CATEGORIES.map((cat) => {
        const product = tiles?.[cat.key];
        const imgSrc = product?.images?.[0];
        return (
          <div
            key={cat.key}
            onClick={() => onNavigate(cat.search)}
            className="relative aspect-[3/4] overflow-hidden cursor-pointer group bg-bgSecondary dark:bg-bgSecondary-dark"
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt={cat.label}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              />
            )}
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
              <p className="font-sans text-[9px] tracking-editorial uppercase text-white/40 mb-0.5">
                Browse
              </p>
              <h3 className="font-heading font-light text-xl md:text-2xl text-white">
                {cat.label}
              </h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const [featured, setFeatured] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor's Choice is the only paginated carousel now
  const [editorChoiceProducts, setEditorChoiceProducts] = useState<Product[]>(
    [],
  );
  const [editorChoicePage, setEditorChoicePage] = useState(1);
  // Start false — set to true only after we know there are more pages
  const [editorChoiceHasMore, setEditorChoiceHasMore] = useState(false);
  const [editorChoiceLoading, setEditorChoiceLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectDepartments?.length) {
          queryParams.set("departments", selectDepartments.join(","));
        }
        const res = await fetch(
          `${BASE_URL}/api/products/featured?${queryParams.toString()}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setFeatured(data);
          const videoProds = (data.withVideo || []).filter(isClothing);
          const fallbackProds = (data.newIn || [])
            .filter((p: Product) => !p.originalPrice)
            .slice(0, 6);
          const initialEditorChoice =
            videoProds.length > 0 ? videoProds : fallbackProds;
          setEditorChoiceProducts(initialEditorChoice);
          setEditorChoicePage(1);
          setEditorChoiceHasMore(videoProds.length >= 20);
        }
      } catch (err) {
        console.error("Failed to load featured products", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [selectDepartments]);

  const loadMoreEditorChoice = useCallback(async () => {
    if (editorChoiceLoading || !editorChoiceHasMore) return;
    setEditorChoiceLoading(true);
    try {
      const nextPage = editorChoicePage + 1;
      const queryParams = new URLSearchParams({
        hasVideo: "true",
        page: nextPage.toString(),
        limit: "20",
      });
      if (selectDepartments?.length) {
        queryParams.set("departments", selectDepartments.join(","));
      }
      const res = await fetch(
        `${BASE_URL}/api/products?${queryParams.toString()}`,
      );
      const data = await res.json();
      const newProducts = (data.products || []).filter(isClothing);
      setEditorChoiceProducts((prev) => [...prev, ...newProducts]);
      setEditorChoicePage(nextPage);
      setEditorChoiceHasMore(
        newProducts.length >= 20 && nextPage < (data.totalPages || 0),
      );
    } catch (err) {
      console.error("Failed to load more editor choice", err);
    } finally {
      setEditorChoiceLoading(false);
    }
  }, [
    editorChoiceLoading,
    editorChoiceHasMore,
    editorChoicePage,
    selectDepartments,
  ]);

  // Top 4 drops by discount — drives "The Drop" editorial section
  const topDrops = useMemo(() => {
    if (!featured?.onSale) return [];
    return [...featured.onSale]
      .filter((p) => p.originalPrice && p.originalPrice > p.price)
      .sort((a, b) => calcDiscount(b) - calcDiscount(a))
      .slice(0, 4);
  }, [featured]);

  const mosaicProducts = useMemo(
    () => (featured ? getMosaicImages(featured) : []),
    [featured],
  );
  const hasCampaign =
    featured?.campaignHeroes && featured.campaignHeroes.length > 0;
  const hasMosaic = mosaicProducts.length >= 4;

  const deptLabel =
    selectDepartments?.[0] === "Men" || selectDepartments?.[0] === "MAN"
      ? "Men's Collection"
      : selectDepartments?.[0] === "Women" || selectDepartments?.[0] === "WOMAN"
        ? "Women's Collection"
        : "Zara · Massimo Dutti · Mango";

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark overflow-x-hidden">
        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <section className="flex flex-col lg:grid lg:grid-cols-[40%_60%] lg:min-h-[calc(100vh-57px)]">
          <div className="relative flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-10 pb-8 lg:py-16 bg-bgPrimary dark:bg-bgPrimary-dark z-10 lg:shadow-[20px_0_30px_rgba(0,0,0,0.5)]">
            <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-4 lg:mb-8 animate-slide-up [animation-delay:100ms] [animation-fill-mode:both]">
              {deptLabel}
            </p>
            <h1 className="font-heading font-light text-[clamp(42px,12vw,80px)] leading-none tracking-tight text-textPrimary dark:text-textPrimary-dark mb-3 lg:mb-6 animate-slide-up [animation-delay:200ms] [animation-fill-mode:both]">
              Fashion,
              <br />
              <em className="italic text-textSecondary dark:text-textSecondary-dark">
                tracked.
              </em>
            </h1>
            <p className="font-sans text-[12px] leading-relaxed text-textTertiary dark:text-textTertiary-dark mb-6 lg:mb-11 max-w-xs animate-slide-up [animation-delay:300ms] [animation-fill-mode:both]">
              Price drops tracked daily. Compare looks side-by-side.
              Get notified the moment your target price hits.
            </p>
            <div className="relative z-20 animate-slide-up [animation-delay:400ms] [animation-fill-mode:both] w-full">
              <SearchBar variant="hero" />
            </div>
          </div>

          <div className="relative w-full h-[55vw] min-h-[260px] max-h-[420px] lg:max-h-none lg:h-auto lg:min-h-full bg-black overflow-hidden">
            {loading ? (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse">
                <div className="absolute bottom-6 left-6 space-y-3">
                  <div className="h-2 w-12 bg-white/10 rounded" />
                  <div className="h-7 w-52 bg-white/10 rounded" />
                  <div className="h-2 w-20 bg-white/10 rounded" />
                </div>
              </div>
            ) : hasCampaign ? (
              <CampaignHeroSlider heroes={featured!.campaignHeroes} />
            ) : hasMosaic ? (
              <ProductMosaic products={mosaicProducts} />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                <p className="font-heading italic text-lg text-white/30">
                  No products yet
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ══ FEATURE STRIP — surfaces Track · Compare · Notify ═════════════ */}
        <FeatureStrip />

        {/* ══ EDITOR'S CHOICE ═══════════════════════════════════════════════ */}
        <Section
          title="Editor's Choice"
          subtitle={
            !loading && editorChoiceProducts.length > 0
              ? "Hover to play"
              : "Curated picks"
          }
          loading={loading}
          action={
            !loading && editorChoiceProducts.length > 0 ? (
              <SeeAllButton
                onClick={() => {
                  dispatch(clearFilters());
                  const params = new URLSearchParams({ hasVideo: "true" });
                  if (selectDepartments?.length)
                    params.set("departments", selectDepartments.join(","));
                  navigate(`/collection?${params.toString()}`);
                }}
              />
            ) : undefined
          }
        >
          <ScrollCarousel
            products={editorChoiceProducts}
            onLoadMore={loadMoreEditorChoice}
            hasMore={editorChoiceHasMore}
            loadingMore={editorChoiceLoading}
          />
        </Section>

        {/* ══ THE DROP — editorial top-4 biggest discounts ═════════════════ */}
        <TheDropSection
          products={topDrops}
          loading={loading}
          onSeeAll={() => navigate("/collection/sale")}
        />

        {/* ══ BROWSE BY CATEGORY ════════════════════════════════════════════ */}
        <section className="px-4 md:px-8 lg:px-16 py-10 lg:py-16 border-b border-borderLight dark:border-borderLight-dark">
          <div className="flex justify-between items-baseline mb-6 border-b border-borderLight dark:border-borderLight-dark pb-4">
            <h2 className="font-heading font-light text-xl lg:text-[28px] text-textPrimary dark:text-textPrimary-dark">
              Browse by category
            </h2>
          </div>
          <CategoryGrid
            tiles={featured?.categoryTiles ?? null}
            loading={loading}
            onNavigate={(search) => {
              dispatch(clearFilters());
              navigate(
                `/collection?search=${encodeURIComponent(search)}&mode=category`,
              );
            }}
          />
        </section>

        {/* ══ BRAND SPLIT ═══════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 sm:grid-cols-3 border-t border-borderLight dark:border-borderLight-dark">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`px-6 md:px-12 lg:px-16 py-8 lg:py-12 ${
                    i < 2
                      ? "border-b sm:border-b-0 sm:border-r border-borderLight dark:border-borderLight-dark"
                      : ""
                  }`}
                >
                  <div className="h-2 w-10 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded mb-3" />
                  <div className="h-8 w-32 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
                </div>
              ))}
            </>
          ) : (
            <>
              {(
                [
                  { label: "Zara", path: "/collection/zara", border: true },
                  { label: "Mango", path: "/collection/mango", border: true },
                  {
                    label: "Massimo Dutti",
                    path: "/collection/massimo-dutti",
                    border: false,
                  },
                ] as const
              ).map(({ label, path, border }) => (
                <div
                  key={label}
                  onClick={() => {
                    dispatch(clearFilters());
                    dispatch(setSearchTerm(""));
                    navigate(path);
                  }}
                  className={`flex items-center justify-between px-6 md:px-12 lg:px-16 py-8 lg:py-12 cursor-pointer transition-colors duration-300 hover:bg-bgHover dark:hover:bg-bgHover-dark ${
                    border
                      ? "border-b sm:border-b-0 sm:border-r border-borderLight dark:border-borderLight-dark"
                      : ""
                  }`}
                >
                  <div>
                    <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2">
                      Brand
                    </p>
                    <h3 className="font-heading font-light text-3xl lg:text-4xl tracking-wider text-textPrimary dark:text-textPrimary-dark">
                      {label}
                    </h3>
                  </div>
                  <span className="text-textMuted dark:text-textMuted-dark">
                    →
                  </span>
                </div>
              ))}
            </>
          )}
        </section>

        {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
        <footer className="px-6 lg:px-16 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-borderLight dark:border-borderLight-dark">
          <span className="font-heading font-light text-[15px] tracking-editorial uppercase text-textSecondary dark:text-textSecondary-dark">
            Dope
          </span>
          <span className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
            Price tracking · Zara · Mango · Massimo Dutti · Turkey
          </span>
        </footer>
      </div>
    </PageTransition>
  );
}
