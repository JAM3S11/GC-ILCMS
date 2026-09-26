import React from 'react';
import emblem from '../../assets/gcilcsm-emblem.png';

interface LogoPlaceholderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'emblem-only' | 'on-teal';
  showText?: boolean;
  id?: string;
}

export const LogoPlaceholder: React.FC<LogoPlaceholderProps> = ({
  size = 'md',
  variant = 'dark',
  showText = true,
  id = 'gc-institutional-brand',
}) => {
  const sizeClasses = {
    sm: { icon: 'w-8 h-8 text-xs', title: 'text-sm', sub: 'text-[10px]' },
    md: { icon: 'w-10 h-10 text-sm', title: 'text-base', sub: 'text-xs' },
    lg: { icon: 'w-14 h-14 text-base', title: 'text-xl', sub: 'text-xs' },
    xl: { icon: 'w-20 h-20 text-lg', title: 'text-2xl', sub: 'text-sm' },
  }[size];

  return (
    <div className="flex items-center gap-3 select-none" id={id}>
      {/* Institutional Emblem */}
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 shadow-inner shrink-0 ${
          variant === 'on-teal' ? 'bg-slate-950' : 'bg-white dark:bg-slate-950'
        } ${sizeClasses.icon}`}
        title="Government Chemist emblem"
      >
        <img
          src={emblem}
          alt="Government Chemist emblem"
          className="h-full w-full object-contain p-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          draggable={false}
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`font-sans font-bold tracking-tight whitespace-nowrap ${sizeClasses.title} ${
                variant === 'on-teal'
                  ? 'text-white'
                  : variant === 'light'
                    ? 'text-slate-900 dark:text-slate-900'
                    : 'text-slate-900 dark:text-white'
              }`}
            >
              Government Chemist
            </span>
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
              GoK
            </span>
          </div>
          <span
            className={`font-mono tracking-wider uppercase leading-none ${sizeClasses.sub} ${
              variant === 'on-teal'
                ? 'text-white/80'
                : variant === 'light'
                  ? 'text-slate-600 dark:text-slate-500'
                  : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            GC-ILCMS
          </span>
        </div>
      )}
    </div>
  );
};
