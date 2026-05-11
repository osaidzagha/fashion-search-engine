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
// Put this at the top with your other imports
import CinematicHeroCard from "../components/CinematicHeroCard";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeaturedData {
  onSale: Product[];
  newIn: Product[]; // 👈 Changed from { zara: Product[], massimo: Product[] } to a flat array!
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
function getMosaicImages(featured: FeaturedData): Product[] {
  if (!featured?.newIn) return [];
  // Take the flat array, filter for images, shuffle, and grab 6
  return [...featured.newIn]
    .filter((p) => p.images?.[0])
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);
}

// ── Exact regex per spec — allows shoes, bags, hats; blocks hair/fragrance/jewellery ──
const NON_CLOTHING_RE =
  /hair|perfume|fragrance|cologne|accessori|belt|wallet|watch|jewel/i;

function isClothing(p: Product): boolean {
  const text = `${p.name || ""} ${(p as any).category || ""} ${(p as any).subcategory || ""}`;
  return !NON_CLOTHING_RE.test(text);
}

// ─── Shared carousel classes ──────────────────────────────────────────────────
const CAROUSEL =
  "flex gap-6 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch]";

const CARD_WRAPPER =
  "min-w-[260px] max-w-[260px] flex-shrink-0 [scroll-snap-align:start]";

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  // ── Derived data ──────────────────────────────────────────────────────────

  const mosaicProducts = featured ? getMosaicImages(featured) : [];

  // New In: The backend already sorted this by timestamp and merged all brands!
  // Just cap it at 12 items for the carousel.
  const newInAll = featured?.newIn?.slice(0, 12) || [];

  // Editor's Choice: dedicated withVideo array from backend,
  // with a final isClothing pass as a safety net.
  // Fallback uses newInAll without sale items to keep it clean.
  const videoProducts = (featured?.withVideo || []).filter(isClothing);
  const fallbackProducts = newInAll.filter((p) => !p.originalPrice).slice(0, 4);
  const editorChoiceProducts =
    videoProducts.length > 0 ? videoProducts : fallbackProducts;
  // Department overline label
  const deptLabel =
    selectDepartments?.[0] === "Men" || selectDepartments?.[0] === "MAN"
      ? "Men's Collection"
      : selectDepartments?.[0] === "Women" || selectDepartments?.[0] === "WOMAN"
        ? "Women's Collection"
        : "Zara · Massimo Dutti";

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
        {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
        {/* Removed the bottom border, adjusted ratio slightly for more visual drama */}
        <section className="grid grid-cols-[40%_60%] h-[calc(100vh-57px)] relative">
          {/* LEFT — editorial text + search */}
          {/* Removed the border-r, increased horizontal padding for breathing room */}
          <div className="relative flex flex-col justify-center px-20 py-16 bg-bgPrimary dark:bg-bgPrimary-dark z-10 shadow-[20px_0_30px_rgba(0,0,0,0.5)]">
            <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-8 animate-slide-up [animation-delay:100ms] [animation-fill-mode:both]">
              {deptLabel}
            </p>

            <h1 className="font-heading font-light text-[clamp(48px,5.5vw,80px)] leading-none tracking-tight text-textPrimary dark:text-textPrimary-dark mb-6 animate-slide-up [animation-delay:200ms] [animation-fill-mode:both]">
              Fashion,
              <br />
              <em className="italic text-textSecondary dark:text-textSecondary-dark">
                tracked.
              </em>
            </h1>

            <p className="font-sans text-[13px] leading-relaxed text-textTertiary dark:text-textTertiary-dark mb-11 max-w-xs animate-slide-up [animation-delay:300ms] [animation-fill-mode:both]">
              Compare prices across every brand. Track drops. Find the best time
              to buy.
            </p>

            <div className="relative z-20 animate-slide-up [animation-delay:400ms] [animation-fill-mode:both]">
              <SearchBar variant="hero" />
            </div>

            <span className="absolute bottom-8 left-20 font-heading font-light text-xs tracking-editorial uppercase text-borderDark dark:text-borderDark-dark animate-fade-in [animation-delay:800ms] [animation-fill-mode:both]">
              Dope
            </span>
          </div>

          {/* RIGHT — FULL BLEED Campaign Heroes */}
          {/* KILLED the p-3 padding. KILLED the rounded corners. Let it bleed! */}
          <div className="relative h-full w-full bg-black overflow-hidden animate-fade-in [animation-delay:300ms] [animation-fill-mode:both]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <p className="font-heading italic text-lg text-textMuted dark:text-textMuted-dark">
                  Loading…
                </p>
              </div>
            ) : featured?.campaignHeroes &&
              featured.campaignHeroes.length > 0 ? (
              // The Slider now takes up 100% of this container, right to the pixel edges.
              <CampaignHeroSlider heroes={featured.campaignHeroes} />
            ) : mosaicProducts.length >= 4 ? (
              <ProductMosaic products={mosaicProducts} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="font-heading italic text-lg text-textMuted dark:text-textMuted-dark">
                  Start scraping to see products here
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ══ EDITOR'S CHOICE ══════════════════════════════════════════════════ */}
        {!loading && editorChoiceProducts.length > 0 && (
          <section className="bg-bgPrimary dark:bg-bgPrimary-dark px-16 py-20 border-b border-borderLight dark:border-borderLight-dark">
            <div className="flex justify-between items-baseline mb-10 border-b border-borderLight dark:border-borderLight-dark pb-5">
              <div className="flex items-baseline gap-4">
                <h2 className="font-heading font-light text-[28px] text-textPrimary dark:text-textPrimary-dark">
                  Editor's Choice
                </h2>
                <span className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
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
          <section className="bg-bgPrimary dark:bg-bgPrimary-dark px-16 py-12 border-b border-borderLight dark:border-borderLight-dark">
            <div className="flex justify-between items-baseline mb-8">
              <div>
                <p className="font-sans text-[9px] tracking-editorial uppercase text-accentRed mb-2">
                  Limited Time
                </p>
                <h2 className="font-heading font-light text-3xl tracking-wide text-textPrimary dark:text-textPrimary-dark">
                  Price drops, right now.
                </h2>
              </div>
              <button
                onClick={() => navigate("/collection/sale")}
                className="font-sans text-[10px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer opacity-70 hover:opacity-40 transition-opacity duration-200 ease-smooth"
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
          <section className="bg-bgPrimary dark:bg-bgPrimary-dark px-16 py-20">
            <div className="flex justify-between items-baseline mb-10 border-b border-borderLight dark:border-borderLight-dark pb-5">
              <div className="flex items-baseline gap-4">
                <h2 className="font-heading font-light text-[28px] text-textPrimary dark:text-textPrimary-dark">
                  New in
                </h2>
                <span className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
                  Latest arrivals
                </span>
              </div>
              <button
                onClick={() => navigate("/collection/new-in")}
                className="font-sans text-[10px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer hover:opacity-50 transition-opacity duration-200 ease-smooth"
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
          <section className="grid grid-cols-2 border-t border-borderLight dark:border-borderLight-dark">
            {/* Zara */}
            <div
              onClick={() => {
                dispatch(clearFilters());
                dispatch(setSearchTerm(""));
                navigate("/collection/zara");
              }}
              className="flex items-center justify-between px-16 py-12 border-r border-borderLight dark:border-borderLight-dark cursor-pointer transition-colors duration-300 ease-smooth hover:bg-bgHover dark:hover:bg-bgHover-dark"
            >
              <div>
                <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2">
                  Brand
                </p>
                <h3 className="font-heading font-light text-4xl tracking-wider text-textPrimary dark:text-textPrimary-dark">
                  Zara
                </h3>
              </div>
              <span className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark">
                →
              </span>
            </div>

            {/* Massimo Dutti */}
            <div
              onClick={() => {
                dispatch(clearFilters());
                dispatch(setSearchTerm(""));
                navigate("/collection/massimo-dutti");
              }}
              className="flex items-center justify-between px-16 py-12 cursor-pointer transition-colors duration-300 ease-smooth hover:bg-bgHover dark:hover:bg-bgHover-dark"
            >
              <div>
                <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2">
                  Brand
                </p>
                <h3 className="font-heading font-light text-4xl tracking-tight text-textPrimary dark:text-textPrimary-dark">
                  Massimo Dutti
                </h3>
              </div>
              <span className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark">
                →
              </span>
            </div>
          </section>
        )}

        {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
        <footer className="bg-bgPrimary dark:bg-bgPrimary-dark px-16 py-8 flex justify-between items-center border-t border-borderLight dark:border-borderLight-dark">
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
