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
import DopeLogo from "../components/DopeLogo";
import {
  fetchFeatured,
  fetchBrandCounts,
  fetchProductsFromAPI,
  type FeaturedData,
  type BrandCounts,
} from "../services/api";

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

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_WRAPPER =
  "min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px] md:min-w-[240px] md:max-w-[240px] lg:min-w-[260px] lg:max-w-[260px] flex-shrink-0";

const SKELETON_COUNT = 6;

// ─── Category definitions — mirrors the full TAXONOMY ───────────────────────
// All 16 main browseable categories. Keys match FeaturedData["categoryTiles"].
// `display` = clean label shown in the Collection page heading ("Results for Tops")
// `search`  = multi-word query fed to the backend category search (never shown to user)
const CATEGORIES: {
  label: string;
  display: string;
  key: keyof FeaturedData["categoryTiles"];
  search: string;
}[] = [
  {
    label: "Coats",
    display: "Coats",
    key: "coats",
    search: "coat overcoat trench parka",
  },
  {
    label: "Jackets",
    display: "Jackets",
    key: "jackets",
    search: "jacket bomber puffer windbreaker quilted",
  },
  {
    label: "Suits",
    display: "Suits",
    key: "suits",
    search: "suit blazer tuxedo waistcoat",
  },
  {
    label: "Tops",
    display: "Tops",
    key: "tops",
    search: "top shirt blouse tee camisole polo",
  },
  {
    label: "Knitwear",
    display: "Knitwear",
    key: "knitwear",
    search: "knitwear",
  },
  { label: "Jeans", display: "Jeans", key: "jeans", search: "jeans denim" },
  {
    label: "Trousers",
    display: "Trousers",
    key: "trousers",
    search: "trouser",
  },
  {
    label: "Shorts",
    display: "Shorts",
    key: "shorts",
    search: "shorts bermuda",
  },
  { label: "Dresses", display: "Dresses", key: "dresses", search: "dress" },
  { label: "Skirts", display: "Skirts", key: "skirts", search: "skirt" },
  {
    label: "Activewear",
    display: "Activewear",
    key: "activewear",
    search: "activewear sport training gym fitness",
  },
  {
    label: "Jumpsuits",
    display: "Jumpsuits",
    key: "jumpsuits",
    search: "jumpsuit playsuit romper",
  },
  { label: "Shoes", display: "Shoes", key: "shoes", search: "shoe" },
  { label: "Bags", display: "Bags", key: "bags", search: "bag" },
  {
    label: "Accessories",
    display: "Accessories",
    key: "accessories",
    search: "belt scarf hat sunglasses glove",
  },
  {
    label: "Jewelry",
    display: "Jewelry",
    key: "jewelry",
    search: "jewelry necklace earring ring bracelet",
  },
];

// ─── Feature strip content ────────────────────────────────────────────────────

const FEATURES = [
  {
    label: "Track",
    statement: ["Prices,", "watched."],
    desc: "Checked daily across Zara, Mango & Massimo Dutti.",
  },
  {
    label: "Compare",
    statement: ["Looks,", "side-by-side."],
    desc: "Tap + on any product. We put them next to each other.",
  },
  {
    label: "Notify",
    statement: ["Target set.", "Alert sent."],
    desc: "Your price. The moment it hits — or goes lower.",
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

// ─── SeeAllButton — larger touch target ──────────────────────────────────────

function SeeAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-sans text-[9px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer opacity-70 hover:opacity-40 transition-opacity py-2 px-1"
      style={{ minHeight: 40 }}
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
          key={f.label}
          className={`px-8 md:px-12 lg:px-20 py-10 lg:py-14 flex flex-col gap-4 border-b border-borderLight dark:border-borderLight-dark ${
            i < 2 ? "md:border-r" : ""
          }`}
        >
          <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
            {f.label}
          </p>
          <h3 className="font-heading font-light text-[clamp(26px,4vw,40px)] leading-[1.1] text-textPrimary dark:text-textPrimary-dark">
            {f.statement[0]}
            <br />
            <em className="italic text-textSecondary dark:text-textSecondary-dark">
              {f.statement[1]}
            </em>
          </h3>
          <p className="font-sans text-[12px] leading-relaxed text-textSecondary dark:text-textSecondary-dark">
            {f.desc}
          </p>
        </div>
      ))}
    </div>
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

