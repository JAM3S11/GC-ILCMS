import React, { useEffect, useState } from 'react';
import { ClipboardSignature, Eye } from 'lucide-react';
import { FoodDrugIntake, WorkAllocation } from '../../types';
import { apiRequest } from '../../lib/api';
import { Button } from '../common/Dashboard';
import { CaseStep } from './CaseStep';

/**
 * Step 1 of the Food & Drugs case file: the work allocation form the Head issued,
 * shown as a short summary with a link to the full form.
 */
export const WorkAllocationStep: React.FC<{ intake: FoodDrugIntake; canView: boolean; onView: () => void }> = ({ intake, canView, onView }) => {
  const [allocation, setAllocation] = useState<WorkAllocation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canView || !intake.analystId) {
      setLoaded(true);
      return undefined;
    }
    let cancelled = false;
    apiRequest<{ allocations: WorkAllocation[] }>(
      `/api/work-allocations?recordType=FOOD_DRUG_INTAKE&recordId=${encodeURIComponent(intake.id)}`,
    )
      .then((result) => {
        if (!cancelled) setAllocation(result.allocations.find((item) => !item.supersededAt) ?? result.allocations[0] ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [intake.id, intake.analystId, canView]);

  const allocated = !!intake.analystId;
  const facts = allocation
    ? [
        { label: 'Form no.', value: allocation.formNumber },
        { label: 'Analyst', value: allocation.analystName },
        { label: 'Allocated by', value: allocation.headName },
        { label: 'Allocated', value: allocation.allocatedAt },
      ]
    : [
        { label: 'Analyst', value: intake.analystAssigned ?? 'Not yet allocated' },
        { label: 'Status', value: allocated ? (loaded ? 'Allocated' : 'Loading…') : 'Waiting for the Head of Department' },
      ];

  return (
    <CaseStep
      id="work-allocation"
      step={1}
      icon={ClipboardSignature}
      title="Work allocation"
      description="Issued by the Head of Department when the sample is assigned. The Head keeps the original; the analyst gets a copy."
      status={allocated ? { label: 'Allocated', tone: 'emerald' } : { label: 'Not allocated', tone: 'amber' }}
      summary={facts}
    >
      <div className="space-y-3 px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{fact.label}</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-900 dark:text-white">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {allocation?.remarks && (
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Instructions</div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{allocation.remarks}</p>
          </div>
        )}
        {allocated && canView && (
          <Button size="sm" icon={Eye} onClick={onView}>Open allocation form</Button>
        )}
      </div>
    </CaseStep>
  );
};
