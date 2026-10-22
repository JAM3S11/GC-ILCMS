import React, { createContext, useContext, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, Check, Circle, Info, LucideIcon } from 'lucide-react';
import { Tone } from '../common/Dashboard';
import { STATE_ICON } from './CaseFileLayout';
import { OutlineButton, StatusText } from './workspace/ui';

/* ---------------------------------------------------------------------------
 * IntakeLayout — the one Exhibit Intake page every department is built on,
 * in the same design language as the case file (CaseFileLayout):
 *
 *   ← Back
 *   REFERENCE  ● New intake
 *   Department · received by · date
 *   ┌ where the details come from ┐
 *   [sections]  [form, one bordered card]   [preview · next · recent]
 *   [sticky bar: what is still needed · Cancel · Register]
 *
 * Departments keep their own fields, state and validation; they pass the
 * required items (checks, each tagged with its section) and the layout shows
 * progress, the section list, the preview and the action bar.
 * --------------------------------------------------------------------------- */

export interface IntakeCheck {
  label: string;
  value: string;
  ok: boolean;
  /** The Section id the item belongs to, for the section list and its state. */
  section?: string;
}

export interface IntakeSectionLink {
  id: string;
  title: string;
}

export interface IntakeRecentItem {
  id: string;
  primary: string;
  secondary: string;
  status: { label: string; tone: Tone };
}

