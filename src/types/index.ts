export type UserRole =
  | 'CEO'
  | 'VICE_CEO'
  | 'ADMINISTRATOR'
  | 'CLERK'
  | 'ACCOUNTANT'
  | 'HR'
  | 'RECEPTIONIST'
  | 'HEAD_OF_DEPARTMENT'
  | 'SENIOR_CHEMIST'
  | 'ANALYST'
  | 'INTERN'
  | 'ATTACHEE'
  | 'QUALITY_MANAGER'
  | 'SUPER_ADMIN';

export type LaboratoryDepartment =
  | 'Narcotics'
  | 'Food & Drugs'
  | 'Criminalistic'
  | 'DNA'
  | 'Instruments'
  | 'Water'
  | 'Toxicology'
  | 'Procurement'
  // Staff who are not attached to one laboratory division. Kept as a real
  // value rather than a NULL department so "unit" is always answerable, while
  // still reading as institution-wide. See src/lib/departments.ts.
  | 'General Administration';

export interface User {
  id: string;
  name: string;
  email: string;

  role: UserRole;
  department?: LaboratoryDepartment;
  avatarUrl?: string;
}

export type CaseStatus =
  | 'RECEIVED'
  | 'REGISTERED'
  | 'AWAITING_ALLOCATION'
  | 'ALLOCATED'
  | 'IN_ANALYSIS'
  | 'RESULTS_AVAILABLE'
  | 'INTERPRETATION'
  | 'REPORT_DRAFT'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type CasePriority = 'CRITICAL' | 'HIGH' | 'ROUTINE' | 'EXPEDITED';

export type VisitorType = 'POLICE_OFFICER' | 'GENERAL_CLIENT';

export interface ReceptionVisitDraft {
  visitorType: VisitorType;
  officerName: string;
  nationalId: string;
  phone: string;
  badgeNumber?: string;
  station: string;
  poBox?: string;
  vehicleRegistration?: string;
  laboratory: LaboratoryDepartment;
  purposeOfVisit: string;
  documentsPresented: string;
  exhibitsPresented: string;
}

export interface OfficerVisitor {
  id: string;
  visitNumber: string;
  date: string;
  arrivedAt: string;
  visitorType: VisitorType;
  officerName: string;
  nationalId: string;
  phone: string;
  badgeNumber?: string;
  station: string;
  poBox?: string; // Postal address, captured for Food & Drugs submissions
  vehicleRegistration?: string;
  laboratory: LaboratoryDepartment;
  labNotificationSentAt?: string | null;
  labNotificationSeen?: boolean;
  /** The lab has registered this visitor's exhibit intake; reception can no longer resend. */
  labIntakeRegistered?: boolean;
  timeIn: string;
  timeOut?: string;
  purposeOfVisit: string;
  documentsPresented: string;
  documentsVerified?: string[];
  exhibitsPresented: string;
  receptionistName: string;
  signatureCaptured: boolean;
  status: 'Awaiting Laboratory Reception' | 'In Laboratory' | 'Completed' | 'Departed';
}

export interface ExhibitItem {
  id: string; // e.g. EXH-0001
  caseId: string;
  description: string;
  submissionType: string;
  numberOfItems: number;
  packaging: string;
  sealNumber: string;
  markings: string;
  condition: 'Intact & Sealed' | 'Compromised' | 'Damaged' | 'Resealed';
  storageLocation: string;
  dateReceived: string;
  receivedFrom: string;
  receivedBy: string;
  laboratory: LaboratoryDepartment;
  supportingDocuments?: string;
  remarks?: string;
}

export interface SampleItem {
  id: string; // e.g. SMP-0001
  exhibitId: string;
  caseId: string;
  sampleDescription: string;
  quantityTaken: string;
  aliquotDate: string;
  preparedBy: string;
  storageCondition: string;
  status: 'Awaiting Analysis' | 'In Testing' | 'Analyzed' | 'Archived';
}

/**
 * Food & Drugs intake (mycotoxin / food quality samples).
 * Captured by the department's own 4-step procedure rather than the
 * generic narcotics exhibit intake form.
 */
export type FoodDrugSampleType = 'Aflatoxin' | 'Miscellaneous' | 'Mycotoxins';

/**
 * Registration ends at the Receiver. The Head of Section then approves the
 * submitted documents, assigns an officer, and "Reported By" is recorded only
 * once the analysis is done.
 */
export type FoodDrugIntakeStatus = 'Awaiting Approval' | 'Awaiting Assignment' | 'Under Analysis' | 'Reported';

