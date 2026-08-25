const Hero = () => {
    return (
      <div className="w-full h-fit  text-[#1A1A1A] flex flex-col justify-between px-8 pt-26 font-sans">
        {/* Top Main Section */}
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Headline */}
          <div className="lg:col-span-6">
            <h1 className="text-5xl tracking-tight font-medium leading-[1.1]">
              I watch your systems, catch failures, and fix them, <br className="hidden md:inline" />
              <span className="text-[#8C857B]">with a human in the loop</span>
            </h1>
          </div>
  
          {/* Right Description & Action Buttons */}
          <div className="lg:col-span-6 flex flex-col items-start gap-8 pt-2">
            <p className="text-lg text-[#6B655B] font-normal leading-relaxed">
                Built on TrueForge, an open-source agent harness. Reads logs and metrics read-only, diagnoses the root cause, and pauses for approval before any rollback, restart, or merge.
            </p>
  
            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#work"
                className="bg-primary hover:bg-[#e0a240] text-black font-medium px-6 py-3.5 rounded-none flex items-center gap-2 transition-colors duration-200 text-sm"
              >
                Start Monitoring
                <span className="text-base">↗</span>
              </a>
              <a
                href="#about"
                className="bg-transparent border border-[#D9D4C7] hover:border-black text-black font-medium px-6 py-3.5 rounded-none flex items-center gap-2 transition-colors duration-200 text-sm"
              >
                View on GitHub
                <span className="text-base">↗</span>
              </a>
            </div>
          </div>
        </div>
  
        {/* Bottom Footer Line / Next Projects Banner */}
        <div className="w-full pt-16">
          <div className="flex justify-between items-baseline mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-primary font-mono">10</span>
              <h2 className="text-xl font-semibold text-black">Sentinel</h2>
              <span className="text-sm text-[#8C857B]">Incident Response Agent</span>
            </div>
            <span className="text-xs tracking-widest text-[#A39E93] uppercase font-medium">
               BUILT WITH TRUEFORGE
            </span>
          </div>
  
          {/* Illustration Container */}
          <div className="w-full pt-1 overflow-hidden">
            {/* Replace src with your actual cityscape graphic asset */}
            <div className="w-full h-30 bg-slate-300">

            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default Hero;