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
const TOKENS = {
  light: {
    tooltipBg: "#ffffff",
    tooltipBorder: "#e8e4dc",
    tooltipPrice: "#1a1a1a",
    tooltipDate: "#a0a0a0",
    line: "#1a1a1a",
    grid: "#e8e4dc",
    axis: "#a0a0a0",
    label: "#a0a0a0",
  },
  dark: {
    tooltipBg: "#1a1a18",
    tooltipBorder: "#5a5754",
    tooltipPrice: "#f0ede6",
    tooltipDate: "#8a8784",
    line: "#f0ede6",
    grid: "#5a5754",
    axis: "#8a8784",
    label: "#8a8784",
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

  // 1. Map existing database history and enforce English locale to fix "nis/may" bug
  const formattedHistory = history.map((p) => ({
    price: p.price,
    date: new Date(p.date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    }),
  }));

  // 2. Smart Deduplication: Keep first, last, and the edges of price changes
  const chartData = formattedHistory.filter((entry, i, arr) => {
    if (i === 0) return true; // Always keep the first entry
    if (i === arr.length - 1) return true; // Always keep the latest entry

    const prev = arr[i - 1];
    const next = arr[i + 1];

    const isPriceChange = entry.price !== prev.price; // Price just dropped/rose
    const isJustBeforeChange = entry.price !== next.price; // Price will drop/rise tomorrow

    return isPriceChange || isJustBeforeChange;
  });

  // 3. Honest Empty State for new products
  // Even with deduplication, if a product only has a flat price, it will keep First + Last = 2 dots.
  if (chartData.length <= 1) {
    return (
      <div>
        <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-4">
          Price History
        </p>
        <div className="h-[140px] flex flex-col items-center justify-center border border-dashed border-borderLight dark:border-borderLight-dark gap-2">
          <p className="font-heading italic text-[15px] font-light text-textMuted dark:text-textMuted-dark">
            Tracking started
          </p>
          <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark opacity-60">
            Check back soon for price movement
          </p>
        </div>
      </div>
    );
  }

  // 4. Scaling
  const dataMax = Math.max(...chartData.map((d) => d.price));
  const dataMin = Math.min(...chartData.map((d) => d.price));
  const absoluteMax = originalPrice
    ? Math.max(dataMax, originalPrice)
    : dataMax;

  return (
    <div>
      <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-4">
        Price History
      </p>

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

            {originalPrice && originalPrice > currentPrice && (
              <ReferenceLine
                y={originalPrice}
                stroke="#b94040"
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