export interface FoodDrugIntake {
  id: string; // sample number from the database, e.g. FDI-2026-001
  caseId?: string;
  exhibitId: string; // links to the auto-generated ExhibitItem
  clientName: string; // Full name of the person bringing the sample
  nationalId: string; // digits only, max 8
  poBox: string; // P.O Box address format
  sampleType: FoodDrugSampleType;
  receiver: string; // staff who received the sample
  intakeDate: string;
  status: FoodDrugIntakeStatus;
  approvedBy?: string; // Head of Section who approved the submitted documents
  approvedDate?: string;
  analystAssigned?: string; // Food & Drugs officer (main process), set by the Head
  analystId?: string;
  sealNumber?: string;
  receiptFormSaved?: boolean;
  worksheetStatus?: 'Draft' | 'Awaiting check' | 'Checked' | null;
  receptionVisitId?: string;
  notes?: string;
  createdAt?: string;
  assignedBy?: string;
  assignedDate?: string;
  reportedBy?: string; // final step, after analysis is complete
  reportedDate?: string;
  edited?: boolean; // an intake can be edited once, before analysis starts
  editedDate?: string;
}

/**
 * Water & Environment exhibit intake. Registration ends at the Receiving
 * Officer and Charges; the Head of Water & Environment then assigns the
 * Analysis Officer, and every officer in the department can see who holds it.
 */
export type WaterSenderType = 'Individual' | 'Organisation';
export type WaterTestType = 'Full Chemical Analysis' | 'Specific Chemical Analysis';
export type WaterSourceCategory = 'Potable Water' | 'Effluent Water';
export type WaterIntakeStatus = 'Awaiting Approval' | 'Awaiting Assignment' | 'Under Analysis' | 'Analysis Complete';

export interface WaterIntake {
  id: string; // PostgreSQL UUID
  labReference: string; // e.g. GC/MOI/WAT/VOL I/001/2026
  caseId?: string;
  exhibitId: string; // database-generated Water exhibit number
  sealNumber?: string;
  packaging?: string;
  condition?: ExhibitItem['condition'];
  storageLocation?: string;
  receptionVisitId?: string;
  senderType: WaterSenderType;
  senderName: string; // individual's full name, or organisation / firm name
  senderAddress: string; // P.O Box format for individuals
  senderMobile?: string; // individuals
  contactPerson?: string; // organisations
  contactPersonMobile?: string; // organisations, optional
  receivingOfficerId?: string;
  receivingOfficer: string;
  dateReceived: string;
  /** When the sample was taken; blank on exhibits registered before this was recorded. */
  dateSampled?: string;
  supportingDocuments?: string;
  remarks?: string;
  testType: WaterTestType;
  specificParameters?: string[]; // Specific Chemical Analysis only
  sourceCategory: WaterSourceCategory;
  sourceType: string;
  locationFrom: string;
  dischargeTo?: string; // Effluent only, e.g. Public Sewer or Environment
  charges: number; // KES
  receiptNumber?: string;
  status: WaterIntakeStatus;
  approvedBy?: string; // Head who approved the submitted documents
  approvedDate?: string;
  analysisOfficer?: string; // set by the Head of Water & Environment
  analysisOfficerId?: string;
  assignedBy?: string;
  assignedDate?: string;
  completedBy?: string;
  completedDate?: string;
  edited?: boolean; // an intake can be edited once, before analysis starts
  editedDate?: string;
  /** What the analysis found, recorded by the assigned officer while under analysis. */
  findings?: string;
  /** Structured physical and chemical test results entered in the case file. */
  findingsResults?: { results: Record<string, { result: string; report: string }>; remarks?: string } | null;
  /** Africa/Nairobi wall-clock time, 'YYYY-MM-DD HH24:MI:SS'. */
  findingsRecordedAt?: string;
  findingsRecordedBy?: string;
  findingsRecordedById?: string;
  /** Set when the Head prints the certificate; after that only the Head can change the results. */
  certificateIssuedAt?: string;
  certificateIssuedBy?: string;
  /** The Head's tick that the intake documents are fine; the memo can only be approved while it is set. */
  documentsConfirmedAt?: string;
  documentsConfirmedBy?: string;
}

export type WaterIntakeEventType =
  | 'REGISTERED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'TRANSFERRED'
  | 'ANALYSIS_COMPLETED'
  | 'FINDINGS_RECORDED'
  | 'CERTIFICATE_ISSUED'
  | 'CERTIFICATE_REISSUED'
  | 'CERTIFICATE_REVOKED'
  | 'EDITED'
  | 'DELETED';

/** One recorded transition in an exhibit's process, as stored in water_exhibit_intake_events. */
export interface WaterIntakeEvent {
  eventType: WaterIntakeEventType;
  /** Server-supplied human wording for the transition. */
  label: string;
  fromStatus?: WaterIntakeStatus | null;
  toStatus: WaterIntakeStatus;
  /** Africa/Nairobi wall-clock time, 'YYYY-MM-DD HH24:MI'. */
  occurredAt: string;
  actor: string;
  details: Record<string, unknown>;
}

