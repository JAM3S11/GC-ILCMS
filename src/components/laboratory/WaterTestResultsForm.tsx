import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, TriangleAlert } from 'lucide-react';
import { WaterIntake } from '../../types';
import { Button } from '../common/Dashboard';
import { Select } from '../common/Select';
import {
  WATER_REPORT_OPTIONS,
  WATER_TEST_GROUPS,
  WATER_TEST_PARAMETER_COUNT,
  WaterTestEntry,
  suggestReport,
} from '../../lib/waterTestParameters';

interface WaterTestResultsFormProps {
  intake: WaterIntake;
  /** The assigned officer, while the exhibit is under analysis. Everyone else reads. */
  canEdit: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (payload: { results: Record<string, WaterTestEntry>; remarks: string }) => void;
  /** Called with the results as typed (saved or not), so the document preview can follow along. */
  onDraftChange?: (entries: Record<string, WaterTestEntry>, remarks: string) => void;
  /** Shown when the sheet is read-only because the certificate has been issued. */
  lockedNote?: string;
}

const storedResults = (intake: WaterIntake): Record<string, WaterTestEntry> => intake.findingsResults?.results ?? {};
// An exhibit saved before structured results existed keeps its plain text as remarks.
const storedRemarks = (intake: WaterIntake) => intake.findingsResults?.remarks ?? (intake.findingsResults ? '' : intake.findings ?? '');

const reportTone = (report: string) =>
  report === 'AAL'
    ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
    : report === 'Acceptable'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
      : 'text-slate-400';

const inputClass =
  'h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/** The physical and chemical test sheet: the officer fills it in; everyone else reads it. */
export const WaterTestResultsForm: React.FC<WaterTestResultsFormProps> = ({ intake, canEdit, saving, saveError, onSave, onDraftChange, lockedNote }) => {
  const [entries, setEntries] = useState<Record<string, WaterTestEntry>>(() => storedResults(intake));
  const [remarks, setRemarks] = useState(() => storedRemarks(intake));

  // Adopt what is stored whenever the exhibit is replaced or re-saved elsewhere.
  useEffect(() => {
    setEntries(storedResults(intake));
    setRemarks(storedRemarks(intake));
  }, [intake.id, intake.findingsRecordedAt]);

  useEffect(() => {
    onDraftChange?.(entries, remarks);
    // The callback is a state setter in the parent; the values are the real dependencies.
  }, [entries, remarks]);

  const setResult = (id: string, limit: string, result: string) =>
    setEntries((previous) => {
      const current = previous[id] ?? { result: '', report: '' };
      // Pre-fill the report from the limit until the officer picks one themselves.
      const suggested = suggestReport(result, limit);
      const autoReport = !current.report || current.report === suggestReport(current.result, limit);
      return { ...previous, [id]: { result, report: autoReport ? suggested : current.report } };
    });
  const setReport = (id: string, report: string) =>
    setEntries((previous) => ({ ...previous, [id]: { result: previous[id]?.result ?? '', report } }));

  const filled = useMemo(
    () => Object.values(entries).filter((entry) => entry.result.trim()).length,
    [entries],
  );
  const overLimit = useMemo(() => Object.values(entries).filter((entry) => entry.report === 'AAL').length, [entries]);

  const cleaned = useMemo(() => {
    const out: Record<string, WaterTestEntry> = {};
    for (const [id, entry] of Object.entries(entries)) {
      const result = entry.result.trim();
      if (result || entry.report) out[id] = { result, report: entry.report };
    }
    return out;
  }, [entries]);
  const dirty =
    JSON.stringify(cleaned) !== JSON.stringify(storedResults(intake)) ||
    remarks.trim() !== (storedRemarks(intake) ?? '').trim();
  const canSave = canEdit && dirty && !saving && (Object.keys(cleaned).length > 0 || remarks.trim().length > 0) && remarks.length <= 2000;

  if (!canEdit && Object.keys(storedResults(intake)).length === 0 && !storedRemarks(intake)) {
    return (
      <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {intake.status === 'Under Analysis'
          ? 'No test results have been recorded yet.'
          : 'Test results are entered by the assigned Analysis Officer once the exhibit is under analysis.'}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {!canEdit && lockedNote && (
        <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {lockedNote}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {filled} of {WATER_TEST_PARAMETER_COUNT} parameters reported
          {overLimit > 0 && <span className="ml-2 font-semibold text-red-600 dark:text-red-400">· {overLimit} above the acceptable limit</span>}
        </span>
        {intake.findingsRecordedAt && (
          <span>
            Last saved {intake.findingsRecordedAt}
            {intake.findingsRecordedBy ? ` by ${intake.findingsRecordedBy}` : ''}
          </span>
        )}
      </div>

      {WATER_TEST_GROUPS.map((group) => (
        <div key={group.category} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{group.category}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  <th className="px-4 py-2.5 font-semibold">Parameter</th>
                  <th className="w-48 px-4 py-2.5 font-semibold">Results mg/l (ppm)</th>
                  <th className="w-48 px-4 py-2.5 font-semibold">Report</th>
                  <th className="px-4 py-2.5 font-semibold">KS EAS 12:2018 Max Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.parameters.map((parameter) => {
                  const entry = entries[parameter.id] ?? { result: '', report: '' };
                  const violation = entry.report === 'AAL';
                  return (
                    <tr key={parameter.id} className={violation ? 'bg-red-50/60 dark:bg-red-950/20' : ''}>
                      <th scope="row" className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                        <label htmlFor={`result-${parameter.id}`}>{parameter.name}</label>
                      </th>
                      <td className="px-4 py-1.5">
                        {canEdit ? (
                          <input
                            id={`result-${parameter.id}`}
                            value={entry.result}
                            maxLength={100}
                            onChange={(event) => setResult(parameter.id, parameter.limit, event.target.value)}
                            placeholder="Enter result"
                            className={inputClass}
                          />
                        ) : (
                          <span className={violation ? 'font-bold text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}>
                            {entry.result || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-1.5">
                        {canEdit ? (
                          <Select
                            size="xs"
                            aria-label={`Report for ${parameter.name}`}
                            placeholder="Select…"
                            value={entry.report}
                            onChange={(value) => setReport(parameter.id, value)}
                            options={WATER_REPORT_OPTIONS.map((option) => ({ value: option, label: option }))}
                          />
                        ) : (
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${reportTone(entry.report)}`}>{entry.report || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">{parameter.limit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div>
        <label htmlFor="exhibit-remarks" className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Analyst remarks (optional)
        </label>
        {canEdit ? (
          <textarea
            id="exhibit-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Methods used, observations, or anything the reader should know…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        ) : (
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200">{remarks || '—'}</p>
        )}
      </div>

      <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <p><strong>*BDL:</strong> Below Detection Level of the method</p>
        <p><strong>*AAL:</strong> Above the Acceptable Limit</p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 print:hidden dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
            {intake.status === 'Under Analysis' && ' Saving the results marks the analysis complete.'}
          </span>
          <Button variant="primary" size="sm" icon={FlaskConical} disabled={!canSave} onClick={() => onSave({ results: cleaned, remarks: remarks.trim() })}>
            {saving ? 'Saving…' : intake.findings ? 'Update test results' : 'Save test results'}
          </Button>
        </div>
      )}
      {saveError && (
        <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">{saveError}</p>
      )}
    </div>
  );
};
