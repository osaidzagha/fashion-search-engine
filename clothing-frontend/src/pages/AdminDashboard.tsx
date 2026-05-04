import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types & Constants ────────────────────────────────────────────────────────
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
}

interface ActivityEntry {
  time: string;
  brand: string;
  event: string;
  detail: string;
}

interface DashboardData {
  kpiData: KpiItem[];
  priceDropData: PriceDropPoint[];
  scraperStatus: ScraperStatus[];
  watchlistTop: WatchlistItem[];
  activityLog: ActivityEntry[];
}

const CHART_TOKENS = {
  light: {
    grid: "#e8e4dc",
    axis: "#a0a0a0",
    area: "#1a1a1a",
    areaFill: "#1a1a1a",
    tooltip: "#ffffff",
    tooltipBorder: "#e8e4dc",
    tooltipText: "#1a1a1a",
  },
  dark: {
    grid: "#5a5754",
    axis: "#8a8784",
    area: "#f0ede6",
    areaFill: "#f0ede6",
    tooltip: "#1a1a18",
    tooltipBorder: "#5a5754",
    tooltipText: "#f0ede6",
  },
} as const;

// Only "Overview" and "Scrapers" remain — Analytics & Watchlist consolidated
const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "scrapers", label: "Scrapers" },
];

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ─── Subcomponents ────────────────────────────────────────────────────────────

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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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
        className={`font-sans text-[9px] tracking-widest uppercase ${
          item.up
            ? "text-textPrimary dark:text-textPrimary-dark"
            : "text-textMuted dark:text-textMuted-dark"
        }`}
      >
        {item.delta}
      </p>
    </div>
  );
}

// ─── Watchlist Row ────────────────────────────────────────────────────────────

function WatchlistRow({ item }: { item: WatchlistItem }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-borderLight dark:border-borderLight-dark last:border-b-0">
      <div className="flex-shrink-0 w-10 overflow-hidden border border-borderLight dark:border-borderLight-dark group">
        <img
          src={item.image}
          alt={item.name}
          width={40}
          height={50}
          className="w-10 h-[50px] object-cover transition-all duration-300 group-hover:grayscale"
          style={{ display: "block" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark truncate">
          {item.brand}
        </p>
        <p className="font-heading font-light text-base text-textPrimary dark:text-textPrimary-dark leading-tight truncate">
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
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="grid grid-cols-[52px_1fr] gap-x-4 py-3 border-b border-borderLight dark:border-borderLight-dark last:border-b-0">
      <p className="font-sans text-[9px] tracking-wider uppercase text-textMuted dark:text-textMuted-dark leading-tight pt-px">
        {entry.time}
      </p>
      <div>
        <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
          {entry.brand}
          <span className="mx-1.5 opacity-40">·</span>
          {entry.event}
        </p>
        <p className="font-heading font-light text-sm text-textPrimary dark:text-textPrimary-dark leading-snug mt-0.5">
          {entry.detail}
        </p>
      </div>
    </div>
  );
}

// ─── Scraper Card ─────────────────────────────────────────────────────────────

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark">
          {s.brand}
        </h3>
        <span
          className={`font-sans text-[9px] tracking-widest uppercase ${
            isRunning
              ? "text-textPrimary dark:text-textPrimary-dark"
              : s.status === "error"
                ? "text-accentRed"
                : "text-textMuted dark:text-textMuted-dark"
          }`}
        >
          {isRunning ? "● running" : s.status}
        </span>
      </div>

      {/* Data Points Grid */}
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

      {/* Actions */}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("overview");
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!data) return;
    const isRunning = data.scraperStatus.some((s) => s.status === "running");
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        fetchDashboard(true);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [data, fetchDashboard]);

  const handleRunScraper = async (brand: string) => {
    const slug = brand.toLowerCase().replace(" ", "-");
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
      await fetch(`${API_BASE}/api/admin/scrape/${slug}`, { method: "POST" });
      fetchDashboard(true);
    } catch (err) {
      console.error(err);
      fetchDashboard(true);
    }
  };

  const handleStopScraper = async (brand: string) => {
    const slug = brand.toLowerCase().replace(" ", "-");
    try {
      await fetch(`${API_BASE}/api/admin/scrape/stop/${slug}`, {
        method: "POST",
      });
      fetchDashboard(true);
    } catch (err) {
      console.error(err);
    }
  };

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
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Page Header */}
        <div className="px-12 py-10 border-b border-borderLight dark:border-borderLight-dark flex items-baseline justify-between">
          <h2 className="font-heading font-light text-4xl text-textPrimary dark:text-textPrimary-dark">
            {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
          </h2>
        </div>

        <div className="px-12 py-10 flex flex-col gap-12">
          {/* ════════════════════════════════ OVERVIEW ══════════════════════ */}
          {activeNav === "overview" && (
            <>
              {/* KPI Grid */}
              {data.kpiData?.length > 0 && (
                <section>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                    {data.kpiData.map((item) => (
                      <KpiCard key={item.label} item={item} />
                    ))}
                  </div>
                </section>
              )}

              {/* Price Drop Chart */}
              <section className="border border-borderLight dark:border-borderLight-dark p-7 flex flex-col gap-6">
                <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark">
                  Price Drops
                </h3>
                <div style={{ width: "100%", height: 200 }}>
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

              {/* Watchlist Top + Activity Log */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                {/* Left: Top Tracked Items */}
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
                      <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark py-6">
                        No tracked items yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Recent Activity */}
                <div className="bg-bgPrimary dark:bg-bgPrimary-dark p-6 flex flex-col gap-4 border-l border-borderLight dark:border-borderLight-dark">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                    Recent Activity
                  </p>
                  <div className="flex flex-col">
                    {data.activityLog?.length > 0 ? (
                      data.activityLog.map((entry, i) => (
                        <ActivityRow
                          key={`${entry.time}-${entry.event}-${i}`}
                          entry={entry}
                        />
                      ))
                    ) : (
                      <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark py-6">
                        No recent activity
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ════════════════════════════════ SCRAPERS ══════════════════════ */}
          {activeNav === "scrapers" && (
            <section>
              <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark mb-5">
                Scraper Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                {data.scraperStatus.map((s) => (
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
        </div>
      </main>
    </div>
  );
}
