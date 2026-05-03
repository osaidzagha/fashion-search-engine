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
interface DashboardData {
  kpiData: any[];
  priceDropData: any[];
  scraperStatus: any[];
  watchlistTop: any[];
  activityLog: any[];
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

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "scrapers", label: "Scrapers" },
  { id: "analytics", label: "Analytics" },
  { id: "watchlist", label: "Watchlist" },
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

  // TS FIX: Use standard ReturnType for interval
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
              className={`text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase transition-all duration-200 border ${activeNav === item.id ? "border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark" : "border-transparent text-textTertiary dark:text-textTertiary-dark hover:text-textPrimary dark:hover:text-textPrimary-dark"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="px-12 py-10 border-b border-borderLight dark:border-borderLight-dark flex items-baseline justify-between">
          <div>
            <h2 className="font-heading font-light text-4xl text-textPrimary dark:text-textPrimary-dark">
              {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
            </h2>
          </div>
        </div>

        <div className="px-12 py-10 flex flex-col gap-12">
          {activeNav === "overview" && (
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
          )}

          {activeNav === "scrapers" && (
            <section>
              <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark mb-5">
                Scraper Control
              </h3>
              <div className="grid grid-cols-2 gap-px bg-borderLight dark:bg-borderLight-dark border border-borderLight dark:border-borderLight-dark">
                {data.scraperStatus.map((s) => (
                  <div
                    key={s.brand}
                    className="border border-borderLight dark:border-borderLight-dark p-6 flex flex-col gap-5 bg-bgPrimary dark:bg-bgPrimary-dark"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-light text-2xl text-textPrimary dark:text-textPrimary-dark">
                          {s.brand}
                        </h3>
                      </div>
                      <span className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                        {s.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRunScraper(s.brand)}
                        disabled={s.status === "running"}
                        className={`flex-1 py-3 font-sans text-[9px] tracking-widest uppercase border transition-all duration-300 ${s.status === "running" ? "border-borderLight text-textMuted cursor-wait opacity-50" : "border-textPrimary text-textPrimary hover:bg-textPrimary hover:text-bgPrimary"}`}
                      >
                        {s.status === "running" ? "Scraping…" : "Run"}
                      </button>

                      {s.status === "running" && (
                        <button
                          onClick={() => handleStopScraper(s.brand)}
                          className="px-6 py-3 font-sans text-[9px] tracking-widest uppercase border border-accentRed text-accentRed hover:bg-accentRed hover:text-white transition-all duration-300"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