interface IntakeLayoutProps {
  back: { label: string; onClick: () => void };
  /** The lab reference, or the pattern it will take before registering. */
  reference: string;
  status: { label: string; tone: Tone };
  /** Short facts under the reference, joined with dots. */
  subtitle: React.ReactNode[];
  /** Where the details come from, or why registering has to wait. */
  notice?: { tone: 'info' | 'attention'; text: React.ReactNode };
  sections: IntakeSectionLink[];
  checks: IntakeCheck[];
  previewTitle?: string;
  /** Extra rows under the preview, e.g. the charges. */
  previewExtra?: React.ReactNode;
  /** The department's process after registering; the first step is this one. */
  nextSteps: { title: string; text: string }[];
  recent: { title: string; caption: string; empty: string; items: IntakeRecentItem[] };
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  saving: boolean;
  canSubmit: boolean;
  /** Replaces the "still needed" line, e.g. why Save is greyed out when editing. */
  barMessage?: string;
  error?: string;
  errorRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

/** How far each section is: required items and how many are filled. */
const IntakeSectionContext = createContext<Record<string, { required: number; filled: number }>>({});

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const sectionState = (progress: { required: number; filled: number } | undefined, firstOpen: boolean) =>
  !progress || progress.filled >= progress.required ? 'done' : firstOpen ? 'current' : 'pending';

/** One part of the intake form: a plain header with its state, then the fields. */
export const IntakeSection: React.FC<{
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ id, icon: Icon, title, description, children }) => {
  const progress = useContext(IntakeSectionContext)[id];
  const left = progress ? progress.required - progress.filled : 0;
  return (
    <fieldset id={id} className="min-w-0 scroll-mt-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white">
            <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {progress && progress.required > 0 && (
          left > 0
            ? <span className="text-[12px] tabular-nums text-amber-700 dark:text-amber-400">{left} to fill</span>
            : <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> Complete</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
};

export const IntakeLayout: React.FC<IntakeLayoutProps> = ({
  back,
  reference,
  status,
  subtitle,
  notice,
  sections,
  checks,
  previewTitle = 'Record preview',
  previewExtra,
  nextSteps,
  recent,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  canSubmit,
  barMessage,
  error,
  errorRef,
  children,
}) => {
  const progress: Record<string, { required: number; filled: number }> = {};
  checks.forEach((check) => {
    if (!check.section) return;
    const entry = (progress[check.section] ??= { required: 0, filled: 0 });
    entry.required += 1;
    if (check.ok) entry.filled += 1;
  });
  const firstOpenId = sections.find((section) => sectionState(progress[section.id], false) !== 'done')?.id;
  const done = checks.filter((check) => check.ok).length;
  const missing = checks.filter((check) => !check.ok).map((check) => check.label);

  // Esc goes back, as in the case file, unless a field, menu or dialog has it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"], [role="listbox"]')) return;
      back.onClick();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [back]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 animate-fade-in">
      <header className="space-y-3">
        <button
          type="button"
          onClick={back.onClick}
          className="-ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
          title="Back (Esc)"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="break-all font-mono text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-white">{reference}</h1>
            <StatusText tone={status.tone}>{status.label}</StatusText>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            {subtitle.filter(Boolean).map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
        {notice && (
          <p
            role="status"
            className={`flex items-start gap-2 rounded-lg border px-3.5 py-2 text-[13px] ${
              notice.tone === 'attention'
                ? 'border-amber-300/70 text-slate-700 dark:border-amber-400/30 dark:text-slate-200'
                : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            {notice.tone === 'attention'
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              : <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            <span>{notice.text}</span>
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[11rem_minmax(0,1fr)_20rem]">
        {/* ----------------------------- Sections ----------------------------- */}
        <nav aria-label="Intake sections" className="hidden xl:sticky xl:top-4 xl:block">
          <ol className="space-y-0.5">
            {sections.map((section) => {
              const state = STATE_ICON[sectionState(progress[section.id], section.id === firstOpenId)];
              const StateIcon = state.icon;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(section.id)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-slate-600 transition-colors hover:bg-slate-500/[0.06] hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <StateIcon className={`h-3.5 w-3.5 shrink-0 ${state.className}`} aria-label={state.label} />
                    <span className="truncate">{section.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ------------------------------- Form ------------------------------- */}
        <form onSubmit={onSubmit} className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800">
          <IntakeSectionContext.Provider value={progress}>{children}</IntakeSectionContext.Provider>

          {error && (
            <div ref={errorRef} role="alert" className="border-t border-rose-200 px-5 py-3 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Kept in view at the foot of the screen, as on the case file. */}
          {/* -mt-px sits the bar's top line on the last section's divider. */}
          <div className="sticky bottom-0 z-10 -mt-px flex flex-col gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/95">
            <p className="min-w-0 text-[12.5px] text-slate-500 dark:text-slate-400" aria-live="polite">
              <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{done} of {checks.length}</span> required
              {barMessage
                ? <> · {barMessage}</>
                : missing.length > 0 && <> · still needed: {missing.slice(0, 3).join(', ').toLowerCase()}{missing.length > 3 ? ` and ${missing.length - 3} more` : ''}</>}
            </p>
            <div className="flex shrink-0 gap-2">
              <OutlineButton size="md" tone="ghost" onClick={onCancel}>Cancel</OutlineButton>
              <OutlineButton size="md" tone="accent" type="submit" icon={Check} disabled={!canSubmit || saving}>
                {saving ? 'Saving…' : submitLabel}
              </OutlineButton>
            </div>
          </div>
        </form>

        {/* ------------------------------- Aside ------------------------------ */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800">
            <h2 className="border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-900 dark:border-slate-800 dark:text-white">{previewTitle}</h2>
            <dl className="divide-y divide-slate-100 px-4 dark:divide-slate-800/70">
              {checks.map((check) => (
                <div key={check.label} className="grid grid-cols-[1rem_7.75rem_minmax(0,1fr)] items-start gap-2 py-2 text-[12.5px]">
                  {check.ok
                    ? <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Filled" />
                    : <Circle className="mt-0.5 h-3.5 w-3.5 text-slate-300 dark:text-slate-600" aria-label="Still needed" />}
                  <dt className="text-slate-500 dark:text-slate-400">{check.label}</dt>
                  <dd className={`min-w-0 break-words ${check.value ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                    {check.value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
            {previewExtra && <div className="border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">{previewExtra}</div>}
          </section>

          <section className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="mb-3 text-[13px] font-semibold text-slate-900 dark:text-white">What happens next</h2>
            <ol className="space-y-2.5">
              {nextSteps.map((step, index) => (
                <li key={step.title} className="flex gap-2.5 text-[12.5px]">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10.5px] font-semibold tabular-nums ${
                      index === 0 ? 'border-teal-500 text-teal-700 dark:text-teal-300' : 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{step.title}</p>
                    <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
              <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">{recent.title}</h2>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400">{recent.caption}</span>
            </div>
            {recent.items.length === 0 ? (
              <p className="px-4 py-4 text-center text-[12px] text-slate-400">{recent.empty}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {recent.items.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-slate-900 dark:text-white">{item.primary}</p>
                      <p className="truncate font-mono text-[11px] text-slate-400">{item.secondary}</p>
                    </div>
                    <StatusText tone={item.status.tone}>{item.status.label}</StatusText>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};
