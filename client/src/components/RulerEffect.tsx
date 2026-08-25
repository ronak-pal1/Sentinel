
const RulerEffect = ({ 
  className = '', 
  width = 'w-17.5',
  height = 'h-screen',
  lineSpacing = 8 
}) => {
  const patternId = `ruler-lines-${lineSpacing}`;

  return (
    <div className={`${width} ${height} border-r border-[#E5E0D8] shrink-0 overflow-hidden ${className}`}>
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
              stroke="#E5E0D8"
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