// ─── The Drop ─────────────────────────────────────────────────────────────────

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-[3px]">
          <div className="sm:col-span-2 lg:col-span-1 min-h-[340px] sm:min-h-[480px] lg:min-h-[600px] bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe" />
          <div className="grid grid-rows-3 gap-[3px] min-h-[340px] sm:min-h-[480px] lg:min-h-[600px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe"
              />
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

      {/*
        Grid:
        - Mobile: single column (hero full-width, side items stacked)
        - sm+:    hero spans both columns as a banner, side items in a row below
        - lg+:    classic 50/50 split — hero left, 3 stacked right
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-[3px]">
        {/* ── Hero card ── */}
        {hero &&
          (() => {
            const heroDiscount = calcDiscount(hero);
            return (
              <div
                onClick={() => navigate(`/product/${hero.id}`)}
                className="relative cursor-pointer overflow-hidden group sm:col-span-2 lg:col-span-1 min-h-[340px] sm:min-h-[420px] lg:min-h-[600px] bg-bgSecondary dark:bg-bgSecondary-dark"
              >
                {hero.images?.[0] && (
                  <img
                    src={hero.images[0]}
                    alt={hero.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                {heroDiscount > 0 && (
                  <div className="absolute top-4 left-4 bg-accentRed text-white font-sans text-[11px] tracking-widest uppercase px-3 py-1.5">
                    −{heroDiscount}%
                  </div>
                )}

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

        {/* ── 3 portrait cards — stacked vertically on lg, row on sm ── */}
        {sideItems.length > 0 && (
          <div className="grid sm:grid-cols-3 lg:grid-cols-1 sm:grid-rows-1 lg:grid-rows-3 gap-[3px] min-h-[200px] sm:min-h-[260px] lg:min-h-[600px]">
            {sideItems.map((product) => {
              const disc = calcDiscount(product);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative cursor-pointer overflow-hidden group bg-bgSecondary dark:bg-bgSecondary-dark min-h-[200px] sm:min-h-[auto]"
                >
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {disc > 0 && (
                    <div className="absolute top-3 left-3 bg-accentRed text-white font-sans text-[9px] tracking-widest uppercase px-2 py-1">
                      −{disc}%
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4">
                    <p className="font-sans text-[8px] tracking-editorial uppercase text-white/50 mb-0.5 truncate">
                      {product.brand}
                    </p>
                    <p className="font-sans text-[11px] text-white leading-snug mb-1 line-clamp-1">
                      {product.name}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading text-[13px] text-white">
                        {product.price.toLocaleString("tr-TR")}{" "}
                        {product.currency}
                      </span>
                      {product.originalPrice && (
                        <span className="font-heading text-[11px] text-white/40 line-through">
                          {product.originalPrice.toLocaleString("tr-TR")}
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

// ─── Category Rail ────────────────────────────────────────────────────────────

function CategoryRail({
  tiles,
  loading,
  onNavigate,
}: {
  tiles: FeaturedData["categoryTiles"] | null;
  loading: boolean;
  onNavigate: (display: string, search: string) => void;
}) {
  const visible = loading
    ? CATEGORIES
    : CATEGORIES.filter((cat) => tiles?.[cat.key]?.images?.[0]);
  if (loading) {
    return (
      <div className="flex gap-[3px] overflow-x-hidden">
        {CATEGORIES.slice(0, 8).map((cat) => (
          <div
            key={String(cat.key)}
            className="flex-shrink-0 w-[180px] md:w-[240px] aspect-[2/3] bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe"
          />
        ))}
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <div className="flex gap-[3px] overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((cat) => {
        const product = tiles?.[cat.key];
        const imgSrc = product?.images?.[0];
        return (
          <div
            key={String(cat.key)}
            onClick={() => onNavigate(cat.display, cat.search)}
            className="relative flex-shrink-0 w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] overflow-hidden cursor-pointer group bg-bgSecondary dark:bg-bgSecondary-dark"
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt={cat.label}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

            <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5">
              <p className="font-sans text-[8px] tracking-editorial uppercase text-white/40 mb-1.5">
                Shop
              </p>
              <h3 className="font-heading font-light text-[clamp(18px,2.5vw,28px)] leading-none text-white">
                {cat.label}
              </h3>
            </div>

            <div className="absolute top-4 right-4 w-7 h-7 rounded-full border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Brand Split ──────────────────────────────────────────────────────────────

function BrandSplit({
  loading,
  brandCounts,
}: {
  loading: boolean;
  brandCounts: BrandCounts | null;
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const brands = [
    {
      label: "Zara",
      path: "/collection/zara",
      countKey: "zara" as keyof BrandCounts,
      border: true,
    },
    {
      label: "Mango",
      path: "/collection/mango",
      countKey: "mango" as keyof BrandCounts,
      border: true,
    },
    {
      label: "Massimo Dutti",
      path: "/collection/massimo-dutti",
      countKey: "massimoDutti" as keyof BrandCounts,
      border: false,
    },
  ];

  return (
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
              <div className="h-2 w-16 bg-textPrimary/[0.06] dark:bg-textPrimary-dark/[0.08] animate-breathe rounded mt-3" />
            </div>
          ))}
        </>
      ) : (
        brands.map(({ label, path, countKey, border }) => {
          const count = brandCounts?.[countKey];
          return (
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
                {count != null && count > 0 && (
                  <p className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark mt-2">
                    {formatCount(count)} items
                  </p>
                )}
              </div>
              <span className="text-textMuted dark:text-textMuted-dark">→</span>
            </div>
          );
        })
      )}
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
  const [brandCounts, setBrandCounts] = useState<BrandCounts | null>(null);

  // Editor's Choice paginated carousel
  const [editorChoiceProducts, setEditorChoiceProducts] = useState<Product[]>(
    [],
  );
  const [editorChoicePage, setEditorChoicePage] = useState(1);
  const [editorChoiceHasMore, setEditorChoiceHasMore] = useState(false);
  const [editorChoiceLoading, setEditorChoiceLoading] = useState(false);

  // ── Fetch featured data + brand counts ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // Kick off featured + brand counts in parallel
        const [data, counts] = await Promise.all([
          fetchFeatured(selectDepartments),
          fetchBrandCounts(selectDepartments),
        ]);

        if (cancelled) return;

        if (data) {
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

        setBrandCounts(counts);
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

  // ── Load more Editor's Choice ─────────────────────────────────────────────
  const loadMoreEditorChoice = useCallback(async () => {
    if (editorChoiceLoading || !editorChoiceHasMore) return;
    setEditorChoiceLoading(true);
    try {
      const nextPage = editorChoicePage + 1;
      const data = await fetchProductsFromAPI({
        hasVideo: true,
        page: nextPage,
        departments: selectDepartments,
      });
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

  // ── Derived data ──────────────────────────────────────────────────────────
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

  // ── Visible category count for subtitle ──────────────────────────────────
  const visibleCatCount = featured?.categoryTiles
    ? CATEGORIES.filter((c) => featured.categoryTiles[c.key]?.images?.[0])
        .length
    : null;

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
            <p className="font-sans text-[12px] leading-[1.9] text-textSecondary dark:text-textSecondary-dark mb-6 lg:mb-11 max-w-[280px] animate-slide-up [animation-delay:300ms] [animation-fill-mode:both]">
              Daily price tracking across Zara, Mango & Massimo Dutti.
              <br />
              Set a target — get alerted the moment it hits.
            </p>
            <div className="relative z-20 animate-slide-up [animation-delay:400ms] [animation-fill-mode:both] w-full">
              <SearchBar variant="hero" />
            </div>
          </div>

          <div className="relative w-full h-[55vw] min-h-[260px] max-h-[420px] sm:max-h-[560px] lg:max-h-none lg:h-auto lg:min-h-full bg-black overflow-hidden">
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

        {/* ══ FEATURE STRIP ════════════════════════════════════════════════ */}
        <FeatureStrip />

        {/* ══ EDITOR'S CHOICE ══════════════════════════════════════════════ */}
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

        {/* ══ THE DROP ════════════════════════════════════════════════════ */}
        <TheDropSection
          products={topDrops}
          loading={loading}
          onSeeAll={() => navigate("/collection/sale")}
        />

        {/* ══ BROWSE BY CATEGORY ══════════════════════════════════════════ */}
        <section className="py-10 lg:py-16 border-b border-borderLight dark:border-borderLight-dark overflow-hidden">
          <div className="flex justify-between items-baseline mb-6 px-4 md:px-8 lg:px-16 border-b border-borderLight dark:border-borderLight-dark pb-4">
            <div>
              <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-1">
                {visibleCatCount != null
                  ? `${visibleCatCount} ${visibleCatCount === 1 ? "category" : "categories"}`
                  : loading
                    ? "Categories"
                    : `${CATEGORIES.length} categories`}
              </p>
              <h2 className="font-heading font-light text-xl lg:text-[28px] text-textPrimary dark:text-textPrimary-dark">
                Browse by{" "}
                <em className="italic text-textSecondary dark:text-textSecondary-dark">
                  category.
                </em>
              </h2>
            </div>
          </div>
          <CategoryRail
            tiles={featured?.categoryTiles ?? null}
            loading={loading}
            onNavigate={(display, search) => {
              dispatch(clearFilters());
              const params = new URLSearchParams({
                search: display,
                q: search,
                mode: "category",
              });
              if (selectDepartments?.length) {
                params.set("departments", selectDepartments.join(","));
              }
              navigate(`/collection?${params.toString()}`);
            }}
          />
        </section>

        {/* ══ BRAND SPLIT ════════════════════════════════════════════════ */}
        <BrandSplit loading={loading} brandCounts={brandCounts} />

        {/* ══ FOOTER ════════════════════════════════════════════════════ */}
        <footer className="px-6 lg:px-16 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-borderLight dark:border-borderLight-dark">
          <span className="text-textSecondary dark:text-textSecondary-dark">
            <DopeLogo size="sm" />
          </span>
          <span className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
            Price tracking · Zara · Mango · Massimo Dutti · Turkey
          </span>
        </footer>
      </div>
    </PageTransition>
  );
}
