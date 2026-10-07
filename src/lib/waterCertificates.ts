import { WaterIntake } from '../types';
import { WaterTestEntry } from './waterTestParameters';

/** What the server froze and signed when the certificate was issued (see certificates.js). */
export interface CertificateSnapshot {
  schema: number;
  type: string;
  certificate: {
    serial: string;
    version: number;
    verificationId: string;
    issuedAt: string;
    /** Africa/Nairobi date of issue, 'YYYY-MM-DD'; the date printed on the certificate. */
    issuedDate: string;
  };
  document: {
    exhibitId: string;
    labReference: string;
    sealNumber: string | null;
    senderName: string;
    senderAddress: string;
    sourceCategory: string | null;
    sourceType: string | null;
    locationFrom: string | null;
    dischargeTo: string | null;
    dateReceived: string | null;
    dateSampled: string | null;
    testType: string | null;
    analysisOfficer: string | null;
    approvedBy: string;
    results: Record<string, WaterTestEntry>;
    remarks: string;
  };
}

export type CertificateStatus = 'CURRENT' | 'SUPERSEDED' | 'REVOKED';

/** An issued certificate as staff see it in the case file. */
export interface WaterCertificate {
  id: string;
  serial: string;
  version: number;
  verificationId: string;
  verifyUrl: string;
  status: CertificateStatus;
  issuedAt: string;
  issuedBy: string;
  shortCode: string;
  snapshotHash: string;
  keyId: string;
  printCount: number;
  lastPrintedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  reissueReason: string | null;
  supersededAt: string | null;
  supersededBy: string | null;
  snapshot: CertificateSnapshot;
}

export interface WaterCertificateState {
  current: WaterCertificate | null;
  history: WaterCertificate[];
  /** The results or exhibit details have changed since the current certificate was issued. */
  outdated: boolean;
}

/** The public verify page's answer. */
export interface CertificateVerification {
  status: CertificateStatus | 'INVALID_SIGNATURE';
  serial: string;
  version: number;
  verificationId: string;
  issuedAt: string;
  shortCode: string;
  snapshotHash: string;
  signature: string;
  keyId: string;
  signatureValid: boolean;
  revokedAt: string | null;
  revokeReason: string | null;
  supersededAt: string | null;
  supersededBy: { serial: string; verificationId: string } | null;
  snapshot: CertificateSnapshot;
}

/** The exhibit fields the certificate prints. A live intake has them all. */
export type CertificateFields = Pick<
  WaterIntake,
  | 'exhibitId'
  | 'labReference'
  | 'senderName'
  | 'senderAddress'
  | 'sourceType'
  | 'locationFrom'
  | 'dischargeTo'
  | 'dateReceived'
  | 'dateSampled'
  | 'analysisOfficer'
  | 'certificateIssuedAt'
  | 'certificateIssuedBy'
>;

/** The printed fields of an issued certificate, read from its signed snapshot rather than the live exhibit. */
export const fieldsFromSnapshot = (snapshot: CertificateSnapshot): CertificateFields => {
  const doc = snapshot.document;
  return {
    exhibitId: doc.exhibitId,
    labReference: doc.labReference,
    senderName: doc.senderName,
    senderAddress: doc.senderAddress,
    sourceType: doc.sourceType ?? '',
    locationFrom: doc.locationFrom ?? '',
    dischargeTo: (doc.dischargeTo ?? undefined) as WaterIntake['dischargeTo'],
    dateReceived: doc.dateReceived ?? '',
    dateSampled: doc.dateSampled ?? undefined,
    analysisOfficer: doc.analysisOfficer ?? undefined,
    certificateIssuedAt: snapshot.certificate.issuedDate,
    certificateIssuedBy: doc.approvedBy,
  };
};