export type CustodyAction =
  | 'Received'
  | 'Transferred'
  | 'Stored'
  | 'Removed from storage'
  | 'Opened'
  | 'Resealed'
  | 'Returned'
  | 'Submitted for examination';

export interface CustodyRecord {
  id: string;
  timestamp: string;
  sampleOrExhibitId: string;
  fromEntity: string;
  toEntity: string;
  officerOrStaffName: string;
  location: string;
  action: CustodyAction;
  condition: string;
  destination: string;
  remarks: string;
  signatureHash: string;
}

export interface GCMSPeak {
  peakNumber: number;
  retentionTime: number; // e.g. 8.42 min
  peakArea: number;
  areaPercent: number;
  detectedCompound: string;
  casNumber: string;
  matchScore: number; // 0 - 100
  referenceLibrary: string; // e.g. NIST20 / GC-Kenya In-House Ref
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'REQUIRES REVIEW';
  analystInterpretation?: string;
}

export interface GCMSResult {
  runId: string;
  instrumentId: string; // e.g. GC-MS-01
  instrumentModel: string;
  method: string;
  date: string;
  analystName: string;
  sampleId: string;
  carrierGas: string;
  ovenProgram: string;
  inletTemp: string;
  splitRatio: string;
  peaks: GCMSPeak[];
  qcStatus: 'PASS' | 'WARNING' | 'FAIL';
  rawChromatogramData: Array<{ time: number; intensity: number }>;
}

export interface UVVisResult {
  runId: string;
  instrumentId: string;
  wavelengthRange: string;
  solvent: string;
  date: string;
  analystName: string;
  sampleId: string;
  lambdaMaxValues: number[]; // e.g. [233, 274]
  absorbancePeaks: Array<{ wavelength: number; absorbance: number }>;
  referenceComparison: string;
  qcStatus: 'PASS' | 'WARNING' | 'FAIL';
  spectrumData: Array<{ wavelength: number; absorbance: number }>;
}

export interface ScientificReferenceSubstance {
  id: string;
  substanceName: string;
  commonName: string;
  chemicalName: string;
  casNumber: string;
  molecularFormula: string;
  molecularWeight: number;
  synonyms: string[];
  category: string;
  gcmsRetentionTimeExpected: number;
  uvVisLambdaMax: number[];
  colorTestReaction: string;
  scheduledStatus: string;
  source: string;
  localRelevanceNotes: string;
  verificationStatus: 'VERIFIED' | 'UNDER_REVIEW' | 'PROVISIONAL';
}

export interface ExaminationRecord {
  id: string;
  caseId: string;
  sampleId: string;
  examinationType: string;
  method: string;
  procedure: string;
  reagents: string;
  equipment: string;
  instrument: string;
  conditions: string;
  startDate: string;
  endDate?: string;
  observations: string;
  preliminaryColorTests?: string;
  status: 'PENDING' | 'IN PROGRESS' | 'PAUSED' | 'COMPLETED' | 'REQUIRES REVIEW';
  analystName: string;
}

export interface ScientificFinding {
  id: string;
  caseId: string;
  observationsSummary: string;
  analyticalResultsSummary: string;
  scientificInterpretation: string;
  supportingEvidence: string;
  formalFindings: string;
  conclusion: string;
  dateRecorded: string;
  analystName: string;
  reviewedBySenior?: string;
}

export interface DraftReport {
  id: string;
  reportNumber: string;
  caseId: string;
  dateGenerated: string;
  analystName: string;
  analystTitle: string;
  status: 'DRAFT';
  sections: {
    reportIdentification: string;
    caseInformation: {
      caseNumber: string;
      labRefNumber: string;
      dateReceived: string;
      requestingStation: string;
      investigatingOfficer: string;
      badgeNumber: string;
    };
    request: string;
    itemsReceived: string[];
    examinationMethods: string[];
    results: string;
    observations: string;
    scientificInterpretation: string;
    findings: string;
    conclusion: string;
    disclaimer: string;
  };
}

