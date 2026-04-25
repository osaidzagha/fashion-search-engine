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

// ─── TOOLTIP AESTHETIC MATCHED TO PRODUCT DETAILS ──────────────────────────
const PriceTooltip = ({ active, payload, label, currency, theme }: any) => {
  if (active && payload && payload.length) {
    const isDark = theme === "dark";
    return (
      <div
        style={{
          background: isDark ? "#0f0f0d" : "#fff",
          border: `1px solid ${isDark ? "#2e2e2c" : "#e8e4dc"}`,
          padding: "10px 14px",
          boxShadow: isDark ? "none" : "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "18px",
            color: isDark ? "#f0ede6" : "#1a1a1a",
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
            color: isDark ? "#5a5754" : "#aaa",
            margin: "6px 0 0",
          }}
        >
          {label}
        </p>
      </div>
    );
  }
  return null;
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function PriceHistoryChart({
  history = [],
  currentPrice,
  originalPrice,
  currency,
  theme = "light",
}: PriceHistoryChartProps) {
  // 1. Map existing database history
  let chartData = history.map((p) => ({
    price: p.price,
    date: new Date(p.date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    }),
  }));

  // 2. "Day 1 Illusion" for brand new scraped items
  if (chartData.length <= 1) {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateTodayStr = today.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
    const dateLastWeekStr = lastWeek.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });

    if (originalPrice && originalPrice > currentPrice) {
      // Scenario A: New item, ON SALE (Draws downward slope)
      chartData = [
        { price: originalPrice, date: dateLastWeekStr },
        { price: currentPrice, date: dateTodayStr },
      ];
    } else {
      // Scenario B: New item, NO SALE (Draws flat stable line)
      chartData = [
        { price: currentPrice, date: dateLastWeekStr },
        { price: currentPrice, date: dateTodayStr },
      ];
    }
  }

  // 3. Scaling Math
  const dataMax = Math.max(...chartData.map((d) => d.price));
  const dataMin = Math.min(...chartData.map((d) => d.price));
  const absoluteMax = originalPrice
    ? Math.max(dataMax, originalPrice)
    : dataMax;

  // 4. Dynamic Theme Variables
  const lineColor = theme === "dark" ? "#f0ede6" : "#1a1a1a";
  const gridColor = theme === "dark" ? "#1e1e1c" : "#e8e4dc";
  const textColor = theme === "dark" ? "#5a5754" : "#aaa";

  return (
    <div>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "8px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: theme === "dark" ? "#3a3734" : "#aaa",
          margin: "0 0 16px",
        }}
      >
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
              stroke={gridColor}
            />
            <XAxis
              dataKey="date"
              tick={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fill: textColor,
              }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis hide domain={[dataMin * 0.95, absoluteMax * 1.05]} />

            {/* The Red "Retail" Ceiling Line */}
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
              stroke={lineColor}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Tooltip
              content={<PriceTooltip currency={currency} theme={theme} />}
              cursor={{ stroke: gridColor, strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
