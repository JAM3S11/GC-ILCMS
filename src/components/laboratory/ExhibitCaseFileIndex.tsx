import React from 'react';
import { CaseRegister } from './register/CaseRegister';
import { CaseRegistryOverview } from './register/CaseRegistryOverview';
import { CaseFileRegister } from './register/caseFileDepartments';

/**
 * The Super Admin's case files: the overview of every department with case files, or one
 * department's official case register. Opening a row shows the same case file the assigned
 * officer works in. Departments come from caseFileDepartments.ts and only appear once they
 * have case files.
 */

/** A department id from caseFileDepartments.ts, or null for the overview. */
export type Laboratory = string | null;

interface ExhibitCaseFileIndexProps {
  registers: CaseFileRegister[];
  isLoading?: boolean;
  /** Errors by department id. */
  errors?: Record<string, string>;
  laboratory: Laboratory;
  onLaboratoryChange: (laboratory: Laboratory) => void;
}

export const ExhibitCaseFileIndex: React.FC<ExhibitCaseFileIndexProps> = ({
  registers,
  isLoading = false,
  errors = {},
  laboratory,
  onLaboratoryChange,
}) => {
  const register = registers.find((item) => item.department.id === laboratory);
  if (!register) {
    return <CaseRegistryOverview registers={registers} isLoading={isLoading} onOpen={onLaboratoryChange} />;
  }
  const { department } = register;
  return (
    <CaseRegister
      key={department.id}
      laboratory={department.laboratory}
      unit={department.unit}
      statuses={department.stages}
      rows={register.rows}
      isLoading={isLoading}
      error={errors[department.id]}
      columns={department.columns}
      searchPlaceholder={department.searchPlaceholder}
      tabs={registers.map((item) => ({ id: item.department.id, label: item.department.label, open: item.open, overdue: item.overdue }))}
      activeTab={department.id}
      onTabChange={onLaboratoryChange}
      onBack={() => onLaboratoryChange(null)}
    />
  );
};
