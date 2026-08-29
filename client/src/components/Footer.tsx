import { Link } from "react-router-dom";
import MonitoringGraphSimulation from "./MonitoringGraphSimulation";
import RulerEffect from "./RulerEffect";

const GITHUB_URL = "https://github.com/ronak-pal1/Sentinel";

const Footer = () => {
  const sitemapLinks = [
    { name: "Welcome", href: "/#welcome" },
    { name: "Incident", href: "/#incident" },
    { name: "Capabilities", href: "/#capabilities" },
    { name: "Dashboard", href: "/app" },
  ];

  const elsewhereLinks = [
    { name: "GitHub", href: GITHUB_URL },
    {
      name: "TrueForge",
      href: "https://github.com/topics/trueforge",
    },
    {
      name: "License",
      href: `${GITHUB_URL}/blob/main/LICENSE`,
    },
  ];

  return (
    <footer className="text-(--foreground-color) font-sans px-4 sm:px-8 pb-8 relative isolate overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
        <RulerEffect variant="background" width="w-full" height="h-full" />
      </div>

      <div className="relative z-10 pt-16 flex flex-col items-center">
        <Link
          to="/app"
          className="bg-primary hover:bg-[#e0a240] text-black font-medium px-8 py-4 flex items-center gap-2 transition-colors duration-200 mb-12"
        >
          Explore Product
          <span className="text-lg">↗</span>
        </Link>

        <div className="flex items-baseline mb-6">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-medium text-(--foreground-color) hover:opacity-80"
          >
            GitHub
          </a>
        </div>

        <div className="w-full max-w-7xl relative mb-2 overflow-hidden">
          <MonitoringGraphSimulation className="h-25" density="footer" />
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 py-6 border-t border-(--border-color)">
          <div className="flex flex-col gap-3">
            <span className="text-xs tracking-widest text-(--muted-color) uppercase font-medium mb-2">
              Sitemap
            </span>
            {sitemapLinks.map((item) =>
              item.href.startsWith("/app") ? (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-(--muted-color) hover:text-(--foreground-color) text-base transition-colors w-max"
                >
                  {item.name}
                </Link>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-(--muted-color) hover:text-(--foreground-color) text-base transition-colors w-max"
                >
                  {item.name}
                </a>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs tracking-widest text-(--muted-color) uppercase font-medium mb-2">
              Elsewhere
            </span>
            {elsewhereLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--muted-color) hover:text-(--foreground-color) text-base flex items-center gap-1 transition-colors w-max"
              >
                {link.name} <span className="text-xs">↗</span>
              </a>
            ))}
          </div>
        </div>

        <div
          id="privacy"
          className="w-full max-w-7xl pt-8 border-t border-(--border-color) flex flex-col md:flex-row justify-between items-center text-xs tracking-widest text-(--muted-color) uppercase scroll-mt-24"
        >
          <p>© 2026 Sentinel : ALL RIGHTS RESERVED</p>
          <a
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-(--foreground-color) transition-colors mt-2 md:mt-0"
          >
            PRIVACY
          </a>
        </div>
      </div>

      
    </footer>
  );
};

export default Footer;