export interface ForensicCase {
  id: string;
  caseNumber: string; // e.g. GC/EXM/2026/0001
  labReferenceNumber: string; // e.g. LAB/NAR/2026/0142
  dateReceived: string;
  dateRegistered: string;
  requestingInstitution: string;
  requestingDepartment: string;
  investigatingOfficer: string;
  officerBadge: string;
  officerPhone: string;
  natureOfCase: string;
  caseCategory: string;
  priority: CasePriority;
  legalReference: string;
  description: string;
  assignedDepartment: LaboratoryDepartment;
  assignedAnalyst: string;
  status: CaseStatus;
  exhibits: ExhibitItem[];
  samples: SampleItem[];
  foodDrugIntakes?: FoodDrugIntake[];
  waterIntakes?: WaterIntake[];
  custodyHistory: CustodyRecord[];
  examinations: ExaminationRecord[];
  gcmsResults?: GCMSResult[];
  uvVisResults?: UVVisResult[];
  findings?: ScientificFinding;
  draftReport?: DraftReport;
  visitorRecordId?: string;
}

export interface AppNotification {
  id: string;
  /** Display time, e.g. "9 Oct 2026, 14:32". */
  timestamp: string;
  /** ISO time it was raised, when known; used for sorting and grouping by day. */
  createdAt?: string;
  recipientRole?: UserRole | null;
  recipientDepartment?: LaboratoryDepartment | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  read: boolean;
  linkAction?: string;
  relatedVisitorId?: string; // visitor record this alert refers to
  relatedRecordType?: string;
  relatedRecordId?: string;
  persisted?: boolean;
  /** Set when the department resolved it, e.g. by registering the visitor's intake. */
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

/** One line of the description of samples, e.g. F/MISC/49/2026 – KFC soy sauce. */
export interface SubSample {
  subSampleNo: string;
  description: string;
}

/** Food & Drugs analytical sample receipt form, filled from the sample's case file. */
export interface FoodDrugReceiptForm {
  intakeId: string;
  formDate: string;
  senderName: string;
  senderPhysicalAddress: string;
  senderPostalAddress: string;
  senderTelephone: string;
  submitterName: string;
  submitterIdNumber: string;
  sampleDescription: string;
  examinationRequired: string;
  feeKes: number | null;
  invoiceNumber: string;
  receiptNumber: string;
  analystReceivingId?: string | null;
  analystReceiving?: string | null;
  analystReceivedDate: string;
  labSampleNo?: string | null; // e.g. F/MISC/47-49/2026
  sendersRefNo?: string | null;
  submitterIdType?: 'ID' | 'POWER_OF_ENTRY';
  subSamples?: SubSample[];
  submitterSignature?: string | null; // PNG/JPEG data URL
  receiverSignature?: string | null;
  stampImage?: string | null;
  receivedDate?: string | null;
  updatedBy?: string;
  updatedAt?: string;
}

/** Food & Drugs laboratory worksheet: analysed by the analyst, checked by the Head. */
export interface FoodDrugWorksheet {
  intakeId: string;
  analysisStartedOn: string;
  testMethods: string;
  results?: string | null;
  labSampleNo?: string | null;
  subSamples?: SubSample[];
  analysisRequired?: string | null;
  analystSignature?: string | null;
  checkerSignature?: string | null;
  /** Charts and images (e.g. GC-MS chromatograms) printed after the results. */
  attachments?: { id: string; caption: string; image: string }[];
  analysedBy?: string | null;
  analysedDate?: string | null;
  checkedBy?: string | null;
  checkedDate?: string | null;
  updatedBy?: string;
  updatedAt?: string;
}

export type WorkAllocationRecordType = 'WATER_INTAKE' | 'FOOD_DRUG_INTAKE';

/** A work allocation form: the Head keeps the original, the analyst gets a copy. */
export interface WorkAllocation {
  id: string;
  formNumber: string; // e.g. WAF-2026-00012
  department: string;
  recordType: WorkAllocationRecordType;
  recordId: string;
  labReference: string;
  subject: string;
  remarks: string;
  analystId: string;
  analystName: string;
  headName: string;
  allocatedAt: string; // Africa/Nairobi 'YYYY-MM-DD HH24:MI'
  supersededAt?: string | null;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  recordType: string;
  recordId: string;
  previousValue?: string;
  newValue?: string;
  details: string;
}

/** Certificate of Analysis – Draft Report, one per sub sample (GCD/GL/01/LWG/FOODS/F12). */
export interface FoodDrugDraftReportFields {
  labSampleNo: string;
  sendersRef: string;
  senderContacts: string;
  dateReceived: string;
  analysisStartedOn: string;
  sampleDescription: string;
  analysisRequired: string;
  testMethods: string;
  analyticalReport: string;
  remarks: string;
  copyType: 'ORIGINAL' | 'DUPLICATE';
}

export interface FoodDrugDraftReport extends FoodDrugDraftReportFields {
  id: string;
  intakeId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  analystSignature?: string | null;
  analysedBy?: string | null;
  analysedDate?: string | null;
  checkerSignature?: string | null;
  checkedBy?: string | null;
  checkedDate?: string | null;
  updatedBy?: string;
  updatedAt?: string;
}
