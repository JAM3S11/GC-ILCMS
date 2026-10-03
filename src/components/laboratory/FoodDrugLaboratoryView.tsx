import React from 'react';
import { CheckCircle2, ClipboardList, FileCheck, Inbox, Plus, TestTube, UserCheck } from 'lucide-react';
import { FoodDrugIntake, User } from '../../types';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  KpiCard,
  KpiGrid,
  Panel,
  StatusPill,
} from '../common/Dashboard';
import { FoodDrugRegisterPanel } from './FoodDrugRegisterPanel';
import { FoodDrugIntakeEdit } from './FoodDrugIntakeEditModal';

/**
 * Food & Drugs laboratory page shown when no reception visitor is active. The
 * Head of Section approves submitted documents, assigns an officer, and the
 * assigned officer records the result.
 */

interface FoodDrugLaboratoryViewProps {
  intakes: FoodDrugIntake[];
  currentUser: Pick<User, 'name' | 'role'>;
  officers: Pick<User, 'id' | 'name'>[];
  onOpenIntake?: () => void;
  onApprove: (intakeId: string) => void;
  onAssign: (intakeId: string, analyst: string) => void;
  onReport: (intakeId: string, reportedBy: string) => void;
  onEdit?: (intakeId: string, edit: FoodDrugIntakeEdit) => void;
  onDelete?: (intakeId: string) => void;
}

export const FoodDrugLaboratoryView: React.FC<FoodDrugLaboratoryViewProps> = ({
  intakes,
  currentUser,
  officers,
  onOpenIntake,
  onApprove,
  onAssign,
  onReport,
  onEdit,
  onDelete,
}) => {
  const awaitingApproval = intakes.filter((i) => i.status === 'Awaiting Approval').length;
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment').length;
  const underAnalysis = intakes.filter((i) => i.status === 'Under Analysis').length;
  const reported = intakes.filter((i) => i.status === 'Reported').length;

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', 'Food & Drugs']}
        title="Food, Drugs and Chemical Substances laboratory"
        description="Samples registered, approved and analysed by the Food & Drugs section."
        meta={<StatusPill tone="emerald" pulse>Live register</StatusPill>}
        actions={
          onOpenIntake && (
            <Button variant="primary" icon={Plus} onClick={onOpenIntake}>
              Register sample
            </Button>
          )
        }
      />

      <KpiGrid label="Food & Drugs laboratory metrics">
        <KpiCard label="Awaiting approval" value={awaitingApproval} icon={ClipboardList} tone="rose" hint="Documents to review" />
        <KpiCard label="Awaiting assignment" value={awaiting} icon={Inbox} tone="amber" hint="Need an officer" />
        <KpiCard label="Under analysis" value={underAnalysis} icon={TestTube} tone="sky" hint="In progress in the lab" />
        <KpiCard label="Reported" value={reported} icon={CheckCircle2} tone="emerald" hint="Analysis recorded" />
      </KpiGrid>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <FoodDrugRegisterPanel
            intakes={intakes}
            currentUser={currentUser}
            officers={officers}
            onApprove={onApprove}
            onAssign={onAssign}
            onReport={onReport}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Panel icon={UserCheck} tone="amber" title="Workflow" description="Receiver → Head → Analyst">
            <ol className="space-y-3 text-xs">
              {[
                { title: 'Registered', text: 'Reception adds the record and stores the sample.' },
                { title: 'Documents approved', text: 'The Head of Section reviews and approves the submission.' },
                { title: 'Officer assigned', text: 'The Head assigns a Food & Drugs officer to analyse it.' },
                { title: 'Analysed & reported', text: 'The officer records who reported the result.' },
              ].map((step) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    <FileCheck className="h-3 w-3" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{step.title}</div>
                    <div className="text-slate-500 dark:text-slate-400">{step.text}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </DashboardPage>
  );
};
