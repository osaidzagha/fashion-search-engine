// Tiny SVG sparkline — shows price movement trend on product cards
interface SparklineProps {
  data: { price: number; date: string }[];
  width?: number;
  height?: number;
}

const FALLBACK_CLS =
  "font-sans text-[8px] tracking-widest uppercase text-textMuted/40 dark:text-textMuted-dark/40";

export function PriceSparkline({ data, width = 60, height = 18 }: SparklineProps) {
  if (!data || data.length < 2) {
    return <span className={FALLBACK_CLS}>Tracking…</span>;
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Flat line — price has never changed — show "STABLE" instead of a fake line
  if (max === min) {
    return <span className={FALLBACK_CLS}>Stable</span>;
  }

  const range = max - min;

  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = prices[prices.length - 1];
  const first = prices[0];
  const strokeColor =
    last < first ? "#4ade80" : last > first ? "#f87171" : "currentColor";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="opacity-60"
    >
      <polyline
        points={points}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
