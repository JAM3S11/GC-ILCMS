import React from 'react';
import { CheckCircle2, Droplets, FileText, FlaskConical, Inbox, Plus, UserCheck } from 'lucide-react';
import { User, WaterIntake } from '../../types';
import { formatKes } from '../../waterIntake';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  KpiCard,
  KpiGrid,
  MeterRow,
  Panel,
  StatusPill,
} from '../common/Dashboard';
import { WaterRegisterPanel } from './WaterRegisterPanel';
import { WaterIntakeEdit } from './WaterIntakeEditModal';

/**
 * Water & Environment laboratory page. Everything here is derived from the
 * Water exhibit register (the database-backed intakes), not sample data.
 */

interface WaterLaboratoryViewProps {
  intakes: WaterIntake[];
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  officers: Pick<User, 'id' | 'name'>[];
  onOpenIntake?: () => void;
  onApprove: (intakeId: string) => void;
  onAssign: (intakeId: string, officerId: string) => void;
  onComplete: (intakeId: string) => void;
  onEdit?: (intakeId: string, edit: WaterIntakeEdit) => Promise<boolean>;
  onDelete?: (intakeId: string) => void;
}

const tally = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

export const WaterLaboratoryView: React.FC<WaterLaboratoryViewProps> = ({
  intakes,
  currentUser,
  officers,
  onOpenIntake,
  onApprove,
  onAssign,
  onComplete,
  onEdit,
  onDelete,
}) => {
  const awaitingApproval = intakes.filter((i) => i.status === 'Awaiting Approval').length;
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment').length;
  const underAnalysis = intakes.filter((i) => i.status === 'Under Analysis').length;
  const complete = intakes.filter((i) => i.status === 'Analysis Complete').length;
  const mine = intakes.filter((i) => i.analysisOfficerId === currentUser.id && i.status === 'Under Analysis').length;
  const revenue = intakes.reduce((sum, i) => sum + (i.charges || 0), 0);

  const byTest = tally(intakes.map((i) => i.testType));
  const bySource = tally(intakes.map((i) => i.sourceCategory));

  // Workload: exhibits currently under analysis, per assigned officer.
  const workload = tally(
    intakes.filter((i) => i.status === 'Under Analysis' && i.analysisOfficer).map((i) => i.analysisOfficer as string),
  );

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', 'Water']}
        title="Water & Environment laboratory"
        description="Exhibits received, assigned and analysed by the Water and Environment laboratory."
        meta={<StatusPill tone="emerald" pulse>Live register</StatusPill>}
        actions={
          onOpenIntake && (
            <Button variant="primary" icon={Plus} onClick={onOpenIntake} id="btn-open-intake-modal">
              Exhibit intake
            </Button>
          )
        }
      />

      <KpiGrid label="Water laboratory metrics">
        <KpiCard label="Awaiting approval" value={awaitingApproval} icon={FileText} tone="rose" hint="Documents to review" />
        <KpiCard label="Awaiting assignment" value={awaiting} icon={Inbox} tone="amber" hint="Need an Analysis Officer" />
        <KpiCard
          label="Under analysis"
          value={underAnalysis}
          icon={FlaskConical}
          tone="sky"
          hint={mine > 0 ? `${mine} assigned to you` : 'In progress in the lab'}
        />
        <KpiCard label="Analysis complete" value={complete} icon={CheckCircle2} tone="emerald" hint="Finished exhibits" />
        <KpiCard
          label="Total exhibits"
          value={intakes.length}
          icon={Droplets}
          tone="violet"
          hint={`${formatKes(revenue)} in charges`}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <WaterRegisterPanel
            intakes={intakes}
            currentUser={currentUser}
            officers={officers}
            onApprove={onApprove}
            onAssign={onAssign}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Panel icon={UserCheck} tone="sky" title="Officer workload" description="Exhibits under analysis">
            {workload.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No exhibits are currently under analysis.</p>
            ) : (
              <div className="space-y-3.5">
                {workload.map(([name, count]) => (
                  <MeterRow key={name} label={name} value={count} total={Math.max(1, underAnalysis)} tone="sky" />
                ))}
              </div>
            )}
          </Panel>

          <Panel icon={FlaskConical} tone="amber" title="By type of test" description={`${intakes.length} exhibits`}>
            {byTest.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No exhibits registered yet.</p>
            ) : (
              <div className="space-y-3.5">
                {byTest.map(([label, count]) => (
                  <MeterRow key={label} label={label} value={count} total={intakes.length} tone="amber" />
                ))}
              </div>
            )}
          </Panel>

          <Panel icon={FileText} tone="emerald" title="By source of locality" description={`${intakes.length} exhibits`}>
            {bySource.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No exhibits registered yet.</p>
            ) : (
              <div className="space-y-3.5">
                {bySource.map(([label, count]) => (
                  <MeterRow key={label} label={label} value={count} total={intakes.length} tone="emerald" />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </DashboardPage>
  );
};
