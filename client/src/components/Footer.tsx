import RulerEffect from "./RulerEffect";

const Footer = () => {
  const sitemapLinks = ["Welcome", "Work", "AI", "Profile"];

  const elsewhereLinks = [
    { name: "Awwwards", href: "#" },
    { name: "Dribbble", href: "#" },
    { name: "LinkedIn", href: "#" },
    { name: "ThemeForest", href: "#" },
  ];

  return (
    <footer className="w-full text-[#1A1A1A] font-sans px-8 pb-8  relative">
      <div className="w-full absolute left-0 -z-10">
        <RulerEffect width="w-full" />
      </div>

      <div className="pt-16 flex flex-col items-center">
        {/* 1. Central CTA Button */}
        <a
          href="#portfolio"
          className="bg-primary hover:bg-[#e0a240] text-black font-medium px-8 py-4 flex items-center gap-2 transition-colors duration-200 mb-12"
        >
          Explore Product
          <span className="text-lg">↗</span>
        </a>

        {/* 2. Item Tag Header */}
        <div className="flex items-baseline mb-6">
          <h3 className="text-xl font-medium text-black">GitHub</h3>
        </div>

        {/* 3. Tech Stack Diagram / Illustration Section */}
        <div className="w-full max-w-7xl relative mb-2 overflow-hidden">
          {/* Replace src with your actual circuit/tech stack illustration asset */}
          <div className="w-full h-25 bg-slate-300"></div>
        </div>

        {/* 4. Main 4-Column Footer Navigation */}
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 py-6 border-t border-black/50">
          {/* Column 2: Sitemap */}
          <div className="flex flex-col gap-3">
            <span className="text-xs tracking-widest text-[#A39E93] uppercase font-medium mb-2">
              Sitemap
            </span>
            {sitemapLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[#6B655B] hover:text-black text-base transition-colors w-max"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Column 3: Elsewhere */}
          <div className="flex flex-col gap-3">
            <span className="text-xs tracking-widest text-[#A39E93] uppercase font-medium mb-2">
              Elsewhere
            </span>
            {elsewhereLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[#6B655B] hover:text-black text-base flex items-center gap-1 transition-colors w-max"
              >
                {link.name} <span className="text-xs">↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* 5. Bottom Bar */}
        <div className="w-full max-w-7xl pt-8 border-t border-black/50 flex flex-col md:flex-row justify-between items-center text-xs tracking-widest text-[#A39E93] uppercase">
          <p>© 2026 Sentinel : ALL RIGHTS RESERVED</p>
          <a
            href="#privacy"
            className="hover:text-black transition-colors mt-2 md:mt-0"
          >
            PRIVACY
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
