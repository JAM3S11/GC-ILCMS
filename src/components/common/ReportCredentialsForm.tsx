import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { ReportCredentials } from '../../types';
import { Button } from './Dashboard';

const EMPTY: ReportCredentials = { qualification: '', title: '', initials: '' };

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/**
 * Qualification, title and initials: how an officer is named on reports they sign, e.g.
 * "I Vivian Gacheri Mpekethu, MSc., a Government Analyst…" and "GCK 3209/26 VGM". Used by the
 * officer in Settings and by the Super Admin on a member's panel.
 */
export const ReportCredentialsForm: React.FC<{
  idPrefix: string;
  /** null while loading. */
  value: ReportCredentials | null;
  /** The name, to show the initials it gives when none are set. */
  fullName: string;
  /** Saves and returns the message to show. */
  onSave: (credentials: ReportCredentials) => Promise<string>;
}> = ({ idPrefix, value, fullName, onSave }) => {
  const [draft, setDraft] = useState<ReportCredentials>(value ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => setDraft(value ?? EMPTY), [value]);

  const nameInitials = fullName.split(/\s+/).map((word) => word.replace(/[^A-Za-z]/g, '').charAt(0)).join('').toUpperCase();
  const initialsValid = /^[A-Za-z]{0,6}$/.test(draft.initials.trim());
  const changed = !!value && (['qualification', 'title', 'initials'] as const).some((key) => draft[key].trim() !== value[key]);
  const set = (key: keyof ReportCredentials) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((previous) => ({ ...previous, [key]: event.target.value }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      setMessage({ tone: 'ok', text: await onSave({ ...draft, initials: draft.initials.trim().toUpperCase() }) });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save these details.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${idPrefix}-qualification`} className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Qualification</label>
          <input id={`${idPrefix}-qualification`} value={draft.qualification} onChange={set('qualification')} maxLength={60} placeholder="MSc" className={inputCls} disabled={!value} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-title`} className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Title</label>
          <input id={`${idPrefix}-title`} value={draft.title} onChange={set('title')} maxLength={80} placeholder="Government Analyst" className={inputCls} disabled={!value} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-initials`} className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Initials</label>
          <input
            id={`${idPrefix}-initials`}
            value={draft.initials}
            onChange={set('initials')}
            maxLength={6}
            placeholder={nameInitials || 'VGM'}
            className={`${inputCls} uppercase`}
            disabled={!value}
            aria-invalid={!initialsValid}
          />
        </div>
      </div>
      <p className={`text-xs ${initialsValid ? 'text-slate-500 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {initialsValid
          ? `Printed on the Report of Government Analyst. Blank initials use those of the name${nameInitials ? ` (${nameInitials})` : ''}.`
          : 'Initials are up to 6 letters.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="primary" icon={Check} disabled={saving || !changed || !initialsValid} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save report details'}
        </Button>
        {message && (
          <span role={message.tone === 'error' ? 'alert' : 'status'} className={`text-xs ${message.tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
};
