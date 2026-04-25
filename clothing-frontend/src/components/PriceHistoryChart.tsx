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

interface PriceHistoryChartProps {
  history?: PriceHistoryEntry[];
  currentPrice: number;
  originalPrice?: number; // 👈 ADDED THIS
  currency: string;
}

// EXACTLY your old Tooltip
const PriceTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#1a1a1a",
          padding: "8px 12px",
          borderRadius: "2px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#fff",
            margin: 0,
          }}
        >
          {payload[0].value.toLocaleString("tr-TR")} {currency}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            color: "#888",
            margin: "2px 0 0",
          }}
        >
          {label}
        </p>
      </div>
    );
  }
  return null;
};

export default function PriceHistoryChart({
  history = [],
  currentPrice,
  originalPrice,
  currency,
}: PriceHistoryChartProps) {
  // 1. Build the base chart data
  let chartData = history.map((p) => ({
    price: p.price,
    date: new Date(p.date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    }),
  }));

  // 2. THE FIX: If there is only 1 day of history, fake a data point from 7 days ago
  // so the line chart actually has a line to draw!
  if (chartData.length <= 1) {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    chartData = [
      {
        price: currentPrice,
        date: lastWeek.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        }),
      },
      {
        price: currentPrice,
        date: today.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        }),
      },
    ];
  }

  // 3. Dynamic Y-Axis calculation so the Original Price doesn't get cut off the top of the chart
  const dataMax = Math.max(...chartData.map((d) => d.price));
  const dataMin = Math.min(...chartData.map((d) => d.price));
  const absoluteMax = originalPrice
    ? Math.max(dataMax, originalPrice)
    : dataMax;

  return (
    <div style={{ marginBottom: "32px" }}>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#aaa",
          marginBottom: "12px",
        }}
      >
        Price history
      </p>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e8e4dc"
            />
            <XAxis
              dataKey="date"
              tick={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fill: "#bbb",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              // Expand the domain so the red line fits perfectly
              domain={[dataMin * 0.9, absoluteMax * 1.1]}
            />

            {/* 👇 Shows the Retail Price as a red dotted line if it's on sale */}
            {originalPrice && originalPrice > currentPrice && (
              <ReferenceLine
                y={originalPrice}
                stroke="#b94040"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  position: "insideTopLeft",
                  value: "Retail",
                  fill: "#b94040",
                  fontSize: 9,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            )}

            <Line
              type="stepAfter" // Switched to stepAfter to make it look like a real price tracker
              dataKey="price"
              stroke="#1a1a1a"
              strokeWidth={1.5}
              dot={{ r: 2, fill: "#1a1a1a" }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Tooltip content={<PriceTooltip currency={currency} />} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          height: "1px",
          background: "#e8e4dc",
          marginTop: "24px",
          marginBottom: "32px",
        }}
      />
    </div>
  );
}
