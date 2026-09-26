import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, Menu, X } from 'lucide-react';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import { ThemeToggle } from '../common/ThemeToggle';
import { MobileNav } from './MobileNav';
import { PUBLIC_NAV_ITEMS } from './nav';

interface PublicSaaSHeaderProps {
  onOpenSignIn: () => void;
  onOpenRequestAccess: () => void;
  onLaunchDemo: () => void;
}

export const PublicSaaSHeader: React.FC<PublicSaaSHeaderProps> = ({
  onOpenSignIn,
  onOpenRequestAccess,
  onLaunchDemo,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [toolbarOffset, setToolbarOffset] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);

  // Scroll-aware blur: pin the header and blur it once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep the header pinned just below the PrototypeToolbar ("PROTOTYPE CONTROLLER") bar
  useEffect(() => {
    const measure = () => {
      const bar = document.getElementById('prototype-toolbar');
      setToolbarOffset(bar ? Math.ceil(bar.getBoundingClientRect().height) : 0);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setArchitectureOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setArchitectureOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  // Scroll-spy: highlight the navigation item for the section in view
  useEffect(() => {
    const ids = PUBLIC_NAV_ITEMS.map((item) => item.href.replace('#', ''));
    const onScrollSpy = () => {
      const mark = window.scrollY + 104;
      let current: string | null = null;
      let bestTop = -1;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= mark && top >= bestTop) {
          bestTop = top;
          current = id;
        }
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    onScrollSpy();
    window.addEventListener('scroll', onScrollSpy, { passive: true });
    window.addEventListener('resize', onScrollSpy);
    return () => {
      window.removeEventListener('scroll', onScrollSpy);
      window.removeEventListener('resize', onScrollSpy);
    };
  }, []);

  return (
<header
      ref={headerRef}
      id="public-site-header"
      style={{ top: toolbarOffset }}
      className={`sticky z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/75 backdrop-blur-xl border-b border-slate-200 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] dark:bg-slate-950/75 dark:border-slate-800/60 dark:shadow-[0_12px_32px_-24px_rgba(0,0,0,0.7)]'
          : 'bg-white/40 border-b border-slate-200/70 dark:bg-slate-950/40 dark:border-slate-800/30'
      }`}
    >
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 md:gap-6 px-4 md:px-8">
        {/* Brand */}
        <a
          href="#overview"
          onClick={() => setMenuOpen(false)}
          aria-label="Government Chemist — Forensic Laboratory Platform, home"
          className="shrink-0"
        >
          <span className="sm:hidden">
            <LogoPlaceholder size="sm" variant="dark" showText={false} />
          </span>
          <span className="hidden sm:block">
            <LogoPlaceholder size="md" variant="dark" />
          </span>
        </a>

        {/* Center / left navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8" aria-label="Primary">
          {PUBLIC_NAV_ITEMS.map((item) => {
            const active = activeId === item.href.replace('#', '');
            const hasChildren = Boolean(item.children?.length);
            return (
              <div key={item.label} className="relative">
                {hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={architectureOpen}
                    aria-haspopup="true"
                    onClick={() => setArchitectureOpen((open) => !open)}
                    className={`group relative flex items-center gap-1 py-1.5 text-[13px] font-medium tracking-tight transition-colors ${
                      active || architectureOpen ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${architectureOpen ? 'rotate-180' : ''}`} />
                    <span className={`absolute inset-x-0 -bottom-0.5 h-px transition-all duration-300 ${active || architectureOpen ? 'bg-slate-900 dark:bg-slate-300' : 'bg-slate-400 dark:bg-slate-600 scale-x-0 group-hover:scale-x-100'}`} />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative block py-1.5 text-[13px] font-medium tracking-tight transition-colors ${
                      active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {item.label}
                    <span className={`absolute inset-x-0 -bottom-0.5 h-px transition-all duration-300 ${active ? 'bg-slate-900 dark:bg-slate-300' : 'bg-slate-400 dark:bg-slate-600 scale-x-0 group-hover:scale-x-100'}`} />
                  </a>
                )}

                {hasChildren && architectureOpen && (
                  <div className="absolute left-1/2 top-full z-50 mt-3 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
                    <div className="px-3 py-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-amber-500">Architecture tour</span>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">See how one case record moves through the laboratory.</p>
                    </div>
                    {item.children?.map((child) => (
                      <a
                        key={child.href}
                        href={child.href}
                        onClick={() => setArchitectureOpen(false)}
                        className="block rounded-lg px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Authentication + primary CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle variant="segmented" size="sm" className="shrink-0" />

          <span className="hidden md:block h-9 w-px bg-slate-300/70 dark:bg-slate-800/70 shrink-0" aria-hidden="true" />

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenSignIn();
            }}
            id="header-staff-portal-btn"
            className="hidden md:inline-flex items-center gap-2 rounded-lg h-9 px-3.5 text-[13px] font-medium text-slate-600 border border-slate-300 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap dark:text-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:text-white"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Staff Sign In
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenRequestAccess();
            }}
            className="inline-flex items-center rounded-lg h-9 px-3.5 sm:px-5 text-[13px] font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.35)] whitespace-nowrap"
          >
            Request Access
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => {
              setMenuOpen((o) => !o);
              setArchitectureOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-controls="gc-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900/80 dark:border-slate-800"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <MobileNav
        open={menuOpen}
        items={PUBLIC_NAV_ITEMS}
        onNavigate={() => setMenuOpen(false)}
        onOpenSignIn={() => {
          setMenuOpen(false);
          onOpenSignIn();
        }}
        onOpenRequestAccess={() => {
          setMenuOpen(false);
          onOpenRequestAccess();
        }}
        onLaunchDemo={() => {
          setMenuOpen(false);
          onLaunchDemo();
        }}
      />
    </header>
  );
};