/**
 * The institution's own wording on a Government Chemist certificate. None of this is exhibit
 * data, so it lives in one place: change it here if the letterhead or the signatory changes.
 */
export const CERTIFICATE_LETTERHEAD = {
  officeLines: ['OFFICE OF THE PRESIDENT', 'MINISTRY OF INTERIOR AND NATIONAL ADMINISTRATION'],
  /** Left-hand contact block. */
  contacts: [
    { label: 'Mobile', value: '0111585154' },
    { label: 'Wireless', value: '+254 20 2336300, +254 20 2336214' },
    { label: 'Telephone', value: '+254 20 2725873/4' },
    { label: 'E-mail', value: 'gchemist@interior.go.ke' },
  ],
  /** Right-hand department and postal address. */
  department: ["GOVERNMENT CHEMIST'S DEPARTMENT", 'P.O. Box 20753-00202 KNH', 'NAIROBI'],
  replyNote: 'When replying please quote',
  /** Printed under the analysis officer's name in the signature block. */
  signatoryTitle: 'For: GOVERNMENT CHEMIST',
  footerDisclaimer: 'This report shall not be reproduced except in full without the written approval of the laboratory',
  closingStatements: [
    'The report under this certificate is as showed above.',
    'Note: The results only apply to the sample as submitted to the laboratory.',
  ],
} as const;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, '').charAt(0))
    .filter(Boolean)
    .join('');

/**
 * The reference line at the foot of the letter, e.g. "JJ/GJD": the initials of the officer the case is
 * assigned to, then the initials of the approving officer (the Head), both in capitals. The
 * approving part appears only once the certificate has been approved.
 */
export const certificateInitials = (analysedBy?: string, approvedBy?: string) =>
  [
    analysedBy ? initialsOf(analysedBy).toUpperCase() : '',
    approvedBy ? initialsOf(approvedBy).toUpperCase() : '',
  ]
    .filter(Boolean)
    .join('/');
