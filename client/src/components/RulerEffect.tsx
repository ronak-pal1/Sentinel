type RulerEffectProps = {
  className?: string;
  width?: string;
  height?: string;
  lineSpacing?: number;
  variant?: "sidebar" | "background";
};

const RulerEffect = ({
  className = "",
  width = "w-17.5",
  height = "h-screen",
  lineSpacing = 8,
  variant = "sidebar",
}: RulerEffectProps) => {
  if (variant === "background") {
    return (
      <div
        className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent ${lineSpacing - 1}px,
            var(--border-color) ${lineSpacing - 1}px,
            var(--border-color) ${lineSpacing}px
          )`,
        }}
        aria-hidden
      />
    );
  }

  const patternId = `ruler-lines-${lineSpacing}`;

  return (
    <div
      className={`${width} ${height} border-r border-(--border-color) shrink-0 overflow-hidden ${className}`}
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={patternId}
            width="100%"
            height={lineSpacing}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1={lineSpacing - 0.5}
              x2="100%"
              y2={lineSpacing - 0.5}
              stroke="var(--border-color)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};

export default RulerEffect;
