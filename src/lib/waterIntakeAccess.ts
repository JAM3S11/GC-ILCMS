import { User, WaterIntake } from '../types';

/** The intake fields saved through the exhibit intake form (everything except the sender). */
export interface WaterIntakeEdit {
  receivingOfficerId: string;
  dateReceived: string;
  dateSampled?: string;
  testType: WaterIntake['testType'];
  specificParameters: string[];
  sourceCategory: WaterIntake['sourceCategory'];
  sourceType: string;
  locationFrom: string;
  dischargeTo?: string;
  receiptNumber?: string;
}

/** The sender (client) fields saved through the exhibit intake form. */
export interface WaterSenderEdit {
  senderName: string;
  senderAddress: string;
  senderMobile?: string;
  contactPerson?: string;
  contactPersonMobile?: string;
}

export interface WaterEditAccess {
  /** May change the receipt, test, source and charge details. */
  intake: boolean;
  /** May change who sent the exhibit. */
  sender: boolean;
  /** Analysis has started: the intake part can only fill in details that were left out. */
  fillInOnly: boolean;
}

/**
 * Who may change what on a Water intake. The server enforces the same rules; this
 * only decides what the form lets the person touch.
 *
 * - The officer who received the exhibit: the intake details, once, at any stage before completion.
 * - The Head of Water & Environment: the intake details before analysis starts, and the
 *   sender details until the analysis is complete.
 * - Reception: the sender details until the analysis is complete.
 * - While analysis is under way, the Head (and a receiver who has used their edit) can still fill in blanks.
 * - Nothing changes once the analysis is complete.
 */
export const waterEditAccess = (
  user: Pick<User, 'id' | 'role' | 'department'> | null | undefined,
  intake: WaterIntake,
): WaterEditAccess => {
  const none = { intake: false, sender: false, fillInOnly: false };
  if (!user || intake.status === 'Analysis Complete') return none;

  const isReceiver = !!intake.receivingOfficerId && intake.receivingOfficerId === user.id;
  const isHead = user.role === 'HEAD_OF_DEPARTMENT' && user.department === 'Water';
  const isReception = user.role === 'RECEPTIONIST';
  const beforeAnalysis = intake.status === 'Awaiting Approval' || intake.status === 'Awaiting Assignment';

  // The receiver's one edit also covers the time after analysis has started.
  const fullIntake = (isReceiver && !intake.edited) || (isHead && beforeAnalysis);
  const missingInfo = !intake.dateSampled || !intake.receiptNumber;
  const fillIn = intake.status === 'Under Analysis' && missingInfo && (isReceiver || isHead);

  return {
    intake: fullIntake || fillIn,
    sender: isHead || isReception,
    fillInOnly: fillIn && !fullIntake,
  };
};

export const canEditWaterIntake = (access: WaterEditAccess) => access.intake || access.sender;

/** Only the Head of Water & Environment prints (and so issues) the certificate. */
export const canPrintWaterCertificate = (user: Pick<User, 'role' | 'department'> | null | undefined) =>
  !!user && user.role === 'HEAD_OF_DEPARTMENT' && user.department === 'Water';

/**
 * Who may enter or correct the test results: the assigned officer and the Water Head, from
 * the time the exhibit is under analysis. Once the certificate has been issued only the Head can.
 */
export const canEditWaterResults = (
  user: Pick<User, 'id' | 'role' | 'department'> | null | undefined,
  intake: WaterIntake,
): boolean => {
  if (!user) return false;
  if (intake.status !== 'Under Analysis' && intake.status !== 'Analysis Complete') return false;
  const isHead = canPrintWaterCertificate(user);
  const isAssigned = !!intake.analysisOfficerId && intake.analysisOfficerId === user.id;
  if (intake.certificateIssuedAt) return isHead;
  return isHead || isAssigned;
};
