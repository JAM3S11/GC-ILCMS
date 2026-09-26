import React from 'react';
import { Compass, Phone } from 'lucide-react';

interface PrototypeToolbarProps {
  onOpenTour: () => void;
}

type MarqueeSegment =
  | { kind: 'text'; label: string }
  | { kind: 'bold'; label: string }
  | { kind: 'amber'; label: string }
  | { kind: 'phone'; label: string }
  | { kind: 'badge'; label: string };

const MARQUEE_SEGMENTS: MarqueeSegment[] = [
  { kind: 'bold', label: 'Republic of Kenya' },
  { kind: 'text', label: 'Executive Office of the President / Ministry of Health' },
  { kind: 'amber', label: 'Office of the Government Chemist (Est. 1912)' },
  { kind: 'phone', label: 'Forensic Hotline: +254 (020) 272 5460' },
  { kind: 'text', label: 'KENAS ISO/IEC 17025:2017' },
  { kind: 'badge', label: 'STATUTORY PORTAL' },
];

function SegmentValue({ segment }: { segment: MarqueeSegment }) {
  switch (segment.kind) {
    case 'bold':
      return (
        <span className="font-bold tracking-wide text-slate-900 uppercase dark:text-white">
          {segment.label}
        </span>
      );
    case 'amber':
      return <span className="font-semibold text-amber-600 dark:text-amber-300">{segment.label}</span>;
    case 'phone':
      return (
        <>
          <Phone className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400" />
          <span>{segment.label}</span>
        </>
      );
    case 'badge':
      return (
        <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-600 dark:text-amber-300">
          {segment.label}
        </span>
      );
    case 'text':
      return <span>{segment.label}</span>;
  }
}

/**
 * Slim prototype controller banner: a "PROTOTYPE" notice, a slow right-to-left
 * statutory marquee (visible on every screen) and the Architecture Tour entry point.
 * Renders identically on the public landing page and inside the authenticated
 * workspace.
 */
export const PrototypeToolbar: React.FC<PrototypeToolbarProps> = ({ onOpenTour }) => {
  return (
    <div className="w-full border-b border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-[1700px] items-center gap-3 px-3 py-2 sm:gap-4 sm:px-6 lg:px-8">
        {/* Prototype notice */}
        <div className="flex shrink-0 items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono font-bold text-amber-600 dark:text-amber-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span className="hidden text-[11px] sm:inline">PROTOTYPE CONTROLLER</span>
          <span className="text-[10px] sm:hidden">PROTO</span>
        </div>

        {/* Slow right-to-left statutory marquee — all screens */}
        <div
          aria-label="Republic of Kenya statutory statement"
          className="relative min-w-0 flex-1 select-none overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] sm:[mask-image:none]"
        >
          <div className="gc-marquee-track gc-marquee-track-slow">
            {[0, 1].map((half) => (
              <div
                key={half}
                className="flex shrink-0 items-center gap-x-6 pr-6 whitespace-nowrap"
                aria-hidden={half === 1}
              >
                {MARQUEE_SEGMENTS.map((segment, i) => (
                  <span
                    key={`${segment.kind}-${i}`}
                    className="inline-flex items-center gap-x-2 font-mono text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400"
                  >
                    <SegmentValue segment={segment} />
                    <span className="ml-5 text-amber-400">•</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* The single visible action — Architecture Tour */}
        <button
          type="button"
          onClick={onOpenTour}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 active:scale-95 dark:text-amber-300 cursor-pointer"
          title="Interactive Tour & System Mandates"
        >
          <Compass className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="hidden text-[11px] sm:inline">Architecture Tour</span>
        </button>
      </div>
    </div>
  );
};