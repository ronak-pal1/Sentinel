import { useEffect, useMemo, useRef, useState } from "react";

const POINT_COUNT = 80;
const WIDTH = 1000;
const HEIGHT = 120;

const COLORS = {
  latency: "#8FBF9F",
  error: "#C9736B",
  accent: "#EDA53B",
} as const;

type Props = {
  className?: string;
  density?: "hero" | "footer";
};

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildStaticSeries(): { latency: number[]; error: number[] } {
  const latency: number[] = [];
  const error: number[] = [];

  for (let i = 0; i < POINT_COUNT; i++) {
    const t = i / POINT_COUNT;
    const spike = Math.exp(-Math.pow((t - 0.72) / 0.06, 2)) * 0.55;
    latency.push(0.38 + seededNoise(i * 1.7) * 0.08 + spike * 0.12);
    error.push(0.12 + seededNoise(i * 2.3 + 10) * 0.06 + spike);
  }

  return { latency, error };
}

function seriesToPath(
  values: number[],
  min: number,
  max: number,
  topPad: number,
  bottomPad: number,
): string {
  const range = Math.max(max - min, 0.001);
  const plotHeight = HEIGHT - topPad - bottomPad;

  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * WIDTH;
      const y = topPad + (1 - (v - min) / range) * plotHeight;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function seriesToArea(
  values: number[],
  min: number,
  max: number,
  topPad: number,
  bottomPad: number,
): string {
  const line = seriesToPath(values, min, max, topPad, bottomPad);
  return `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;
}

function lastPoint(
  values: number[],
  min: number,
  max: number,
  topPad: number,
  bottomPad: number,
): { x: number; y: number } {
  const range = Math.max(max - min, 0.001);
  const plotHeight = HEIGHT - topPad - bottomPad;
  const last = values[values.length - 1] ?? min;
  return {
    x: WIDTH,
    y: topPad + (1 - (last - min) / range) * plotHeight,
  };
}

export default function MonitoringGraphSimulation({
  className = "h-30",
  density = "hero",
}: Props) {
  const tickRef = useRef(0);
  const [tick, setTick] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const staticSeries = useMemo(() => buildStaticSeries(), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let raf = 0;
    let last = 0;

    const step = (now: number) => {
      if (now - last >= 70) {
        last = now;
        tickRef.current += 1;
        setTick(tickRef.current);
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const { latency, error } = useMemo(() => {
    if (reducedMotion) return staticSeries;

    const latency: number[] = [];
    const error: number[] = [];

    for (let i = 0; i < POINT_COUNT; i++) {
      const phase = (i + tick) * 0.11;
      const wave = Math.sin(phase) * 0.04 + Math.sin(phase * 0.37) * 0.02;
      const spikePhase = ((tick + i * 0.4) % 140) / 140;
      const spike =
        spikePhase > 0.55 && spikePhase < 0.78
          ? Math.sin(((spikePhase - 0.55) / 0.23) * Math.PI) * 0.65
          : 0;

      latency.push(0.36 + wave + seededNoise(i + tick * 0.3) * 0.05);
      error.push(
        0.1 +
          seededNoise(i * 1.9 + tick * 0.2) * 0.05 +
          spike * (0.55 + seededNoise(tick + i) * 0.15),
      );
    }

    return { latency, error };
  }, [reducedMotion, staticSeries, tick]);

  const topPad = density === "hero" ? 28 : 22;
  const bottomPad = 12;

  const latencyMin = 0.2;
  const latencyMax = 0.55;
  const errorMin = 0;
  const errorMax = 0.85;

  const latencyPath = seriesToPath(latency, latencyMin, latencyMax, topPad, bottomPad);
  const errorPath = seriesToPath(error, errorMin, errorMax, topPad, bottomPad);
  const latencyArea = seriesToArea(latency, latencyMin, latencyMax, topPad, bottomPad);
  const errorArea = seriesToArea(error, errorMin, errorMax, topPad, bottomPad);

  const latencyEnd = lastPoint(latency, latencyMin, latencyMax, topPad, bottomPad);
  const errorEnd = lastPoint(error, errorMin, errorMax, topPad, bottomPad);

  const labelSize = density === "hero" ? "10" : "9";

  return (
    <div
      className={`relative w-full overflow-hidden bg-(--surface-color) border border-(--border-color) ${className}`}
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="latency-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.latency} stopOpacity={0.22} />
            <stop offset="100%" stopColor={COLORS.latency} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="error-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.error} stopOpacity={0.18} />
            <stop offset="100%" stopColor={COLORS.error} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="scan-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0} />
            <stop offset="50%" stopColor={COLORS.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
          </linearGradient>
        </defs>

        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={topPad + ((HEIGHT - topPad - bottomPad) / 4) * i}
            x2={WIDTH}
            y2={topPad + ((HEIGHT - topPad - bottomPad) / 4) * i}
            stroke="var(--border-color)"
            strokeWidth={0.75}
            opacity={0.55}
          />
        ))}

        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={(WIDTH / 11) * i}
            y1={topPad}
            x2={(WIDTH / 11) * i}
            y2={HEIGHT - bottomPad}
            stroke="var(--border-color)"
            strokeWidth={0.5}
            opacity={0.25}
          />
        ))}

        <path d={latencyArea} fill="url(#latency-fill)" />
        <path d={errorArea} fill="url(#error-fill)" />

        <path
          d={latencyPath}
          fill="none"
          stroke={COLORS.latency}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={errorPath}
          fill="none"
          stroke={COLORS.error}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.9}
        />

        {!reducedMotion && (
          <rect
            x={0}
            y={topPad}
            width={WIDTH * 0.08}
            height={HEIGHT - topPad - bottomPad}
            fill="url(#scan-gradient)"
            style={{ animation: "sentinel-scan 4s linear infinite" }}
          />
        )}

        <circle
          cx={latencyEnd.x}
          cy={latencyEnd.y}
          r={3}
          fill={COLORS.latency}
          style={
            reducedMotion
              ? undefined
              : { animation: "sentinel-live-pulse 1.6s ease-in-out infinite" }
          }
        />
        <circle
          cx={errorEnd.x}
          cy={errorEnd.y}
          r={2.5}
          fill={COLORS.error}
          style={
            reducedMotion
              ? undefined
              : {
                  animation: "sentinel-live-pulse 1.6s ease-in-out infinite 0.4s",
                }
          }
        />
      </svg>

      <div
        className="absolute inset-0 flex items-start justify-between px-3 pt-2 pointer-events-none"
        style={{ fontSize: `${labelSize}px` }}
      >
        <div className="flex gap-4 font-mono tracking-widest text-(--muted-color) uppercase">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: COLORS.latency }}
            />
            p99 latency
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: COLORS.error }}
            />
            error rate
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-mono tracking-widest text-(--muted-color) uppercase">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-primary"
            style={
              reducedMotion
                ? undefined
                : { animation: "sentinel-live-pulse 1.2s ease-in-out infinite" }
            }
          />
          live
        </span>
      </div>
    </div>
  );
}
