import { Link } from "react-router-dom";
import MonitoringGraphSimulation from "./MonitoringGraphSimulation";

const GITHUB_URL = "https://github.com/ronak-pal1/Sentinel";

const Hero = () => {
  return (
    <div className="w-full h-fit text-(--foreground-color) flex flex-col justify-between px-4 sm:px-8 pt-16 sm:pt-26 font-sans">
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
        <div className="lg:col-span-6">
          <h1 className="text-3xl sm:text-5xl tracking-tight font-medium leading-[1.1]">
            I watch your systems, catch failures, and fix them,{" "}
            <br className="hidden md:inline" />
            <span className="text-(--muted-color)">
              with a human in the loop
            </span>
          </h1>
        </div>

        <div className="lg:col-span-6 flex flex-col items-start gap-8 pt-2">
          <p className="text-base sm:text-lg text-(--muted-color) font-normal leading-relaxed">
            Built on TrueForge, an open-source agent harness. Reads logs and
            metrics read-only, diagnoses the root cause, and pauses for approval
            before any rollback, restart, or merge.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/app"
              className="bg-primary hover:bg-[#e0a240] text-black font-medium px-6 py-3.5 rounded-none flex items-center gap-2 transition-colors duration-200 text-sm"
            >
              Start Monitoring
              <span className="text-base">↗</span>
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-transparent border border-(--border-color) hover:border-(--foreground-color) text-(--foreground-color) font-medium px-6 py-3.5 rounded-none flex items-center gap-2 transition-colors duration-200 text-sm"
            >
              View on GitHub
              <span className="text-base">↗</span>
            </a>
          </div>
        </div>
      </div>

      <div className="w-full pt-12 sm:pt-16">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-2 mb-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs text-primary font-mono">10</span>
            <h2 className="text-xl font-semibold text-(--foreground-color)">
              Sentinel
            </h2>
            <span className="text-sm text-(--muted-color)">
              Incident Response Agent
            </span>
          </div>
          <span className="text-xs tracking-widest text-(--muted-color) uppercase font-medium">
            BUILT WITH TRUEFORGE
          </span>
        </div>

        <div className="w-full pt-1 overflow-hidden">
          <MonitoringGraphSimulation className="h-30" density="hero" />
        </div>
      </div>
    </div>
  );
};

export default Hero;
