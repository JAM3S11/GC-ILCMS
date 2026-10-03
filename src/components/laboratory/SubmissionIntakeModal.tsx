import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Archive,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  ExhibitItem,
  FoodDrugIntake,
  LaboratoryDepartment,
  OfficerVisitor,
  ForensicCase,
} from '../../types';
import { LABORATORY_DEPARTMENTS, departmentLabel } from '../../lib/departments';
import { Select } from '../common/Select';

interface SubmissionIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: ForensicCase;
  visitor: OfficerVisitor;
  receivingAnalystName: string;
  onSaveIntake: (submissionData: {
    caseNumber: string;
    submissionType: string;
    description: string;
    dateReceived: string;
    receivedFrom: string;
    receivedBy: string;
    department: LaboratoryDepartment;
    storageLocation: string;
    supportingDocuments: string;
    remarks: string;
    exhibits: ExhibitItem[];
    /** Food & Drugs samples are registered on their own page (FoodDrugIntakePage). */
    foodDrugIntake?: FoodDrugIntake;
  }) => void;
}

export const SubmissionIntakeModal: React.FC<SubmissionIntakeModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  visitor,
  receivingAnalystName,
  onSaveIntake,
}) => {
  // Case & Submission general metadata
  const [caseNumber, setCaseNumber] = useState(activeCase.caseNumber);
  const [submissionType, setSubmissionType] = useState('Police Seizure / Court Evidence');
  const [description, setDescription] = useState(
    'Suspected narcotic substance seized from suspects during interdiction at Kilindini Port Container Terminal.'
  );
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  // Locked to the reception record: police officers by badge and station,
  // everyone else by organisation.
  const receivedFrom = visitor.visitorType === 'POLICE_OFFICER'
    ? `${visitor.officerName} (Badge ${visitor.badgeNumber}, ${visitor.station})`
    : `${visitor.officerName} (${visitor.station})`;
  const [receivedBy, setReceivedBy] = useState(receivingAnalystName);
  const [department, setDepartment] = useState<LaboratoryDepartment>(visitor.laboratory || 'Narcotics');
  const [storageLocation, setStorageLocation] = useState('Evidence Vault Locker V-04 (Climate Controlled)');
  const [supportingDocuments, setSupportingDocuments] = useState(
    'Police Form P-78 (Forensic Request), Seizure Memo Ref CPS/CR/842/2026, Station OB 44/11/09/2026 Extract'
  );
  const [remarks, setRemarks] = useState(
    'Physical evidence tamper-evident seals intact upon receipt. Admitted into Laboratory Receiving Bay for immediate sub-sampling.'
  );

  // Dynamic Exhibits List (Supporting Multiple Exhibits)
  const [exhibitsList, setExhibitsList] = useState<
    Array<{
      id: string;
      description: string;
      sampleDescription: string;
      numberOfItems: number;
      packaging: string;
      sealNumber: string;
      markings: string;
      condition: 'Intact & Sealed' | 'Compromised' | 'Damaged' | 'Resealed';
      storageLocation: string;
    }>
  >([
    {
      id: `EXH-${String(activeCase.exhibits.length + 1).padStart(4, '0')}`,
      description: 'Compressed off-white crystalline chunk wrapped in clear polythene sheeting',
      sampleDescription: 'Representative sub-sample crystalline powder (~50 mg) for GC-MS and UV-Vis spectroscopy',
      numberOfItems: 1,
      packaging: 'Tamper-Evident Evidence Bag (Heavy duty Polyethylene)',
      sealNumber: 'KP-SEAL-89211',
      markings: 'Marked "EXH-A" with black permanent marker; Signed by Insp. J. Kamau',
      condition: 'Intact & Sealed',
      storageLocation: 'Vault Locker V-04',
    },
  ]);

  if (!isOpen) return null;

  const handleAddExhibitRow = () => {
    const nextIdx = exhibitsList.length + 1;
    setExhibitsList((prev) => [
      ...prev,
      {
        id: `EXH-${String(activeCase.exhibits.length + nextIdx).padStart(4, '0')}`,
        description: 'Additional seized parcel / exhibit item',
        sampleDescription: 'Sub-sample aliquot taken for confirmatory instrumental analysis',
        numberOfItems: 1,
        packaging: 'Tamper-Evident Evidence Bag with Barcode',
        sealNumber: `KP-SEAL-${Math.floor(10000 + Math.random() * 90000)}`,
        markings: `Marked "EXH-${String.fromCharCode(64 + nextIdx)}"`,
        condition: 'Intact & Sealed',
        storageLocation: 'Vault Locker V-04',
      },
    ]);
  };

  const handleRemoveExhibitRow = (index: number) => {
    if (exhibitsList.length <= 1) return;
    setExhibitsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateExhibit = (index: number, field: string, value: any) => {
    setExhibitsList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map to ExhibitItem array
    const compiledExhibits: ExhibitItem[] = exhibitsList.map((ex) => ({
      id: ex.id,
      caseId: activeCase.id,
      description: ex.description,
      submissionType,
      numberOfItems: ex.numberOfItems,
      packaging: ex.packaging,
      sealNumber: ex.sealNumber,
      markings: ex.markings,
      condition: ex.condition,
      storageLocation: ex.storageLocation,
      dateReceived,
      receivedFrom,
      receivedBy,
      laboratory: department,
      supportingDocuments,
      remarks,
    }));

    onSaveIntake({
      caseNumber,
      submissionType,
      description,
      dateReceived,
      receivedFrom,
      receivedBy,
      department,
      storageLocation,
      supportingDocuments,
      remarks,
      exhibits: compiledExhibits,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Formal Submission &amp; Exhibit Intake</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  SECTION 9 PROTOCOL
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official evidence admission into {departmentLabel(department)} Laboratory under Cap 245 Laws of Kenya.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-1 flex-1 text-xs">
          {/* Section A: Case & Submission Overview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-2">
              <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>1. Submission Case Metadata</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Total Exhibits in Batch: {exhibitsList.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Case / Reference Number</label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-400 font-mono font-bold focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Submission Type</label>
                <Select
                  size="sm"
                  value={submissionType}
                  onChange={setSubmissionType}
                  aria-label="Submission type"
                  options={[
                    'Police Seizure / Court Evidence',
                    'Coroner Referral / Inquest',
                    'Customs & Border Interdiction',
                    'Regulatory Inspection (PPB)',
                    'Judicial Order Examination',
                  ].map((t) => ({ value: t, label: t }))}
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Assigned Laboratory</label>
                <Select<LaboratoryDepartment>
                  size="sm"
                  value={department}
                  onChange={setDepartment}
                  aria-label="Assigned laboratory"
                  // Samples are only ever routed to one of the eight working laboratories;
// General Administration is a staff unit, not a destination for a submission.
                  options={LABORATORY_DEPARTMENTS.map((d) => ({ value: d, label: departmentLabel(d) }))}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Submission Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Date Received</label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Received From (Client)</label>
                <input
                  type="text"
                  value={receivedFrom}
                  readOnly
                  aria-readonly="true"
                  title="Captured at reception — cannot be edited"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Received By (Analyst)</label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Primary Storage Location</label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Supporting Documents Brought</label>
                <input
                  type="text"
                  value={supportingDocuments}
                  onChange={(e) => setSupportingDocuments(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">General Custody Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Multiple Exhibits / Samples Intake */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-2">
              <div>
                <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>2. Physical Exhibit Items (Multiple Exhibits Allowed)</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Record description, packaging, seal numbers, markings, condition, and sample descriptions for each exhibit.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddExhibitRow}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto border border-slate-300 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Exhibit</span>
              </button>
            </div>

            {/* Exhibits List Cards */}
            <div className="space-y-4">
              {exhibitsList.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {ex.id}
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold text-xs">
                        Exhibit Item #{idx + 1}
                      </span>
                    </div>

                    {exhibitsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExhibitRow(idx)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove exhibit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Exhibit Description</label>
                      <input
                        type="text"
                        value={ex.description}
                        onChange={(e) => handleUpdateExhibit(idx, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                        placeholder="e.g. Compressed off-white crystalline chunk"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Number of Items</label>
                      <input
                        type="number"
                        min="1"
                        value={ex.numberOfItems}
                        onChange={(e) =>
                          handleUpdateExhibit(idx, 'numberOfItems', parseInt(e.target.value) || 1)
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:border-amber-400 outline-none"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Sample Description</label>
                      <input
                        type="text"
                        value={ex.sampleDescription}
                        onChange={(e) => handleUpdateExhibit(idx, 'sampleDescription', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                        placeholder="e.g. Representative sub-sample powder taken for GC-MS & UV-Vis screening"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Packaging</label>
                      <input
                        type="text"
                        value={ex.packaging}
                        onChange={(e) => handleUpdateExhibit(idx, 'packaging', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                        placeholder="e.g. Tamper-Evident Evidence Bag"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Seal Number</label>
                      <input
                        type="text"
                        value={ex.sealNumber}
                        onChange={(e) => handleUpdateExhibit(idx, 'sealNumber', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:border-amber-400 outline-none"
                        placeholder="e.g. KP-SEAL-89211"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Condition</label>
                      <Select<ExhibitItem['condition']>
                        size="sm"
                        value={ex.condition}
                        onChange={(condition) => handleUpdateExhibit(idx, 'condition', condition)}
                        aria-label="Exhibit condition"
                        options={(['Intact & Sealed', 'Resealed', 'Compromised', 'Damaged'] as const).map((c) => ({
                          value: c,
                          label: c,
                        }))}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Markings</label>
                      <input
                        type="text"
                        value={ex.markings}
                        onChange={(e) => handleUpdateExhibit(idx, 'markings', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                        placeholder='e.g. Marked "EXH-A" with black permanent marker'
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Storage Location</label>
                      <input
                        type="text"
                        value={ex.storageLocation}
                        onChange={(e) => handleUpdateExhibit(idx, 'storageLocation', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs w-full sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Register Submission &amp; Bind to Digital Case File</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
