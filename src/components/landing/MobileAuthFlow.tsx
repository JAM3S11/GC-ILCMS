import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronUp } from 'lucide-react';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import {
  AuthCopy,
  AuthMode,
  EASE_OUT,
  GUILLOCHE_PATTERN,
  PANEL_BACKGROUND,
  SLIDE_MS,
  TAB_SPRING,
} from './landingShared';

/*
 * Phone sign-in flow, laid out like a native app:
 *   Welcome: the overview summary (heading, lifecycle carousel, trust chips). After one carousel
 *   slide a drawer comes up from the bottom bar with Sign in / Cancel / Request access. Cancel
 *   shrinks it back into the bar, and tapping or swiping up on the bar brings it back.
 *   Sign in | Request access under the desktop teal brand header, with Forgot password off Sign in.
 * The forms themselves (and all their state) come from LandingPage, shared with the desktop card.
 */

type Screen = 'welcome' | 'form';

const SEGMENTS: { mode: AuthMode; label: string }[] = [
  { mode: 'signin', label: 'Sign in' },
  { mode: 'request', label: 'Request access' },
];

/** The bar and the drawer are one element (shared layoutId), so opening and closing morph between them. */
const DRAWER_MORPH = { duration: 0.42, ease: EASE_OUT };

const NationalStripe: React.FC = () => (
  <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 flex h-1.5">
    <span className="flex-1 bg-black" />
    <span className="w-[3px] bg-white" />
    <span className="flex-1 bg-[#bb0000]" />
    <span className="w-[3px] bg-white" />
    <span className="flex-1 bg-[#006600]" />
  </div>
);

interface MobileAuthFlowProps {
  authMode: AuthMode;
  copy: AuthCopy;
  forms: React.ReactNode;
  overview: React.ReactNode;
  textScale: number;
  onModeChange: (mode: AuthMode) => void;
  onOpenTerms: () => void;
}

