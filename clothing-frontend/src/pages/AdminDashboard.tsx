import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSelector } from "react-redux"; // 👈 Added Redux to get the token
import { toggleCampaignHeroAPI } from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface KpiItem {
  label: string;
  value: string | number;
  delta: string;
  up: boolean;
}

interface PriceDropPoint {
  day: string;
  drops: number;
}

interface ScraperStatus {
  brand: string;
  status: "idle" | "running" | "error";
  lastRun: string;
  duration: string;
  newItems: number;
  updated: number;
}

interface WatchlistItem {
  image: string;
  brand: string;
  name: string;
  trackCount: number;
  link?: string;
}

interface VideoProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  images: string[];
  video?: string;
  videoUrl?: string;
  videos?: string[];
  media?: { type?: string; url?: string }[];
  link: string;
  department?: string;
  category?: string;
  isCampaignHero: boolean;
}

interface DashboardData {
  kpiData: KpiItem[];
  priceDropData: PriceDropPoint[];
  scraperStatus: ScraperStatus[];
  watchlistTop: WatchlistItem[];
  activityLog: any[];
  videoProducts: VideoProduct[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_TOKENS = {
  light: {
    grid: "#e8e4dc",
    axis: "#a0a0a0",
    area: "#1a1a1a",
    tooltip: "#ffffff",
    tooltipBorder: "#e8e4dc",
    tooltipText: "#1a1a1a",
  },
  dark: {
    grid: "#5a5754",
    axis: "#8a8784",
    area: "#f0ede6",
    tooltip: "#1a1a18",
    tooltipBorder: "#5a5754",
    tooltipText: "#f0ede6",
  },
} as const;

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "scrapers", label: "Scrapers" },
  { id: "campaign", label: "Campaign" },
];

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ─── Utilities ────────────────────────────────────────────────────────────────
function resolveVideoSrc(p: VideoProduct): string | undefined {
  if (p.video) return p.video;
  if (p.videoUrl) return p.videoUrl;
  if (p.videos?.[0]) return p.videos[0];
  if (p.media) {
    const vid = p.media.find(
      (m) => m.type === "video" || m.url?.includes(".mp4"),
    );
    if (vid?.url) return vid.url;
  }
  return undefined;
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='400' height='500' fill='%23e8e4dc'/%3E%3C/svg%3E";

function resolvePoster(p: VideoProduct): string {
  return p.images?.[0] || PLACEHOLDER;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  const t = isDark ? CHART_TOKENS.dark : CHART_TOKENS.light;
  return (
    <div
      style={{
        background: t.tooltip,
        border: `1px solid ${t.tooltipBorder}`,
        padding: "10px 14px",
      }}
    >
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "18px",
          color: t.tooltipText,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {payload[0].value}
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "8px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: t.axis,
          margin: "5px 0 0",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  return (
    <div className="border border-borderLight dark:border-borderLight-dark p-5 flex flex-col gap-3 bg-bgPrimary dark:bg-bgPrimary-dark">
      <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
        {item.label}
      </p>
      <p className="font-heading font-light text-4xl leading-none text-textPrimary dark:text-textPrimary-dark">
        {item.value}
      </p>
      <p
        className={`font-sans text-[9px] tracking-widest uppercase ${item.up ? "text-textPrimary dark:text-textPrimary-dark" : "text-textMuted dark:text-textMuted-dark"}`}
      >
        {item.delta}
      </p>
    </div>
  );
}

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const inner = (
    <div className="flex items-center gap-4 py-3 border-b border-borderLight dark:border-borderLight-dark last:border-b-0 group">
      <div className="flex-shrink-0 w-10 h-[50px] overflow-hidden border border-borderLight dark:border-borderLight-dark bg-bgSecondary dark:bg-bgSecondary-dark">
        <img
          src={item.image}
          alt={item.name}
          width={40}
          height={50}
          className="w-10 h-[50px] object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
          }}
          style={{ display: "block" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark truncate">
          {item.brand}
        </p>
        <p className="font-heading font-light text-base text-textPrimary dark:text-textPrimary-dark leading-tight truncate group-hover:opacity-70 transition-opacity duration-200">
          {item.name}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-heading font-light text-2xl leading-none text-textPrimary dark:text-textPrimary-dark">
          {item.trackCount}
        </p>
        <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mt-0.5">
          tracked
        </p>
      </div>
    </div>
  );
  return item.link ? (
    <a href={item.link} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

function LiveHeroRow({
  product,
  onRemove,
  isRemoving,
}: {
  product: VideoProduct;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-borderLight dark:border-borderLight-dark last:border-b-0">
      <div className="flex-shrink-0 w-10 h-[50px] overflow-hidden border border-borderLight dark:border-borderLight-dark bg-bgSecondary dark:bg-bgSecondary-dark">
        <img
          src={resolvePoster(product)}
          alt={product.name}
          width={40}
          height={50}
          className="w-10 h-[50px] object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
          }}
          style={{ display: "block" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark truncate">
          {product.brand}
        </p>
        <p className="font-heading font-light text-sm text-textPrimary dark:text-textPrimary-dark leading-tight truncate">
          {product.name}
        </p>
      </div>
      <button
        onClick={() => onRemove(product.id)}
        disabled={isRemoving}
        className={`flex-shrink-0 px-3 py-1.5 font-sans text-[8px] tracking-widest uppercase border transition-all duration-200 ${
          isRemoving
            ? "opacity-30 cursor-wait border-borderLight dark:border-borderLight-dark text-textMuted dark:text-textMuted-dark"
            : "border-accentRed text-accentRed hover:bg-accentRed hover:text-white"
        }`}
      >
        Remove
      </button>
    </div>
  );
}

function ScraperCard({
  s,
  onRun,
  onStop,
}: {
  s: ScraperStatus;
  onRun: (brand: string) => void;
  onStop: (brand: string) => void;
}) {
  const isRunning = s.status === "running";
  return (
    <div className="border border-borderLight dark:border-borderLight-dark p-6 flex flex-col gap-5 bg-bgPrimary dark:bg-bgPrimary-dark">
      <div className="flex items-start justify-between">
        <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark">
          {s.brand}
        </h3>
        <span
          className={`font-sans text-[9px] tracking-widest uppercase ${isRunning ? "text-textPrimary dark:text-textPrimary-dark" : s.status === "error" ? "text-accentRed" : "text-textMuted dark:text-textMuted-dark"}`}
        >
          {isRunning ? "● running" : s.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
        {[
          { label: "Last Run", value: s.lastRun },
          { label: "Duration", value: s.duration },
          { label: "New Items", value: s.newItems ?? "—" },
          { label: "Updated", value: s.updated ?? "—" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-bgPrimary dark:bg-bgPrimary-dark px-4 py-3"
          >
            <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1">
              {label}
            </p>
            <p className="font-heading font-light text-lg leading-none text-textPrimary dark:text-textPrimary-dark">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onRun(s.brand)}
          disabled={isRunning}
          className={`flex-1 py-3 font-sans text-[9px] tracking-widest uppercase border transition-all duration-300 ${
            isRunning
              ? "border-borderLight dark:border-borderLight-dark text-textMuted dark:text-textMuted-dark cursor-wait opacity-50"
              : "border-textPrimary dark:border-textPrimary-dark text-textPrimary dark:text-textPrimary-dark hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark"
          }`}
        >
          {isRunning ? "Scraping…" : "Run"}
        </button>
        {isRunning && (
          <button
            onClick={() => onStop(s.brand)}
            className="px-6 py-3 font-sans text-[9px] tracking-widest uppercase border border-accentRed text-accentRed hover:bg-accentRed hover:text-white transition-all duration-300"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

function CampaignCard({
  product,
  onToggle,
  isToggling,
  onDelete,
}: {
  product: VideoProduct;
  onToggle: (id: string) => void;
  isToggling: boolean;
  onDelete: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (hovered) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
      vid.currentTime = 0;
    }
  }, [hovered]);

  const videoSrc = resolveVideoSrc(product);
  const poster = resolvePoster(product);
  const isHero = product.isCampaignHero;

  return (
    <div
      className="flex flex-col border border-borderLight dark:border-borderLight-dark bg-bgPrimary dark:bg-bgPrimary-dark overflow-hidden group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-black">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <img
            src={poster}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        )}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-500 pointer-events-none ${hovered ? "opacity-0" : "opacity-20"}`}
        />
        {isHero && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-white z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
        )}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
          {isHero && (
            <span className="font-sans text-[8px] tracking-widest uppercase bg-white text-black px-2 py-1 shadow-md">
              ● Live
            </span>
          )}
          {!videoSrc && (
            <span className="font-sans text-[8px] tracking-widest uppercase border border-white/30 text-white px-2 py-1 bg-black/50 backdrop-blur-sm">
              No video
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex-1">
          <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-0.5">
            {product.brand}{" "}
            {product.department && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                {product.department}
              </>
            )}
          </p>
          <p className="font-heading font-light text-base leading-snug text-textPrimary dark:text-textPrimary-dark line-clamp-2">
            {product.name}
          </p>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="font-heading font-light text-lg leading-none text-textPrimary dark:text-textPrimary-dark">
            {product.price != null
              ? product.price.toLocaleString("tr-TR")
              : "—"}
            <span className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark ml-1">
              {product.currency || ""}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product.id);
              }}
              className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-accentRed transition-colors duration-200"
            >
              Delete
            </button>
            {product.link && (
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-200"
              >
                View ↗
              </a>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggle(product.id)}
          disabled={isToggling}
          className={`w-full py-3 font-sans text-[9px] tracking-widest uppercase border transition-all duration-300 ${isToggling ? "opacity-30 cursor-wait border-borderLight dark:border-borderLight-dark text-textMuted dark:text-textMuted-dark" : isHero ? "border-accentRed text-accentRed hover:bg-accentRed hover:text-white" : "border-textPrimary dark:border-textPrimary-dark text-textPrimary dark:text-textPrimary-dark hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark"}`}
        >
          {isToggling
            ? "Updating…"
            : isHero
              ? "Remove from Homepage"
              : "Add to Homepage"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("overview");
  const [isDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // 👈 Extract token from Redux for authorization headers
  const { token } = useSelector((state: any) => state.auth);

  const [campaignFilter, setCampaignFilter] = useState<
    "all" | "live" | "standard"
  >("all");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // ── Data fetching ──
  const fetchDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // 👈 Added the token header so the backend lets us in!
        const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const json = await res.json();

        // 👈 Defensive mapping: Ensure everything is at least an empty array
        setData({
          kpiData: json.kpiData || [],
          priceDropData: json.priceDropData || [],
          scraperStatus: json.scraperStatus || [],
          watchlistTop: json.watchlistTop || [],
          activityLog: json.activityLog || [],
          videoProducts: json.videoProducts || [],
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!data) return;
    const isRunning = data.scraperStatus?.some((s) => s.status === "running");
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => fetchDashboard(true), 3000);
    }
    return () => clearInterval(interval);
  }, [data, fetchDashboard]);

  // ── Scraper actions ──
  const handleRunScraper = async (brand: string) => {
    const safeBrand = encodeURIComponent(brand);
    setData((prev) =>
      prev
        ? {
            ...prev,
            scraperStatus: prev.scraperStatus.map((s) =>
              s.brand === brand ? { ...s, status: "running" } : s,
            ),
          }
        : prev,
    );
    try {
      await fetch(`${API_BASE}/api/admin/scrape/${safeBrand}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // 👈 Token attached
      });
      fetchDashboard(true);
    } catch (err) {
      console.error(err);
      fetchDashboard(true);
    }
  };

  const handleStopScraper = async (brand: string) => {
    const safeBrand = encodeURIComponent(brand);
    try {
      await fetch(`${API_BASE}/api/admin/scrape/stop/${safeBrand}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // 👈 Token attached
      });
      fetchDashboard(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Campaign toggle ──
  const handleToggleCampaign = async (productId: string) => {
    const prev = data?.videoProducts?.find((p) => p.id === productId);
    if (!prev) return;
    setTogglingIds((ids) => new Set(ids).add(productId));
    setData((d) =>
      d
        ? {
            ...d,
            videoProducts: d.videoProducts.map((p) =>
              p.id === productId
                ? { ...p, isCampaignHero: !p.isCampaignHero }
                : p,
            ),
          }
        : d,
    );

    try {
      await toggleCampaignHeroAPI(productId); // Assuming this uses token internally via interceptor
      fetchDashboard(true);
    } catch (err) {
      console.error("Toggle failed — rolling back:", err);
      setData((d) =>
        d
          ? {
              ...d,
              videoProducts: d.videoProducts.map((p) =>
                p.id === productId
                  ? { ...p, isCampaignHero: prev.isCampaignHero }
                  : p,
              ),
            }
          : d,
      );
    } finally {
      setTogglingIds((ids) => {
        const next = new Set(ids);
        next.delete(productId);
        return next;
      });
    }
  };

  // ── Product Deletion ──
  const handleDeleteProduct = async (productId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this product? This cannot be undone.",
      )
    )
      return;
    setData((d) =>
      d
        ? {
            ...d,
            videoProducts: d.videoProducts.filter((p) => p.id !== productId),
          }
        : d,
    );
    try {
      await fetch(`${API_BASE}/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }, // 👈 Token attached
      });
    } catch (err) {
      console.error("Failed to delete product:", err);
      fetchDashboard(true);
    }
  };

  // ── Derived data ──
  // 👈 Added optional chaining (`?.`) so it won't crash even if videoProducts is somehow undefined
  const liveHeroes = data?.videoProducts?.filter((p) => p.isCampaignHero) ?? [];
  const heroCount = liveHeroes.length;
  const totalVideoProducts = data?.videoProducts?.length ?? 0;

  const filteredCampaign = (data?.videoProducts ?? []).filter((p) => {
    if (campaignFilter === "live") return p.isCampaignHero;
    if (campaignFilter === "standard") return !p.isCampaignHero;
    return true;
  });

  // ── Loading / null guards ──
  if (loading && !data)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bgPrimary dark:bg-bgPrimary-dark">
        <p className="font-sans text-[9px] tracking-widest uppercase">
          Loading...
        </p>
      </div>
    );
  if (!data) return null;

  const t = isDarkMode ? CHART_TOKENS.dark : CHART_TOKENS.light;

  return (
    <div className="flex min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 border-r border-borderLight dark:border-borderLight-dark flex flex-col sticky top-0 h-screen">
        <div className="px-8 py-8 border-b border-borderLight dark:border-borderLight-dark">
          <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1">
            Control Room
          </p>
          <h1 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark">
            Dope
          </h1>
        </div>
        <nav className="flex flex-col px-4 py-6 gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase transition-all duration-200 border ${
                activeNav === item.id
                  ? "border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark"
                  : "border-transparent text-textTertiary dark:text-textTertiary-dark hover:text-textPrimary dark:hover:text-textPrimary-dark"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {heroCount > 0 && (
          <div className="px-8 py-6 border-t border-borderLight dark:border-borderLight-dark">
            <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1">
              Live on Homepage
            </p>
            <p className="font-heading font-light text-3xl leading-none text-textPrimary dark:text-textPrimary-dark">
              {heroCount}
            </p>
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-12 py-10 border-b border-borderLight dark:border-borderLight-dark flex items-baseline justify-between">
          <h2 className="font-heading font-light text-4xl text-textPrimary dark:text-textPrimary-dark">
            {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
          </h2>
          {activeNav === "campaign" && (
            <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
              {heroCount} of {totalVideoProducts} set as hero
            </p>
          )}
        </div>

        <div className="px-12 py-10 flex flex-col gap-12">
          {/* ══════════════════════════════════ OVERVIEW ══════════════════ */}
          {activeNav === "overview" && (
            <>
              {data.kpiData?.length > 0 && (
                <section>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                    {data.kpiData.map((item) => (
                      <KpiCard key={item.label} item={item} />
                    ))}
                  </div>
                </section>
              )}

              <section className="border border-borderLight dark:border-borderLight-dark p-7 flex flex-col gap-6">
                <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark">
                  Price Drops
                </h3>
                <div style={{ width: "100%", height: 200, minHeight: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.priceDropData}
                      margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={t.grid}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 9, fill: t.axis }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: t.axis }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip isDark={isDarkMode} />}
                        cursor={{ stroke: t.grid, strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="drops"
                        stroke={t.area}
                        strokeWidth={1.5}
                        fill={t.area}
                        fillOpacity={0.1}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                <div className="bg-bgPrimary dark:bg-bgPrimary-dark p-6 flex flex-col gap-4">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                    Top Tracked Items
                  </p>
                  <div className="flex flex-col">
                    {data.watchlistTop?.length > 0 ? (
                      data.watchlistTop.map((item, i) => (
                        <WatchlistRow
                          key={`${item.brand}-${item.name}-${i}`}
                          item={item}
                        />
                      ))
                    ) : (
                      <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark py-8">
                        No tracked items yet
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-bgPrimary dark:bg-bgPrimary-dark p-6 flex flex-col gap-4 border-l border-borderLight dark:border-borderLight-dark">
                  <div className="flex items-baseline justify-between">
                    <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                      Live on Homepage
                    </p>
                    {heroCount > 0 && (
                      <button
                        onClick={() => setActiveNav("campaign")}
                        className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-200"
                      >
                        Manage →
                      </button>
                    )}
                  </div>

                  {liveHeroes.length > 0 ? (
                    <div className="flex flex-col">
                      {liveHeroes.map((product) => (
                        <LiveHeroRow
                          key={product.id}
                          product={product}
                          onRemove={handleToggleCampaign}
                          isRemoving={togglingIds.has(product.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-start justify-center gap-3 py-8">
                      <p className="font-heading font-light text-xl text-textPrimary dark:text-textPrimary-dark">
                        No active heroes
                      </p>
                      <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                        Set products in the Campaign tab to feature them here
                      </p>
                      <button
                        onClick={() => setActiveNav("campaign")}
                        className="mt-1 px-5 py-2.5 font-sans text-[9px] tracking-widest uppercase border border-textPrimary dark:border-textPrimary-dark text-textPrimary dark:text-textPrimary-dark hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark transition-all duration-300"
                      >
                        Go to Campaign
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ══════════════════════════════════ SCRAPERS ══════════════════ */}
          {activeNav === "scrapers" && (
            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                {data.scraperStatus?.map((s) => (
                  <ScraperCard
                    key={s.brand}
                    s={s}
                    onRun={handleRunScraper}
                    onStop={handleStopScraper}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════ CAMPAIGN ══════════════════ */}
          {activeNav === "campaign" && (
            <section className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="font-heading font-light text-4xl leading-none text-textPrimary dark:text-textPrimary-dark">
                    {heroCount}
                  </span>
                  <span className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                    / {totalVideoProducts} active as homepage hero
                  </span>
                </div>

                <div className="flex gap-px border border-borderLight dark:bg-borderLight-dark">
                  {(
                    [
                      { key: "all", label: "All" },
                      { key: "live", label: "Live" },
                      { key: "standard", label: "Standard" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setCampaignFilter(key)}
                      className={`px-5 py-2.5 font-sans text-[9px] tracking-widest uppercase transition-all duration-200 ${
                        campaignFilter === key
                          ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark"
                          : "bg-bgPrimary dark:bg-bgPrimary-dark text-textTertiary dark:text-textTertiary-dark hover:text-textPrimary dark:hover:text-textPrimary-dark"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCampaign.length === 0 ? (
                <div className="border border-borderLight dark:border-borderLight-dark p-16 text-center">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                    {campaignFilter === "live"
                      ? "No active heroes — add some below"
                      : "No products match this filter"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                  {filteredCampaign.map((product) => (
                    <CampaignCard
                      key={product.id}
                      product={product}
                      onToggle={handleToggleCampaign}
                      isToggling={togglingIds.has(product.id)}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
