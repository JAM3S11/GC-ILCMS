import React from 'react';
import { ChevronUp, Lock, Mail, Phone } from 'lucide-react';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import { PUBLIC_NAV_ITEMS } from './nav';

const linkClasses =
  'rounded-sm text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 transition-colors';

const FooterColumn: React.FC<{ heading: string; children: React.ReactNode }> = ({ heading, children }) => (
  <div>
    <h2 className="mb-3 text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
      {heading}
    </h2>
    {children}
  </div>
);

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto bg-white text-xs text-slate-600 overflow-hidden border-t border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800/70">
      {/* Top accent line */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

      {/* Soft ambient glow */}
      <div aria-hidden="true" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[720px] h-[220px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-10">
        {/* Brand + link columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center lg:items-start gap-3 text-center lg:text-left">
            <LogoPlaceholder size="md" variant="dark" id="gc-footer-brand" />
            <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              The national forensic and chemical regulatory laboratory — serving the Judiciary, National Police Service,
              DCI, and ODPP with court-admissible scientific evidence.
            </p>
          </div>

          {/* Platform */}
          <FooterColumn heading="Platform">
            <nav aria-label="Footer platform links">
              <ul className="space-y-2 list-none p-0 m-0 text-[12px] font-medium">
                {PUBLIC_NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className={linkClasses}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </FooterColumn>

          {/* Legal */}
          <FooterColumn heading="Legal">
            <nav aria-label="Footer legal links">
              <ul className="space-y-2 list-none p-0 m-0 text-[12px] font-medium">
                <li><a href="#faqs" className={linkClasses}>Privacy</a></li>
                <li><a href="#faqs" className={linkClasses}>Security</a></li>
                <li><a href="#faqs" className={linkClasses}>Terms</a></li>
              </ul>
            </nav>
          </FooterColumn>

          {/* Contact */}
          <FooterColumn heading="Contact">
            <address className="not-italic space-y-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div>
                <a
                  href="tel:+254202725460"
                  className="inline-flex items-center gap-1.5 rounded-sm hover:text-amber-600 dark:hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 transition-colors"
                >
                  <Phone aria-hidden="true" className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  +254 20 272 5460
                </a>
              </div>
              <div>
                <a
                  href="mailto:nairobi.hq@chemist.go.ke"
                  className="inline-flex items-center gap-1.5 rounded-sm hover:text-amber-600 dark:hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 transition-colors"
                >
                  <Mail aria-hidden="true" className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  nairobi.hq@chemist.go.ke
                </a>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Lock aria-hidden="true" className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                KENAS ISO/IEC 17025:2017
              </div>
              <div>Nairobi HQ · Est. 1912</div>
            </address>
          </FooterColumn>
        </div>

        {/* Legal bar */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row border-t border-slate-200 dark:border-slate-800/60 pt-6">
          <p className="text-[11px] text-slate-500 dark:text-slate-600 text-center md:text-left">
            © {year} GC-ILCMS. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1 rounded-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 transition-colors cursor-pointer"
          >
            <ChevronUp aria-hidden="true" className="w-3 h-3" />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};