export const MobileAuthFlow: React.FC<MobileAuthFlowProps> = ({
  authMode,
  copy,
  forms,
  overview,
  textScale,
  onModeChange,
  onOpenTerms,
}) => {
  const shouldReduceMotion = useReducedMotion();
  // Reset and activation links open their form directly; everyone else starts on Welcome.
  const [screen, setScreen] = useState<Screen>(authMode === 'signin' ? 'welcome' : 'form');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The drawer comes up by itself once; after Cancel it waits for the user to open it.
  const [introDone, setIntroDone] = useState(false);

  const welcome = screen === 'welcome';
  const introRunning = welcome && !introDone && !drawerOpen;

  useEffect(() => {
    if (!introRunning) return;
    // With reduced motion there is no carousel to watch, so the drawer comes up straight away.
    const timeout = window.setTimeout(() => {
      setIntroDone(true);
      setDrawerOpen(true);
    }, shouldReduceMotion ? 0 : SLIDE_MS);
    return () => window.clearTimeout(timeout);
  }, [introRunning, shouldReduceMotion]);

  const openDrawer = () => {
    setIntroDone(true);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIntroDone(true);
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (!welcome || !drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [welcome, drawerOpen]);

  const goToForm = (mode: AuthMode) => {
    setDirection(1);
    onModeChange(mode);
    setScreen('form');
  };

  const goBack = () => {
    setDirection(-1);
    // Forgot password returns to Sign in; everything else returns to Welcome, drawer still open.
    if (authMode === 'forgot') {
      onModeChange('signin');
      return;
    }
    setIntroDone(true);
    setDrawerOpen(true);
    setScreen('welcome');
    onModeChange('signin');
  };

  // Keep the field being typed in (and the button under it) in view once the keyboard is up.
  const keepFieldInView = (e: React.FocusEvent) => {
    const field = e.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || field.type === 'checkbox') return;
    window.setTimeout(() => field.scrollIntoView({ block: 'center', behavior: shouldReduceMotion ? 'auto' : 'smooth' }), 300);
  };

  const slide: Variants = shouldReduceMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-30%', opacity: dir > 0 ? 1 : 0.6 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? '-30%' : '100%', opacity: dir > 0 ? 0.6 : 1 }),
      };

  const morph = shouldReduceMotion ? { duration: 0 } : DRAWER_MORPH;
  // Drawer content fades in once the morph is mostly done, so it never looks squashed.
  const contentFade = {
    initial: shouldReduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : 0.18 },
  } as const;

  const legalFooter = (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[length:calc(11px*var(--lp-scale))] text-slate-400">
      <button type="button" onClick={onOpenTerms} className="cursor-pointer hover:text-slate-700">Terms</button>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={onOpenTerms} className="cursor-pointer hover:text-slate-700">Privacy</button>
      <span aria-hidden="true">·</span>
      <a href="mailto:support@chemist.go.ke" className="hover:text-slate-700">Help</a>
      <span aria-hidden="true">·</span>
      <span>© {new Date().getFullYear()} Government Chemist</span>
    </div>
  );

  const welcomeScreen = (
    <div className="relative isolate flex min-h-[100dvh] w-full flex-col overflow-hidden text-white" style={{ background: PANEL_BACKGROUND }}>
      <NationalStripe />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ backgroundImage: GUILLOCHE_PATTERN, backgroundSize: '120px 40px' }}
      />
      <svg
        aria-hidden="true"
        viewBox="-100 -100 200 200"
        className="pointer-events-none absolute -bottom-32 -left-32 -z-10 h-[22rem] w-[22rem] text-white opacity-[0.07]"
      >
        {Array.from({ length: 36 }, (_, i) => (
          <ellipse key={i} cx="0" cy="0" rx="96" ry="34" fill="none" stroke="currentColor" strokeWidth="0.5" transform={`rotate(${i * 5})`} />
        ))}
      </svg>

      {/* Overview summary; the bottom padding keeps the trust chips clear of the docked bar */}
      <div
        inert={drawerOpen}
        className="flex flex-1 flex-col justify-center px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2rem)]"
      >
        {overview}
      </div>

      {/* Dim the overview while the drawer is up; tapping it closes the drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="lp-drawer-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-30 bg-[#06262b]/55 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {drawerOpen ? (
        <motion.div
          key="lp-drawer"
          layoutId="lp-drawer"
          transition={morph}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lp-drawer-title"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 500) closeDrawer(); }}
          style={{ borderRadius: '28px 28px 0 0' }}
          className="fixed inset-x-0 bottom-0 z-40 bg-white px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 text-left text-[#111] shadow-[0_-20px_50px_-20px_rgba(2,6,23,0.6)]"
        >
          <motion.div {...contentFade} className="mx-auto w-full max-w-[480px]">
            <div aria-hidden="true" className="mx-auto h-1.5 w-10 cursor-grab rounded-full bg-slate-300" />
            <div className="mt-5 flex items-center gap-3">
              <LogoPlaceholder size="md" variant="on-teal" id="gc-drawer-brand" showText={false} />
              <div>
                <p className="text-[length:calc(14px*var(--lp-scale))] font-medium text-[#6b6b78]">Hi there,</p>
                <h2 id="lp-drawer-title" className="text-[length:calc(22px*var(--lp-scale))] font-bold leading-tight tracking-[-0.03em] text-[#101014]">
                  Welcome back to <span className="text-[#0f766e]">LIMS</span>
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => goToForm('signin')}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#14b8a6] text-[length:calc(15px*var(--lp-scale))] font-bold text-white shadow-[0_10px_24px_-12px_rgba(15,118,110,0.8)] transition-transform active:scale-[0.99]"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white text-[length:calc(15px*var(--lp-scale))] font-semibold text-[#44444f] transition-colors active:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <p className="mt-5 text-center text-[length:calc(13px*var(--lp-scale))] text-[#6b6b78]">
              No account?{' '}
              <button
                type="button"
                onClick={() => goToForm('request')}
                className="cursor-pointer font-semibold text-[#0f766e] underline-offset-2 hover:underline"
              >
                Request access
              </button>
            </p>
            {legalFooter}
          </motion.div>
        </motion.div>
      ) : (
        // Docked bar: the closed drawer. Tap or swipe up to bring it back.
        <motion.button
          key="lp-drawer-dock"
          layoutId="lp-drawer"
          transition={morph}
          type="button"
          onClick={openDrawer}
          onPanEnd={(_, info) => { if (info.offset.y < -30) openDrawer(); }}
          aria-haspopup="dialog"
          aria-label="Open sign in"
          style={{ borderRadius: 18, touchAction: 'none' }}
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 cursor-pointer overflow-hidden bg-white px-4 py-3 text-left text-[#111] shadow-[0_16px_40px_-16px_rgba(2,6,23,0.7)]"
        >
          <motion.div {...contentFade} className="flex items-center gap-3">
            <LogoPlaceholder size="sm" variant="on-teal" id="gc-dock-brand" showText={false} />
            <span className="min-w-0 flex-1">
              <span className="block text-[length:calc(14px*var(--lp-scale))] font-bold text-[#101014]">Sign in to LIMS</span>
              <span className="block text-[length:calc(11px*var(--lp-scale))] text-[#6b6b78]">Tap or swipe up to continue</span>
            </span>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-white">
              <ChevronUp className="h-4 w-4" />
            </span>
          </motion.div>
          {/* Fills along with the carousel's slide timer until the drawer comes up */}
          {introRunning && !shouldReduceMotion && (
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-200">
              <motion.span
                className="block h-full origin-left bg-[#0f766e]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: SLIDE_MS / 1000, ease: 'linear' }}
              />
            </span>
          )}
        </motion.button>
      )}
    </div>
  );

  const showSegments = authMode === 'signin' || authMode === 'request';

  const formScreen = (
    <div className="flex min-h-[100dvh] w-full flex-col bg-white">
      <header className="relative isolate flex min-h-[24dvh] flex-col items-center justify-center overflow-hidden px-6 pb-12 pt-[calc(env(safe-area-inset-top)+2rem)] text-center text-white">
        {/* Same teal panel, security-paper lines and rosette as the desktop branding panel */}
        <div aria-hidden="true" className="absolute inset-0 -z-20" style={{ background: PANEL_BACKGROUND }} />
        <svg
          aria-hidden="true"
          viewBox="-100 -100 200 200"
          className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 text-white opacity-[0.07]"
        >
          {Array.from({ length: 36 }, (_, i) => (
            <ellipse key={i} cx="0" cy="0" rx="96" ry="34" fill="none" stroke="currentColor" strokeWidth="0.5" transform={`rotate(${i * 5})`} />
          ))}
        </svg>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ backgroundImage: GUILLOCHE_PATTERN, backgroundSize: '120px 40px' }}
        />
        <NationalStripe />

        <button
          type="button"
          onClick={goBack}
          aria-label={authMode === 'forgot' ? 'Back to sign in' : 'Back to welcome'}
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+1rem)] inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors active:bg-white/25"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Brand block, as on the desktop branding panel */}
        <div className="flex items-center gap-3">
          <LogoPlaceholder size="sm" variant="on-teal" id="gc-mobile-brand" showText={false} />
          <div className="text-left">
            <p className="text-[length:calc(15px*var(--lp-scale))] font-bold leading-tight tracking-tight">Government Chemist</p>
            <p className="font-mono text-[length:calc(10px*var(--lp-scale))] uppercase tracking-[0.2em] text-white/80">GC-ILCMS</p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-[length:calc(9px*var(--lp-scale))] font-semibold uppercase tracking-[0.16em] text-white">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 animate-pulse-ring" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
          </span>
          Secure staff access
        </div>
      </header>

      <section
        aria-label={copy.title}
        className="relative -mt-8 flex flex-1 flex-col rounded-t-[28px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6 shadow-[0_-16px_40px_-24px_rgba(2,6,23,0.55)]"
      >
        <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
          {showSegments && (
            <div role="tablist" aria-label="Choose a form" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              {SEGMENTS.map(({ mode, label }) => {
                const active = authMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { if (!active) onModeChange(mode); }}
                    className={`relative h-10 cursor-pointer rounded-lg text-[length:calc(14px*var(--lp-scale))] font-semibold transition-colors ${active ? 'text-[#101014]' : 'text-slate-500'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="lp-seg"
                        transition={shouldReduceMotion ? { duration: 0 } : TAB_SPRING}
                        className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(15,23,42,0.15)]"
                      />
                    )}
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <h2 className="text-[length:calc(22px*var(--lp-scale))] font-bold leading-tight tracking-[-0.03em] text-[#101014]">{copy.title}</h2>
          <p className="mt-1.5 text-[length:calc(13px*var(--lp-scale))] leading-relaxed text-[#6b6b78]">{copy.subtitle}</p>

          <div className="relative mt-6">{forms}</div>

          <div className="mt-auto pt-8 text-center">
            {copy.switchTo && (
              <p className="text-[length:calc(13px*var(--lp-scale))] text-[#6b6b78]">
                {copy.switchPrompt}{' '}
                <button
                  type="button"
                  onClick={() => onModeChange(copy.switchTo!)}
                  className="cursor-pointer font-semibold text-[#0f766e] underline-offset-2 hover:underline"
                >
                  {copy.switchCta}
                </button>
              </p>
            )}
            {legalFooter}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden text-left text-[#111]"
      style={{ background: PANEL_BACKGROUND, colorScheme: 'light', ['--lp-scale' as string]: textScale }}
      onFocus={keepFieldInView}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={screen}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: shouldReduceMotion ? 0 : 0.34, ease: EASE_OUT }}
          className="w-full"
        >
          {welcome ? welcomeScreen : formScreen}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
