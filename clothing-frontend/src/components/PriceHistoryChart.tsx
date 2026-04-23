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
  history,
  currentPrice,
  currency,
}: PriceHistoryChartProps) {
  // EXACTLY your old chartData logic (strict history checking)
  const chartData =
    history &&
    history.length > 1 &&
    new Set(history.map((p) => p.price)).size > 1
      ? history.map((p) => ({
          price: p.price,
          date: new Date(p.date).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
          }),
        }))
      : null;

  // If there isn't enough historical data, render nothing at all.
  if (!chartData) return null;

  // EXACTLY your old UI blocks, heights, margins, and the ReferenceLine
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
      <div style={{ width: "100%", height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
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
              domain={[(min: number) => min - 200, (max: number) => max + 200]}
            />
            <ReferenceLine
              y={currentPrice}
              stroke="#b94040"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Line
              type="monotone"
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
