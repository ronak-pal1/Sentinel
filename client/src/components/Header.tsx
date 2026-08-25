const Header = () => {
    const navItems = [
      { name: 'Welcome', href: '#', active: true },
      { name: 'Profile', href: '#', active: false },
    ];
  
    return (
      <header className="w-full h-20 px-8 flex items-center justify-between border-b border-[#E5E0D8]">
        {/* Brand Logo */}
        <a href="#" className="text-2xl font-bold tracking-tight text-[#1A1A1A] font-sans">
          Sentinel
        </a>
  
        {/* Navigation & Actions */}
        <div className="flex items-center gap-8 md:gap-10">
          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="relative text-base font-medium text-[#1A1A1A] hover:text-black transition-colors py-1"
              >
                {item.name}
                {/* Active Dot Indicator */}
                {item.active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </a>
            ))}
          </nav>
  
          {/* Contrast / Theme Toggle Icon */}
          <button
            type="button"
            aria-label="Toggle Theme"
            className="text-[#1A1A1A] hover:opacity-75 transition-opacity p-1"
          >
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 010-16zM12 4v16a8 8 0 000-16z" />
            </svg>
          </button>
  
          {/* Contact CTA Button */}
          <a
            href="#contact"
            className="bg-primary hover:bg-[#e0a240] text-black font-medium px-6 py-2.5 transition-colors duration-200 text-sm"
          >
            Dashboard
          </a>
        </div>
      </header>
    );
  };
  
  export default Header;