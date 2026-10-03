import React, { useState } from 'react';
import { FoodDrugIntake, FoodDrugSampleType } from '../../types';
import { FOOD_DRUG_SAMPLE_TYPES } from '../../foodDrugIntake';
import { Select } from '../common/Select';
import { Field, inputCls } from './IntakeFormParts';
import { IntakeEditDialog } from './IntakeEditDialog';

export interface FoodDrugIntakeEdit {
  sampleType: FoodDrugSampleType;
  receiver: string;
}

interface FoodDrugIntakeEditModalProps {
  intake: FoodDrugIntake;
  onSave: (intakeId: string, edit: FoodDrugIntakeEdit) => void;
  onClose: () => void;
}

/** One-time correction of a Food & Drugs intake. Client details stay as reception recorded them. */
export const FoodDrugIntakeEditModal: React.FC<FoodDrugIntakeEditModalProps> = ({ intake, onSave, onClose }) => {
  const [sampleType, setSampleType] = useState<FoodDrugSampleType>(intake.sampleType);
  const [receiver, setReceiver] = useState(intake.receiver);

  return (
    <IntakeEditDialog
      title={`Edit ${intake.id}`}
      subtitle={`Client: ${intake.clientName} (read only, from reception)`}
      canSave={receiver.trim() !== ''}
      onSave={() => {
        onSave(intake.id, { sampleType, receiver: receiver.trim() });
        onClose();
      }}
      onClose={onClose}
    >
      <Field label="Sample type" required>
        <Select
          aria-label="Sample type"
          value={sampleType}
          onChange={(value) => setSampleType(value as FoodDrugSampleType)}
          options={FOOD_DRUG_SAMPLE_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </Field>
      <Field label="Receiver" required>
        <input value={receiver} onChange={(e) => setReceiver(e.target.value)} className={inputCls} />
      </Field>
    </IntakeEditDialog>
  );
};
