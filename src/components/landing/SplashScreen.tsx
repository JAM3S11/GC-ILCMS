import React from 'react';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import { PANEL_BACKGROUND } from './landingShared';

/**
 * Shown on launch while the saved sign-in session is checked. The mark fades in after a short delay,
 * so a quick check goes straight to the landing page or dashboard without a flash.
 */
export const SplashScreen: React.FC = () => (
  <div
    role="status"
    aria-label="Checking sign-in session"
    className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4"
    style={{ background: PANEL_BACKGROUND, colorScheme: 'light' }}
  >
    <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
      <LogoPlaceholder size="xl" variant="on-teal" id="gc-splash-brand" showText={false} />
    </div>
    <p className="animate-fade-in font-mono text-[11px] uppercase tracking-[0.24em] text-white/70" style={{ animationDelay: '350ms' }}>
      GC-ILCMS
    </p>
  </div>
);
