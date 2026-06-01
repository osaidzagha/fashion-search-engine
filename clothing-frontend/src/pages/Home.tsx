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

interface ScrollCarouselProps {
  products: Product[];
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

function ScrollCarousel({ products, onLoadMore, hasMore, loadingMore }: ScrollCarouselProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Refs mirror props so the IntersectionObserver callback always has a
  // fresh value without needing to re-create the observer on every render.
  const hasMoreRef = useRef(hasMore);
  const fetchingRef = useRef(loadingMore);
  // onLoadMoreRef ensures the observer never holds a stale closure of the
  // load function even though the effect only runs once ([] deps).
  const onLoadMoreRef = useRef(onLoadMore);
  hasMoreRef.current = hasMore;
  fetchingRef.current = loadingMore;
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !fetchingRef.current) {
          onLoadMoreRef.current();
        }
      },
      // Trigger when the sentinel is within 300px of the right edge of its
      // scroll container. rootMargin uses "0px 300px 0px 0px" (top right bottom left).
      { root: sentinel.parentElement, rootMargin: "0px 300px 0px 0px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
    // All dynamic values are accessed via refs — no deps needed.
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
            <div key={`loader-${i}`} className={`${CARD_WRAPPER} mr-3 md:mr-5 flex-shrink-0`}>
              <ProductSkeleton isCardMode={false} />
            </div>
          ))}
        </div>
      )}
      {/* Zero-height sentinel — IntersectionObserver fires when this enters view */}
      <div ref={sentinelRef} className="w-0 h-0 flex-shrink-0" aria-hidden="true" />
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className={`${CARD_WRAPPER} mr-3 md:mr-5 flex-shrink-0`}>
          <ProductSkeleton isCardMode={false} />
        </div>
      ))}
    </div>
  );
}

// ─── Consistent "See all" button ──────────────────────────────────────────────
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

