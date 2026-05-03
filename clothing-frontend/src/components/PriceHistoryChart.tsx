import React from "react";
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  YAxis,
  XAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface PriceHistoryEntry {
  price: number;
  date: string | Date;
}

export interface PriceHistoryChartProps {
  history?: PriceHistoryEntry[];
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  theme?: "light" | "dark";
}

// ─── Token map — exact hex values from tailwind.config.js ─────────────────────
// Recharts renders outside normal React flow so it can't use Tailwind classes.
// We use the raw token values directly to stay consistent with the design system.
const TOKENS = {
  light: {
    tooltipBg: "#ffffff", // bgSecondary.DEFAULT
    tooltipBorder: "#e8e4dc", // borderLight.DEFAULT
    tooltipPrice: "#1a1a1a", // textPrimary.DEFAULT
    tooltipDate: "#a0a0a0", // textMuted.DEFAULT
    line: "#1a1a1a", // textPrimary.DEFAULT
    grid: "#e8e4dc", // borderLight.DEFAULT
    axis: "#a0a0a0", // textMuted.DEFAULT
    label: "#a0a0a0", // textMuted.DEFAULT
  },
  dark: {
    tooltipBg: "#1a1a18", // bgSecondary.dark
    tooltipBorder: "#5a5754", // borderLight.dark
    tooltipPrice: "#f0ede6", // textPrimary.dark
    tooltipDate: "#8a8784", // textMuted.dark
    line: "#f0ede6", // textPrimary.dark
    grid: "#5a5754", // borderLight.dark
    axis: "#8a8784", // textMuted.dark
    label: "#8a8784", // textMuted.dark
  },
} as const;

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const PriceTooltip = ({ active, payload, label, currency, theme }: any) => {
  if (!active || !payload?.length) return null;
  const t = TOKENS[theme as "light" | "dark"] ?? TOKENS.light;

  return (
    <div
      style={{
        background: t.tooltipBg,
        border: `1px solid ${t.tooltipBorder}`,
        padding: "10px 14px",
        boxShadow: theme === "dark" ? "none" : "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "18px",
          color: t.tooltipPrice,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {payload[0].value.toLocaleString("tr-TR")} {currency}
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "8px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: t.tooltipDate,
          margin: "6px 0 0",
        }}
      >
        {label}
      </p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function PriceHistoryChart({
  history = [],
  currentPrice,
  originalPrice,
  currency,
  theme = "light",
}: PriceHistoryChartProps) {
  const t = TOKENS[theme] ?? TOKENS.light;

  // 1. Map existing database history
  let chartData = history.map((p) => ({
    price: p.price,
    date: new Date(p.date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    }),
  }));

  // 2. "Day 1 Illusion" for brand-new scraped items
  if (chartData.length <= 1) {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = today.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
    const lastWeekStr = lastWeek.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });

    if (originalPrice && originalPrice > currentPrice) {
      // On sale — draw a downward slope
      chartData = [
        { price: originalPrice, date: lastWeekStr },
        { price: currentPrice, date: todayStr },
      ];
    } else {
      // Stable — flat line
      chartData = [
        { price: currentPrice, date: lastWeekStr },
        { price: currentPrice, date: todayStr },
      ];
    }
  }

  // 3. Scaling
  const dataMax = Math.max(...chartData.map((d) => d.price));
  const dataMin = Math.min(...chartData.map((d) => d.price));
  const absoluteMax = originalPrice
    ? Math.max(dataMax, originalPrice)
    : dataMax;

  return (
    // Outer wrapper uses Tailwind — this IS in normal React flow
    <div>
      <p className="font-sans text-[8px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-4">
        Price History
      </p>

      {/* Chart container — inline style required: Recharts needs explicit px height */}
      <div style={{ width: "100%", height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={t.grid}
            />

            <XAxis
              dataKey="date"
              tick={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fill: t.axis,
              }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />

            <YAxis hide domain={[dataMin * 0.95, absoluteMax * 1.05]} />

            {/* Red "Retail" ceiling line */}
            {originalPrice && originalPrice > currentPrice && (
              <ReferenceLine
                y={originalPrice}
                stroke="#b94040" // accentRed — same token, no dark variant
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  position: "insideTopLeft",
                  value: "RETAIL",
                  fill: "#b94040",
                  fontSize: 8,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.1em",
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="price"
              stroke={t.line}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: t.line, strokeWidth: 0 }}
              isAnimationActive={false}
            />

            <Tooltip
              content={<PriceTooltip currency={currency} theme={theme} />}
              cursor={{ stroke: t.grid, strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
