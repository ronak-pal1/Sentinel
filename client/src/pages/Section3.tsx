import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Track = {
  name: string;
  meta: string;
  years: string;
  desc: string;
  leftLabel: string;
  bottomLabel: string;
  accent: string;
};

const tracks: Track[] = [
  {
    name: "Investigate",
    meta: "READ-ONLY",
    years: "ALWAYS FIRST",
    desc: "Logs, metrics, traces — pulled, never mutated, until the cause is certain.",
    leftLabel: "QUERIES",
    bottomLabel: "4 SOURCES · LIVE",
    accent: "#EDA53B",
  },
  {
    name: "Sandbox Verify",
    meta: "ISOLATED",
    years: "EVERY FIX",
    desc: "Candidate fixes run against a cloned system before they ever reach the real one.",
    leftLabel: "REPLAYS",
    bottomLabel: "3 RUNS · DAILY",
    accent: "#8FBF9F",
  },
  {
    name: "Approval Gate",
    meta: "HUMAN",
    years: "NEVER SKIPPED",
    desc: "Nothing irreversible ships without a person reading the diff and clicking approve.",
    leftLabel: "REVIEWS",
    bottomLabel: "1 CLICK · GATED",
    accent: "#C9736B",
  },
];

function IsoTile({ accent, index }: { accent: string; index: number }) {
  return (
    <div className="relative w-full max-w-105 aspect-420/360 flex items-center justify-center mx-auto">
      <svg
        viewBox="0 0 420 360"
        className="w-full h-full overflow-visible"
        style={{ animation: "sentinel-float 5s ease-in-out infinite" }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`top-${index}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--panel-color)" />
            <stop offset="100%" stopColor="var(--surface-color)" />
          </linearGradient>
          <linearGradient id={`side-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--surface-color)" />
            <stop offset="100%" stopColor="var(--border-color)" />
          </linearGradient>
        </defs>

        <polygon
          points="210,120 340,190 210,260 80,190"
          fill={`url(#top-${index})`}
          stroke="var(--card-border)"
          strokeWidth="1"
        />
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const rx = 118 * Math.cos(angle);
          const ry = 58 * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={210 + rx}
              cy={190 + ry}
              r="1.6"
              fill="var(--muted-color)"
              opacity={0.6}
            />
          );
        })}

        {[
          { cx: 210, cy: 150, delay: 0 },
          { cx: 165, cy: 175, delay: 0.4 },
          { cx: 255, cy: 175, delay: 0.8 },
          { cx: 210, cy: 200, delay: 1.2 },
        ].map((b, i) => (
          <g
            key={i}
            style={{
              animation: `sentinel-pulse 3.2s ease-in-out ${b.delay}s infinite`,
              transformOrigin: `${b.cx}px ${b.cy}px`,
            }}
          >
            <polygon
              points={`${b.cx},${b.cy - 26} ${b.cx + 30},${b.cy - 11} ${b.cx},${b.cy + 4} ${b.cx - 30},${b.cy - 11}`}
              fill={i === index % 4 ? accent : "var(--surface-color)"}
              opacity={i === index % 4 ? 0.9 : 1}
              stroke="var(--card-border)"
              strokeWidth="0.75"
            />
            <polygon
              points={`${b.cx},${b.cy + 4} ${b.cx + 30},${b.cy - 11} ${b.cx + 30},${b.cy + 1} ${b.cx},${b.cy + 16}`}
              fill="var(--border-color)"
            />
            <polygon
              points={`${b.cx},${b.cy + 4} ${b.cx - 30},${b.cy - 11} ${b.cx - 30},${b.cy + 1} ${b.cx},${b.cy + 16}`}
              fill="var(--card-border)"
            />
          </g>
        ))}

        <line
          x1="60"
          y1="60"
          x2="130"
          y2="150"
          stroke={accent}
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
      </svg>

      <span className="absolute left-2 top-[35%] text-[10px] font-mono tracking-widest text-(--muted-color)">
        {tracks[index].leftLabel}
      </span>
      <span className="absolute left-4 bottom-4 text-[10px] font-mono tracking-widest text-(--muted-color)">
        {tracks[index].bottomLabel}
      </span>
    </div>
  );
}

const Section3 = () => {
  const [active, setActive] = useState(0);
  const track = tracks[active];

  const go = (dir: 1 | -1) => {
    setActive((prev) => (prev + dir + tracks.length) % tracks.length);
  };

  return (
    <div className="relative w-full py-16 sm:py-24 px-4 sm:px-8 overflow-x-clip">
      <style>{`
        @keyframes sentinel-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes sentinel-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <div className="text-center max-w-3xl mx-auto mt-6">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          <span className="text-(--foreground-color)">Primarily</span>{" "}
          <span className="text-(--muted-color)">focused on</span>
        </h2>
        <p className="mt-8 text-base text-(--muted-color) leading-relaxed">
          One loop, run three different ways, reads before it acts, verifies
          before it ships, and asks before it's irreversible.
        </p>
      </div>

      <div className="mt-16 sm:mt-20 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 md:gap-12">
        <div className="w-full md:w-[min(100%,26.25rem)] shrink-0">
          <IsoTile accent={track.accent} index={active} />
        </div>

        <div className="flex-1 w-full max-w-sm text-center md:text-left">
          <h3 className="text-3xl sm:text-4xl font-semibold text-(--foreground-color)">
            {track.name}
          </h3>
          <p
            className="mt-3 text-[11px] font-mono tracking-widest"
            style={{ color: track.accent }}
          >
            {track.meta} · {track.years}
          </p>
          <p className="mt-6 text-lg text-(--muted-color) leading-relaxed">
            {track.desc}
          </p>

          <div className="mt-10 flex gap-3 justify-center md:justify-start">
            <button
              type="button"
              onClick={() => go(-1)}
              className="w-11 h-11 flex items-center justify-center bg-(--surface-color) border border-(--border-color) hover:border-(--muted-color) transition-colors"
              aria-label="Previous track"
            >
              <FiChevronLeft className="text-(--foreground-color)" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="w-11 h-11 flex items-center justify-center bg-(--panel-color) border border-(--border-color) hover:border-(--muted-color) transition-colors"
              aria-label="Next track"
            >
              <FiChevronRight className="text-(--muted-color)" />
            </button>
          </div>

          <div className="mt-6 flex gap-1.5 justify-center md:justify-start">
            {tracks.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to ${t.name}`}
                className="h-1 transition-all"
                style={{
                  width: i === active ? 24 : 10,
                  backgroundColor:
                    i === active ? track.accent : "var(--border-color)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section3;