// ─── Section wrapper ──────────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const [featured, setFeatured] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  // Paginated states
  const [editorChoiceProducts, setEditorChoiceProducts] = useState<Product[]>([]);
  const [editorChoicePage, setEditorChoicePage] = useState(1);
  const [editorChoiceHasMore, setEditorChoiceHasMore] = useState(true);
  const [editorChoiceLoading, setEditorChoiceLoading] = useState(false);

  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [salePage, setSalePage] = useState(1);
  const [saleHasMore, setSaleHasMore] = useState(true);
  const [saleLoading, setSaleLoading] = useState(false);

  const [newInProducts, setNewInProducts] = useState<Product[]>([]);
  const [newInPage, setNewInPage] = useState(1);
  const [newInHasMore, setNewInHasMore] = useState(true);
  const [newInLoading, setNewInLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectDepartments?.length) {
          queryParams.set("departments", selectDepartments.join(","));
        }
        const [featuredRes, trendingRes] = await Promise.all([
          fetch(`${BASE_URL}/api/products/featured?${queryParams.toString()}`),
          fetch(`${BASE_URL}/api/products/trending?${queryParams.toString()}`),
        ]);
        const data = await featuredRes.json();
        const trendingData = await trendingRes.json();
        if (!cancelled) {
          setFeatured(data);

          // Populate page 1 products
          const videoProds = (data.withVideo || []).filter(isClothing);
          const fallbackProds = (data.newIn || []).filter((p: Product) => !p.originalPrice).slice(0, 6);
          const initialEditorChoice = videoProds.length > 0 ? videoProds : fallbackProds;
          setEditorChoiceProducts(initialEditorChoice);
          setEditorChoicePage(1);
          setEditorChoiceHasMore(videoProds.length >= 20);

          setTrendingProducts(trendingData);
          setTrendingPage(1);
          setTrendingHasMore(trendingData.length >= 12);

          setSaleProducts(data.onSale || []);
          setSalePage(1);
          setSaleHasMore((data.onSale || []).length >= 12);

          const newInAll = data.newIn || [];
          setNewInProducts(newInAll);
          setNewInPage(1);
          setNewInHasMore(newInAll.length >= 15);
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
      const res = await fetch(`${BASE_URL}/api/products?${queryParams.toString()}`);
      const data = await res.json();
      const newProducts = (data.products || []).filter(isClothing);
      setEditorChoiceProducts((prev) => [...prev, ...newProducts]);
      setEditorChoicePage(nextPage);
      setEditorChoiceHasMore(newProducts.length >= 20 && nextPage < (data.totalPages || 0));
    } catch (err) {
      console.error("Failed to load more editor choice products", err);
    } finally {
      setEditorChoiceLoading(false);
    }
  }, [editorChoiceLoading, editorChoiceHasMore, editorChoicePage, selectDepartments]);

  const loadMoreTrending = useCallback(async () => {
    if (trendingLoading || !trendingHasMore) return;
    setTrendingLoading(true);
    try {
      const nextPage = trendingPage + 1;
      const queryParams = new URLSearchParams({
        sort: "trending",
        page: nextPage.toString(),
        limit: "12",
      });
      if (selectDepartments?.length) {
        queryParams.set("departments", selectDepartments.join(","));
      }
      const res = await fetch(`${BASE_URL}/api/products?${queryParams.toString()}`);
      const data = await res.json();
      setTrendingProducts((prev) => [...prev, ...(data.products || [])]);
      setTrendingPage(nextPage);
      setTrendingHasMore((data.products || []).length >= 12 && nextPage < (data.totalPages || 0));
    } catch (err) {
      console.error("Failed to load more trending products", err);
    } finally {
      setTrendingLoading(false);
    }
  }, [trendingLoading, trendingHasMore, trendingPage, selectDepartments]);

  const loadMoreSale = useCallback(async () => {
    if (saleLoading || !saleHasMore) return;
    setSaleLoading(true);
    try {
      const nextPage = salePage + 1;
      const queryParams = new URLSearchParams({
        onSale: "true",
        sort: "discount",
        page: nextPage.toString(),
        limit: "12",
      });
      if (selectDepartments?.length) {
        queryParams.set("departments", selectDepartments.join(","));
      }
      const res = await fetch(`${BASE_URL}/api/products?${queryParams.toString()}`);
      const data = await res.json();
      setSaleProducts((prev) => [...prev, ...(data.products || [])]);
      setSalePage(nextPage);
      setSaleHasMore((data.products || []).length >= 12 && nextPage < (data.totalPages || 0));
    } catch (err) {
      console.error("Failed to load more sale products", err);
    } finally {
      setSaleLoading(false);
    }
  }, [saleLoading, saleHasMore, salePage, selectDepartments]);

  const loadMoreNewIn = useCallback(async () => {
    if (newInLoading || !newInHasMore) return;
    setNewInLoading(true);
    try {
      const nextPage = newInPage + 1;
      const queryParams = new URLSearchParams({
        sort: "newest",
        page: nextPage.toString(),
        limit: "15",
      });
      if (selectDepartments?.length) {
        queryParams.set("departments", selectDepartments.join(","));
      }
      const res = await fetch(`${BASE_URL}/api/products?${queryParams.toString()}`);
      const data = await res.json();
      setNewInProducts((prev) => [...prev, ...(data.products || [])]);
      setNewInPage(nextPage);
      setNewInHasMore((data.products || []).length >= 15 && nextPage < (data.totalPages || 0));
    } catch (err) {
      console.error("Failed to load more new in products", err);
    } finally {
      setNewInLoading(false);
    }
  }, [newInLoading, newInHasMore, newInPage, selectDepartments]);

  // useMemo so the random shuffle only runs when `featured` changes, not on every render
  const mosaicProducts = useMemo(() => (featured ? getMosaicImages(featured) : []), [featured]);
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
              Compare prices across every brand. Track drops. Find the best time
              to buy.
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

        {/* ══ EDITOR'S CHOICE ═══════════════════════════════════════════════ */}
        <Section
          title="Editor's Choice"
          subtitle={
            !loading && editorChoiceProducts.length > 0
              ? "Hover to play"
              : "Curated picks"
          }
          loading={loading}
          className="border-t border-borderLight dark:border-borderLight-dark"
          action={
            !loading && editorChoiceProducts.length > 0 ? (
              <SeeAllButton
                onClick={() => {
                  dispatch(clearFilters());
                  navigate("/collection/new-in");
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

        {/* ══ PRICE TRACKER ═════════════════════════════════════════════════ */}
        {(loading || trendingProducts.length > 0) && (
          <Section
            title="On the move"
            subtitle="Recent price changes"
            accentLabel="Live Tracking"
            accentColor="text-accentRed"
            loading={loading}
            action={
              !loading && trendingProducts.length > 0 ? (
                <SeeAllButton
                  onClick={() => {
                    dispatch(clearFilters());
                    navigate("/collection?mode=trending");
                  }}
                />
              ) : undefined
            }
          >
            <ScrollCarousel
              products={trendingProducts}
              onLoadMore={loadMoreTrending}
              hasMore={trendingHasMore}
              loadingMore={trendingLoading}
            />
          </Section>
        )}

        {/* ══ SALE ══════════════════════════════════════════════════════════ */}
        <Section
          title="Price drops, right now."
          accentLabel="Limited Time"
          accentColor="text-accentRed"
          loading={loading}
          action={
            !loading && saleProducts.length > 0 ? (
              <SeeAllButton onClick={() => navigate("/collection/sale")} />
            ) : undefined
          }
        >
          <ScrollCarousel
            products={saleProducts}
            onLoadMore={loadMoreSale}
            hasMore={saleHasMore}
            loadingMore={saleLoading}
          />
        </Section>

        {/* ══ NEW IN ════════════════════════════════════════════════════════ */}
        <Section
          title="New in"
          subtitle="Latest arrivals"
          loading={loading}
          action={
            !loading && newInProducts.length > 0 ? (
              <SeeAllButton
                onClick={() => navigate("/collection?mode=new-in")}
              />
            ) : undefined
          }
        >
          <ScrollCarousel
            products={newInProducts}
            onLoadMore={loadMoreNewIn}
            hasMore={newInHasMore}
            loadingMore={newInLoading}
          />
        </Section>

        {/* ══ BRAND SPLIT ═══════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 sm:grid-cols-3 border-t border-borderLight dark:border-borderLight-dark">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`px-6 md:px-12 lg:px-16 py-8 lg:py-12 ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-borderLight dark:border-borderLight-dark" : ""}`}
                >
                  <div className="h-2 w-10 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded mb-3" />
                  <div className="h-8 w-32 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div
                onClick={() => {
                  dispatch(clearFilters());
                  dispatch(setSearchTerm(""));
                  navigate("/collection/zara");
                }}
                className="flex items-center justify-between px-6 md:px-12 lg:px-16 py-8 lg:py-12 border-b sm:border-b-0 sm:border-r border-borderLight dark:border-borderLight-dark cursor-pointer transition-colors duration-300 hover:bg-bgHover dark:hover:bg-bgHover-dark"
              >
                <div>
                  <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2">
                    Brand
                  </p>
                  <h3 className="font-heading font-light text-3xl lg:text-4xl tracking-wider text-textPrimary dark:text-textPrimary-dark">
                    Zara
                  </h3>
                </div>
                <span className="text-textMuted dark:text-textMuted-dark">
                  →
                </span>
              </div>
              <div
                onClick={() => {
                  dispatch(clearFilters());
                  dispatch(setSearchTerm(""));
                  navigate("/collection/mango");
                }}
                className="flex items-center justify-between px-6 md:px-12 lg:px-16 py-8 lg:py-12 border-b sm:border-b-0 sm:border-r border-borderLight dark:border-borderLight-dark cursor-pointer transition-colors duration-300 hover:bg-bgHover dark:hover:bg-bgHover-dark"
              >
                <div>
                  <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2">
                    Brand
                  </p>
                  <h3 className="font-heading font-light text-3xl lg:text-4xl tracking-wider text-textPrimary dark:text-textPrimary-dark">
                    Mango
                  </h3>
                </div>
                <span className="text-textMuted dark:text-textMuted-dark">
                  →
                </span>
              </div>
              <div
                onClick={() => {
                  dispatch(clearFilters());
                  dispatch(setSearchTerm(""));
                  navigate("/collection/massimo-dutti");
                }}
                className="flex items-center justify-between px-6 md:px-12 lg:px-16 py-8 lg:py-12 cursor-pointer transition-colors duration-300 hover:bg-bgHover dark:hover:bg-bgHover-dark"
              >
                <div>
                  <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2">
                    Brand
                  </p>
                  <h3 className="font-heading font-light text-3xl lg:text-4xl tracking-tight text-textPrimary dark:text-textPrimary-dark">
                    Massimo Dutti
                  </h3>
                </div>
                <span className="text-textMuted dark:text-textMuted-dark">
                  →
                </span>
              </div>
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
