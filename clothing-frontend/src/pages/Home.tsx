import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { Product } from "../types";
import { SearchBar } from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import { setBrands, setSearchTerm } from "../store/productSlice";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeaturedData {
  onSale: Product[];
  newIn: { zara: Product[]; massimo: Product[] };
  categoryTiles: {
    jackets: Product | null;
    shirts: Product | null;
    trousers: Product | null;
    knitwear: Product | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function discountPct(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}

// Collect all non-null products from the featured response for the mosaic
function getMosaicImages(featured: FeaturedData): Product[] {
  const pool: Product[] = [
    ...(featured.newIn.zara || []),
    ...(featured.newIn.massimo || []),
  ].filter((p) => p.images?.[0]);
  // Shuffle deterministically enough for visual variety
  return pool.sort(() => 0.5 - Math.random()).slice(0, 6);
}

// ─── Category pills config ────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All", query: "" },
  { label: "Jackets", query: "jacket" },
  { label: "Shirts", query: "shirt" },
  { label: "Trousers", query: "trousers" },
  { label: "Knitwear", query: "knitwear" },
  { label: "Suits", query: "suit" },
  { label: "Denim", query: "jeans" },
  { label: "Sweatshirts", query: "sweatshirt" },
  { label: "Outerwear", query: "coat" },
  { label: "Polo", query: "polo" },
];

// ─── CSS injection ────────────────────────────────────────────────────────────
// Inject keyframes once — avoids inline style limitations
if (
  typeof document !== "undefined" &&
  !document.getElementById("home-keyframes")
) {
  const style = document.createElement("style");
  style.id = "home-keyframes";
  style.textContent = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes imgReveal {
      from { opacity: 0; transform: scale(1.04); }
      to   { opacity: 1; transform: scale(1); }
    }
    .mosaic-img { transition: transform 0.6s ease; }
    .mosaic-img:hover { transform: scale(1.03) !important; }
    .sale-card { transition: transform 0.3s ease; cursor: pointer; }
    .sale-card:hover { transform: translateY(-4px); }
    .cat-pill { transition: all 0.2s ease; }
    .cat-pill:hover { background: #1a1a1a !important; color: #fff !important; border-color: #1a1a1a !important; }
    .view-all-btn { transition: opacity 0.2s ease; }
    .view-all-btn:hover { opacity: 0.6 !important; }
    ::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(style);
}

// ─── Product Mosaic (hero right panel) ───────────────────────────────────────
function ProductMosaic({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  if (products.length < 4) return null;

  // Layout: 3 columns, varying heights for editorial feel
  // Col 1: tall (spans 2 rows) | Col 2: two small | Col 3: one tall
  const [p0, p1, p2, p3, p4, p5] = products;

  const cell = (p: Product, style: React.CSSProperties, delay: number) => (
    <div
      key={p.id}
      onClick={() => navigate(`/product/${p.id}`)}
      style={{
        ...style,
        overflow: "hidden",
        background: "#e8e4dc",
        cursor: "pointer",
        animation: `imgReveal 0.8s ease ${delay}s both`,
      }}
    >
      <img
        className="mosaic-img"
        src={p.images[0]}
        alt={p.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1.1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "6px",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Col 1: tall spanning both rows */}
      {p0 && cell(p0, { gridRow: "1 / 3" }, 0.1)}
      {/* Col 2 top */}
      {p1 && cell(p1, {}, 0.2)}
      {/* Col 3 top */}
      {p2 && cell(p2, {}, 0.3)}
      {/* Col 2 bottom */}
      {p3 && cell(p3, {}, 0.35)}
      {/* Col 3 bottom */}
      {p4 && cell(p4, {}, 0.4)}
    </div>
  );
}

// ─── Sale strip card ──────────────────────────────────────────────────────────
function SaleCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const pct = product.originalPrice
    ? discountPct(product.originalPrice, product.price)
    : 0;

  return (
    <div
      className="sale-card"
      onClick={() => navigate(`/product/${product.id}`)}
      style={{ flexShrink: 0, width: "180px" }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          overflow: "hidden",
          background: "#1e1e1c",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 2,
            background: "#b94040",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.08em",
            padding: "3px 7px",
            fontWeight: 500,
          }}
        >
          −{pct}%
        </span>
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.88,
              transition: "opacity 0.3s ease, transform 0.5s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "1";
              (e.currentTarget as HTMLImageElement).style.transform =
                "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0.88";
              (e.currentTarget as HTMLImageElement).style.transform =
                "scale(1)";
            }}
          />
        )}
      </div>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "12px",
          fontWeight: 300,
          color: "#e0ddd8",
          margin: "0 0 3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {toTitleCase(product.name)}
      </p>
      <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#b94040",
            fontWeight: 500,
          }}
        >
          {product.price.toLocaleString("tr-TR")}
        </span>
        {product.originalPrice && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              color: "#555",
              textDecoration: "line-through",
            }}
          >
            {product.originalPrice.toLocaleString("tr-TR")}
          </span>
        )}
      </div>
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
  const [activeCategory, setActiveCategory] = useState("");
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectDepartments && selectDepartments.length > 0) {
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
  const newInAll = featured
    ? [...(featured.newIn.zara || []), ...(featured.newIn.massimo || [])]
        .sort(
          (a, b) =>
            new Date(b.timestamp || 0).getTime() -
            new Date(a.timestamp || 0).getTime(),
        )
        .slice(0, 8)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ed" }}>
      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "42% 58%",
          height: "calc(100vh - 57px)", // subtract navbar height
          borderBottom: "1px solid #e0ddd8",
        }}
      >
        {/* LEFT — editorial text + search */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 56px 64px 64px",
            borderRight: "1px solid #e0ddd8",
            position: "relative",
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#b0aca4",
              margin: "0 0 32px",
              animation: "fadeUp 0.6s ease 0.1s both",
            }}
          >
            {selectDepartments?.[0] === "Men" ||
            selectDepartments?.[0] === "MAN"
              ? "Men's Collection"
              : selectDepartments?.[0] === "Women" ||
                  selectDepartments?.[0] === "WOMAN"
                ? "Women's Collection"
                : "Zara · Massimo Dutti"}
          </p>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "clamp(48px, 5.5vw, 80px)",
              lineHeight: 1.0,
              color: "#0f0f0d",
              margin: "0 0 24px",
              letterSpacing: "-0.01em",
              animation: "fadeUp 0.6s ease 0.2s both",
            }}
          >
            Fashion,
            <br />
            <em style={{ fontStyle: "italic", color: "#6b6560" }}>tracked.</em>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              lineHeight: 1.65,
              color: "#8a8580",
              margin: "0 0 44px",
              maxWidth: "320px",
              animation: "fadeUp 0.6s ease 0.3s both",
            }}
          >
            Compare prices across every brand. Track drops. Find the best time
            to buy.
          </p>

          {/* Search */}
          <div
            style={{
              position: "relative",
              zIndex: 20,
              animation: "fadeUp 0.6s ease 0.4s both",
            }}
          >
            <SearchBar variant="hero" />
          </div>

          {/* Category pills */}
          <div
            ref={stripRef}
            style={{
              position: "relative",
              zIndex: 10,
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              marginTop: "36px",
              paddingBottom: "4px",
              scrollbarWidth: "none",
              animation: "fadeUp 0.6s ease 0.5s both",
            }}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.query;
              return (
                <button
                  key={cat.label}
                  className="cat-pill"
                  onClick={() => {
                    setActiveCategory(cat.query);
                    dispatch(setSearchTerm(cat.query));
                    if (cat.query) {
                      navigate(`/search?q=${encodeURIComponent(cat.query)}`);
                    } else {
                      navigate("/search");
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "7px 14px",
                    border: "1px solid",
                    borderColor: active ? "#0f0f0d" : "#d4d0c8",
                    background: active ? "#0f0f0d" : "transparent",
                    color: active ? "#fff" : "#6b6560",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Bottom watermark */}
          <div
            style={{
              position: "absolute",
              bottom: "32px",
              left: "64px",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "12px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#d4d0c8",
              animation: "fadeIn 1s ease 0.8s both",
            }}
          >
            Dope
          </div>
        </div>

        {/* RIGHT — product mosaic */}
        <div
          style={{
            background: "#ede9e3",
            padding: "12px",
            overflow: "hidden",
            animation: "fadeIn 0.8s ease 0.3s both",
          }}
        >
          {loading ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "18px",
                  color: "#c0bdb8",
                }}
              >
                Loading…
              </p>
            </div>
          ) : mosaicProducts.length >= 4 ? (
            <ProductMosaic products={mosaicProducts} />
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "18px",
                  color: "#c0bdb8",
                }}
              >
                Start scraping to see products here
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ══ SALE STRIP ════════════════════════════════════════════════════════ */}
      {!loading && featured?.onSale && featured.onSale.length > 0 && (
        <section style={{ background: "#0f0f0d", padding: "48px 64px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "32px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#b94040",
                  margin: "0 0 8px",
                }}
              >
                Limited Time
              </p>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: "32px",
                  color: "#f0ede8",
                  margin: 0,
                  letterSpacing: "0.02em",
                }}
              >
                Price drops, right now.
              </h2>
            </div>
            <button
              className="view-all-btn"
              onClick={() => navigate("/search")}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6b6560",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                opacity: 0.8,
              }}
            >
              View all
            </button>
          </div>

          {/* Horizontal scroll */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              overflowX: "auto",
              paddingBottom: "8px",
              scrollbarWidth: "none",
            }}
          >
            {featured.onSale.map((p) => (
              <SaleCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ══ NEW IN ════════════════════════════════════════════════════════════ */}
      {!loading && newInAll.length > 0 && (
        <section style={{ padding: "80px 64px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "40px",
              borderBottom: "1px solid #e0ddd8",
              paddingBottom: "20px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "16px" }}
            >
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: "28px",
                  color: "#0f0f0d",
                  margin: 0,
                }}
              >
                New in
              </h2>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#b0aca4",
                }}
              >
                Latest arrivals
              </span>
            </div>
            <button
              className="view-all-btn"
              onClick={() => navigate("/search")}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#8a8580",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              See all →
            </button>
          </div>

          {/* 4-column grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "24px",
            }}
          >
            {newInAll.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ══ BRAND SPLIT ══════════════════════════════════════════════════════ */}
      {!loading && featured && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderTop: "1px solid #e0ddd8",
          }}
        >
          {/* Zara */}
          <div
            onClick={() => {
              dispatch(setSearchTerm("")); // Clear any text search
              dispatch(setBrands(["Zara"])); // Lock the strict brand filter
              navigate("/search");
            }}
            style={{
              padding: "48px 64px",
              borderRight: "1px solid #e0ddd8",
              cursor: "pointer",
              transition: "background 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#ede9e3")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#b0aca4",
                  margin: "0 0 8px",
                }}
              >
                Brand
              </p>
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: "36px",
                  color: "#0f0f0d",
                  margin: 0,
                  letterSpacing: "0.04em",
                }}
              >
                Zara
              </h3>
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: "#b0aca4",
              }}
            >
              →
            </span>
          </div>

          {/* Massimo Dutti */}
          <div
            onClick={() => {
              dispatch(setSearchTerm("")); // Clear any text search
              dispatch(setBrands(["Massimo Dutti"])); // Lock the strict brand filter
              navigate("/search");
            }}
            style={{
              padding: "48px 64px",
              cursor: "pointer",
              transition: "background 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#ede9e3")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#b0aca4",
                  margin: "0 0 8px",
                }}
              >
                Brand
              </p>
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: "36px",
                  color: "#0f0f0d",
                  margin: 0,
                  letterSpacing: "0.02em",
                }}
              >
                Massimo Dutti
              </h3>
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: "#b0aca4",
              }}
            >
              →
            </span>
          </div>
        </section>
      )}

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          background: "#0f0f0d",
          padding: "32px 64px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "15px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#4a4744",
          }}
        >
          Dope
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#3a3734",
          }}
        >
          Price tracking · Zara & Massimo Dutti · Turkey
        </span>
      </footer>
    </div>
  );
}
