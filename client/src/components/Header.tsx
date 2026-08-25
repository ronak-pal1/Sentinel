import { useLayoutEffect, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

const THEME_KEY = "sentinel-theme";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const navItems = [
  { name: "Welcome", id: "welcome", match: "#welcome" },
  { name: "Incident", id: "incident", match: "#incident" },
  { name: "Capabilities", id: "capabilities", match: "#capabilities" },
];

const Header = () => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = readTheme();
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", initial);
    }
    return initial;
  });

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    if (pathname !== "/") return;
    const id = hash.replace("#", "") || "welcome";
    requestAnimationFrame(() => scrollToSection(id));
  }, [pathname, hash]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isActive = (match: string) => {
    if (pathname !== "/") return false;
    if (match === "#welcome") return !hash || hash === "#welcome";
    return hash === match;
  };

  const goToSection = (e: MouseEvent, id: string) => {
    e.preventDefault();
    setMenuOpen(false);
    if (pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    navigate(`/#${id}`, { replace: true });
    scrollToSection(id);
  };

  return (
    <header className="w-full border-b border-(--border-color) bg-(--background-color)">
      <div className="h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between gap-3">
        <Link
          to="/#welcome"
          onClick={(e) => goToSection(e, "welcome")}
          className="text-xl sm:text-2xl font-bold tracking-tight text-(--foreground-color) font-sans shrink-0"
        >
          Sentinel
        </Link>

        <div className="flex items-center gap-3 sm:gap-6 md:gap-10">
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={`/#${item.id}`}
                onClick={(e) => goToSection(e, item.id)}
                className="relative text-base font-medium text-(--foreground-color) hover:opacity-80 transition-opacity py-1"
              >
                {item.name}
                {isActive(item.match) && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </a>
            ))}
          </nav>

          <button
            type="button"
            aria-label={
              theme === "light" ? "Switch to dark theme" : "Switch to light theme"
            }
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
            className="text-(--foreground-color) hover:opacity-75 transition-opacity p-1"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 010-16zM12 4v16a8 8 0 000-16z" />
            </svg>
          </button>

          <Link
            to="/app"
            className="bg-primary hover:bg-[#e0a240] text-black font-medium px-4 sm:px-6 py-2 sm:py-2.5 transition-colors duration-200 text-sm"
          >
            Dashboard
          </Link>

          <button
            type="button"
            className="md:hidden text-(--foreground-color) p-1"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-(--border-color) px-4 py-3 flex flex-col gap-1 bg-(--background-color)">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={`/#${item.id}`}
              onClick={(e) => goToSection(e, item.id)}
              className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.match)
                  ? "text-(--foreground-color) bg-(--surface-color)"
                  : "text-(--muted-color) hover:text-(--foreground-color)"
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
