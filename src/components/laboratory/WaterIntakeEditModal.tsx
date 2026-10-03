import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { User, WaterIntake, WaterSourceCategory, WaterTestType } from '../../types';
import {
  WATER_DISCHARGE_DESTINATIONS,
  WATER_SOURCE_CATEGORIES,
  WATER_SOURCE_INFO,
  WATER_SPECIFIC_PARAMETERS,
  WATER_TEST_TYPES,
  formatKes,
  waterTestCharge,
} from '../../waterIntake';
import { Select } from '../common/Select';
import { Field, inputCls } from './IntakeFormParts';
import { IntakeEditDialog } from './IntakeEditDialog';

export interface WaterIntakeEdit {
  receivingOfficerId: string;
  dateReceived: string;
  testType: WaterTestType;
  specificParameters: string[];
  sourceCategory: WaterSourceCategory;
  sourceType: string;
  locationFrom: string;
  dischargeTo?: string;
  receiptNumber?: string;
}

interface WaterIntakeEditModalProps {
  intake: WaterIntake;
  officers: Pick<User, 'id' | 'name'>[];
  onSave: (intakeId: string, edit: WaterIntakeEdit) => Promise<boolean>;
  onClose: () => void;
}

/** One-time correction of a Water intake. Sender details stay as reception recorded them. */
export const WaterIntakeEditModal: React.FC<WaterIntakeEditModalProps> = ({ intake, officers, onSave, onClose }) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
  const [receivingOfficerId, setReceivingOfficerId] = useState(intake.receivingOfficerId ?? '');
  const [dateReceived, setDateReceived] = useState(intake.dateReceived);
  const [testType, setTestType] = useState<WaterTestType>(intake.testType);
  const [parameters, setParameters] = useState<string[]>(intake.specificParameters ?? []);
  const [sourceCategory, setSourceCategory] = useState<WaterSourceCategory>(intake.sourceCategory);
  const [sourceType, setSourceType] = useState(intake.sourceType);
  const [locationFrom, setLocationFrom] = useState(intake.locationFrom);
  const [dischargeTo, setDischargeTo] = useState(intake.dischargeTo ?? '');
  const [receiptNumber, setReceiptNumber] = useState(intake.receiptNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEffluent = sourceCategory === 'Effluent Water';
  const receiverOptions = officers.some((o) => o.id === intake.receivingOfficerId) || !intake.receivingOfficerId
    ? officers
    : [{ id: intake.receivingOfficerId, name: intake.receivingOfficer }, ...officers];
  const parameterChoices = [...new Set([...WATER_SPECIFIC_PARAMETERS, ...(intake.specificParameters ?? [])])];
  const charge = waterTestCharge(testType, intake.senderType);

  const canSave =
    !!receivingOfficerId &&
    dateReceived !== '' && dateReceived <= today &&
    (testType === 'Full Chemical Analysis' || parameters.length > 0) &&
    sourceType !== '' &&
    locationFrom.trim().length >= 2 &&
    (!isEffluent || dischargeTo !== '');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await onSave(intake.id, {
        receivingOfficerId,
        dateReceived,
        testType,
        specificParameters: testType === 'Specific Chemical Analysis' ? parameters : [],
        sourceCategory,
        sourceType,
        locationFrom: locationFrom.trim(),
        dischargeTo: isEffluent ? dischargeTo : undefined,
        receiptNumber: receiptNumber.trim() || undefined,
      });
      if (saved) onClose();
      else setError('The intake could not be saved. It may already have been edited or moved to analysis.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The intake could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleParameter = (p: string) =>
    setParameters((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <IntakeEditDialog
      title={`Edit ${intake.labReference}`}
      subtitle={`Sender: ${intake.senderName} (read only, from reception)`}
      saving={saving}
      canSave={canSave}
      error={error}
      onSave={() => void save()}
      onClose={onClose}
    >
      <Field label="Receiving officer" required>
        <Select
          aria-label="Receiving officer"
          value={receivingOfficerId}
          onChange={setReceivingOfficerId}
          placeholder="Select officer…"
          options={receiverOptions.map((o) => ({ value: o.id, label: o.name }))}
        />
      </Field>
      <Field label="Date of receiving" required error={dateReceived > today} hint={dateReceived > today ? 'Cannot be in the future' : undefined}>
        <input type="date" max={today} value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className={inputCls} />
      </Field>

      <Field label="Type of test" required hint={`Charges ${formatKes(charge)}`}>
        <Select
          aria-label="Type of test"
          value={testType}
          onChange={(value) => setTestType(value as WaterTestType)}
          options={WATER_TEST_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </Field>
      <Field label="Payment receipt no." hint="Optional">
        <input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} className={`${inputCls} font-mono`} />
      </Field>

      {testType === 'Specific Chemical Analysis' && (
        <div className="space-y-2 sm:col-span-2">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Parameters to test <span className="text-rose-500">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {parameterChoices.map((p) => {
              const on = parameters.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleParameter(p)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Field label="Source of locality" required>
        <Select
          aria-label="Source of locality"
          value={sourceCategory}
          onChange={(value) => {
            setSourceCategory(value as WaterSourceCategory);
            setSourceType('');
            setDischargeTo('');
          }}
          options={WATER_SOURCE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field label="Source type" required>
        <Select
          aria-label="Source type"
          value={sourceType}
          onChange={setSourceType}
          placeholder="Select source type…"
          options={WATER_SOURCE_INFO[sourceCategory].sourceTypes.map((s) => ({ value: s, label: s }))}
        />
      </Field>
      <Field label="Location (from)" required className={isEffluent ? '' : 'sm:col-span-2'}>
        <input value={locationFrom} onChange={(e) => setLocationFrom(e.target.value)} className={inputCls} />
      </Field>
      {isEffluent && (
        <Field label="Discharged to" required>
          <Select
            aria-label="Discharged to"
            value={dischargeTo}
            onChange={setDischargeTo}
            placeholder="Select destination…"
            options={WATER_DISCHARGE_DESTINATIONS.map((d) => ({ value: d, label: d }))}
          />
        </Field>
      )}
    </IntakeEditDialog>
  );
};
