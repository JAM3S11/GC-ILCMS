import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';

/* ---------------------------------------------------------------------------
 * DashboardLayout — the reusable application frame.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ banner (optional, full width)                │
 *   ├────────────┬─────────────────────────────────┤
 *   │            │ topbar (sticky)                 │
 *   │  sidebar   ├─────────────────────────────────┤
 *   │            │ main content (only this scrolls)│
 *   └────────────┴─────────────────────────────────┘
 *
 * It knows nothing about GC-ILCMS: pass any <Sidebar> as `sidebar` (it must use
 * `className="absolute h-full"` so it sits under the banner) and any bar as
 * `topbar`. Collapse state can be controlled via `open` / `onOpenChange`.
 * --------------------------------------------------------------------------- */

interface DashboardLayoutProps {
  banner?: React.ReactNode;
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Extra classes for the centred content container. */
  contentClassName?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  banner,
  sidebar,
  topbar,
  children,
  open,
  onOpenChange,
  contentClassName = '',
}) => (
  <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-amber-500"
    >
      Skip to main content
    </a>
    {banner}
    <SidebarProvider open={open} onOpenChange={onOpenChange} className="relative min-h-0 flex-1">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
        >
          <div className={`mx-auto w-full max-w-screen-2xl px-4 py-5 md:px-6 md:py-6 lg:px-8 ${contentClassName}`}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  </div>
);
