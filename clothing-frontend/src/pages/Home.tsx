import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { Product } from "../types";
import { SearchBar } from "../components/SearchBar";
import CampaignHeroSlider from "../components/CampaignHeroSlider";
import ProductCard from "../components/ProductCard";
import ProductMosaic from "../components/ProductMosaic";
import { setSearchTerm, clearFilters } from "../store/productSlice";
import PageTransition from "../components/PageTransition";
import CinematicHeroCard from "../components/CinematicHeroCard";

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

// Carousel styles — tighter on mobile
const CAROUSEL =
  "flex gap-3 md:gap-5 lg:gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch]";

const CARD_WRAPPER =
  "min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px] md:min-w-[240px] md:max-w-[240px] lg:min-w-[260px] lg:max-w-[260px] flex-shrink-0 [scroll-snap-align:start]";

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const [featured, setFeatured] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
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
        setFeatured(data);
      } catch (err) {
        console.error("Failed to load featured products", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, [selectDepartments]);

  const mosaicProducts = featured ? getMosaicImages(featured) : [];
  const newInAll = featured?.newIn?.slice(0, 12) || [];
  const videoProducts = (featured?.withVideo || []).filter(isClothing);
  const fallbackProducts = newInAll.filter((p) => !p.originalPrice).slice(0, 4);
  const editorChoiceProducts =
    videoProducts.length > 0 ? videoProducts : fallbackProducts;

  const deptLabel =
    selectDepartments?.[0] === "Men" || selectDepartments?.[0] === "MAN"
      ? "Men's Collection"
      : selectDepartments?.[0] === "Women" || selectDepartments?.[0] === "WOMAN"
        ? "Women's Collection"
        : "Zara · Massimo Dutti";

  const hasCampaign =
    featured?.campaignHeroes && featured.campaignHeroes.length > 0;
  const hasMosaic = mosaicProducts.length >= 4;

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark overflow-x-hidden">
        {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
        {/* Mobile: stacked vertically. Desktop: two-column grid */}
        <section className="flex flex-col lg:grid lg:grid-cols-[40%_60%] lg:min-h-[calc(100vh-57px)] relative">
          {/* LEFT — editorial text + search */}
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

          {/* RIGHT — Campaign hero: fixed height on mobile, full height on desktop */}
          <div className="relative w-full h-[55vw] min-h-[260px] max-h-[420px] lg:max-h-none lg:h-auto lg:min-h-full bg-black overflow-hidden animate-fade-in [animation-delay:300ms] [animation-fill-mode:both]">
            {loading ? (
              /* Skeleton shimmer instead of black void */
              <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse flex items-end p-6">
                <div className="space-y-2">
                  <div className="h-2 w-16 bg-white/10 rounded" />
                  <div className="h-6 w-48 bg-white/10 rounded" />
                </div>
              </div>
            ) : hasCampaign ? (
              <CampaignHeroSlider heroes={featured!.campaignHeroes} />
            ) : hasMosaic ? (
              <ProductMosaic products={mosaicProducts} />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                <p className="font-heading italic text-lg text-white/30">
                  Start scraping to see products here
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ══ EDITOR'S CHOICE ══════════════════════════════════════════════════ */}
        {!loading && editorChoiceProducts.length > 0 && (
          <section className="px-4 md:px-8 lg:px-16 py-10 lg:py-20 border-b border-borderLight dark:border-borderLight-dark">
            <div className="flex justify-between items-baseline mb-6 lg:mb-10 border-b border-borderLight dark:border-borderLight-dark pb-4">
              <div className="flex items-baseline gap-2 lg:gap-4">
                <h2 className="font-heading font-light text-xl lg:text-[28px] text-textPrimary dark:text-textPrimary-dark">
                  Editor's Choice
                </h2>
                <span className="hidden sm:inline font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
                  {videoProducts.length > 0 ? "Hover to play" : "Curated picks"}
                </span>
              </div>
            </div>
            <div className={CAROUSEL}>
              {editorChoiceProducts.map((p) => (
                <div key={p.id} className={CARD_WRAPPER}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ SALE STRIP ═══════════════════════════════════════════════════════ */}
        {!loading && featured?.onSale && featured.onSale.length > 0 && (
          <section className="px-4 md:px-8 lg:px-16 py-8 lg:py-12 border-b border-borderLight dark:border-borderLight-dark">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <div>
                <p className="font-sans text-[9px] tracking-editorial uppercase text-accentRed mb-1">
                  Limited Time
                </p>
                <h2 className="font-heading font-light text-xl lg:text-3xl tracking-wide text-textPrimary dark:text-textPrimary-dark">
                  Price drops, right now.
                </h2>
              </div>
              <button
                onClick={() => navigate("/collection/sale")}
                className="font-sans text-[9px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer opacity-70 hover:opacity-40 transition-opacity"
              >
                View all
              </button>
            </div>
            <div className={CAROUSEL}>
              {featured.onSale.map((p) => (
                <div key={p.id} className={CARD_WRAPPER}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ NEW IN ════════════════════════════════════════════════════════════ */}
        {!loading && newInAll.length > 0 && (
          <section className="px-4 md:px-8 lg:px-16 py-10 lg:py-20">
            <div className="flex justify-between items-baseline mb-6 lg:mb-10 border-b border-borderLight dark:border-borderLight-dark pb-4">
              <div className="flex items-baseline gap-2 lg:gap-4">
                <h2 className="font-heading font-light text-xl lg:text-[28px] text-textPrimary dark:text-textPrimary-dark">
                  New in
                </h2>
                <span className="hidden sm:inline font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
                  Latest arrivals
                </span>
              </div>
              <button
                onClick={() => navigate("/collection/new-in")}
                className="font-sans text-[9px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer hover:opacity-50 transition-opacity"
              >
                See all →
              </button>
            </div>
            <div className={CAROUSEL}>
              {newInAll.map((p) => (
                <div key={p.id} className={CARD_WRAPPER}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ BRAND SPLIT ══════════════════════════════════════════════════════ */}
        {!loading && featured && (
          <section className="grid grid-cols-1 sm:grid-cols-2 border-t border-borderLight dark:border-borderLight-dark">
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
              <span className="text-textMuted dark:text-textMuted-dark">→</span>
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
              <span className="text-textMuted dark:text-textMuted-dark">→</span>
            </div>
          </section>
        )}

        {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
        <footer className="px-6 lg:px-16 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-borderLight dark:border-borderLight-dark text-center sm:text-left">
          <span className="font-heading font-light text-[15px] tracking-editorial uppercase text-textSecondary dark:text-textSecondary-dark">
            Dope
          </span>
          <span className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
            Price tracking · Zara & Massimo Dutti · Turkey
          </span>
        </footer>
      </div>
    </PageTransition>
  );
}
