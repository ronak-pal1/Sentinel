import type { MetricPoint } from "../../lib/types";

type Props = {
  points: MetricPoint[];
  width?: number;
  height?: number;
  className?: string;
  metric?: "latencyMs" | "errorRate";
};

export function MetricsSparkline({
  points,
  width = 160,
  height = 36,
  className = "",
  metric = "latencyMs",
}: Props) {
  if (!points.length) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#D6D0C4"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const values = points.filter((p) => p[metric] !== undefined).map((p) => p[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, metric === "latencyMs" ? 50 : 0.5);
  const pad = 2;

  const coords = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const last = values[values.length - 1];
  const isElevated = metric === "latencyMs" ? last > 1000 : last > 2;
  const stroke = isElevated ? "#C9736B" : "#8FBF9F";
  const areaPath = `M0,${height} L${coords.join(" L")} L${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${metric} sparkline`}
    >
      <path d={areaPath} fill={stroke} opacity={0.12} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(" ")}
        style={{
          strokeDasharray: 400,
          animation: "sentinel-draw 1.2s ease-out forwards",
        }}
      />
      <circle
        cx={width}
        cy={height - pad - ((last - min) / range) * (height - pad * 2)}
        r={2.5}
        fill={stroke}
      />
    </svg>
  );
}
