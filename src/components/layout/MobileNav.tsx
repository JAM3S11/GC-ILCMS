import React from 'react';
import { KeyRound, Rocket } from 'lucide-react';
import type { PublicNavItem } from './nav';

interface MobileNavProps {
  open: boolean;
  items: PublicNavItem[];
  onNavigate: () => void;
  onOpenSignIn: () => void;
  onOpenRequestAccess: () => void;
  onLaunchDemo: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  open,
  items,
  onNavigate,
  onOpenSignIn,
  onOpenRequestAccess,
  onLaunchDemo,
}) => {
  if (!open) return null;

  return (
    <div
      id="gc-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
      className="lg:hidden absolute top-full inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl animate-fade-up dark:border-slate-800/70 dark:bg-slate-950/95"
    >
      <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto no-scrollbar px-4 md:px-8 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <nav className="flex flex-col" aria-label="Mobile primary">
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
            <a
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center justify-between py-3 text-[15px] font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white active:text-amber-600 dark:active:text-amber-300 transition-colors ${
                index > 0 ? 'border-t border-slate-200 dark:border-white/5' : ''
              }`}
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-400 dark:text-slate-600">→</span>
            </a>
            {item.children?.map((child) => (
              <a
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className="flex items-center justify-between border-t border-slate-200 py-2.5 pl-4 text-[13px] text-slate-500 hover:text-slate-900 dark:border-white/5 dark:text-slate-400 dark:hover:text-white"
              >
                <span>{child.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-600">→</span>
              </a>
            ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <button
            onClick={onOpenSignIn}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-300 bg-slate-100 hover:border-slate-400 hover:text-slate-900 dark:text-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Staff Sign In
          </button>
          <button
            onClick={onOpenRequestAccess}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Request Access
          </button>
          <button
            onClick={onLaunchDemo}
            id="header-explore-btn"
            className="w-full flex items-center justify-center gap-2 pt-1 pb-2 rounded-lg text-[13px] font-medium text-slate-500 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            Launch Workstation (live demo)
          </button>
        </div>
      </div>
    </div>
  );
};