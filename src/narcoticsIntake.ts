import { ExhibitItem, NarcoticsIntakeStatus } from './types';

/**
 * Shared options for the Narcotics exhibit intake. `server.js` keeps its own
 * copy of the documents and seal conditions; the two must stay in step.
 */

/** Documents an officer may hand over with the exhibit. At least one is required. */
export const NARCOTICS_DOCUMENTS = [
  'Exhibit memo',
  'Police request letter',
  'OB extract',
  'Chain of custody form',
  'Search & seizure inventory',
];

/** Common kinds of exhibit; the officer can also type their own. */
export const NARCOTICS_EXHIBIT_TYPES = [
  'Dry plant material (suspected cannabis)',
  'Fresh plant material',
  'Powder',
  'Crystalline substance',
  'Tablets / capsules',
  'Resin',
  'Liquid',
  'Seeds',
  'Paraphernalia',
];

export const NARCOTICS_SEAL_CONDITIONS: ExhibitItem['condition'][] = [
  'Intact & Sealed',
  'Resealed',
  'Compromised',
  'Damaged',
];

export const NARCOTICS_STATUS_TONE: Record<NarcoticsIntakeStatus, 'amber' | 'sky' | 'emerald'> = {
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

/** The shortest detailed description the laboratory accepts. */
export const NARCOTICS_DESCRIPTION_MIN = 20;

/** Tests an Analysis Officer can report. `server.js` keeps its own copy. */
export const NARCOTICS_TESTS = [
  'Physical examination',
  'Microscopic examination',
  'Duquenois-Levine test',
  'Fast Blue B test',
  'Marquis test',
  'Scott test',
  'Simon test',
  'Thin-layer chromatography (TLC)',
  'GC-MS',
  'FTIR',
  'UV-Vis',
];

/** Common results; the officer can also type their own. */
export const NARCOTICS_SUBSTANCES = [
  'Cannabis sativa (bhang)',
  'Cannabis resin (hashish)',
  'Cocaine',
  'Heroin (diamorphine)',
  'Methamphetamine',
  'Amphetamine',
  'MDMA (ecstasy)',
  'Cathinone (khat / miraa)',
  'Psilocybin',
  'No controlled substance detected',
];

/** The shortest findings text the laboratory accepts. */
export const NARCOTICS_FINDINGS_MIN = 20;

/** Who may edit an intake: the receiver once, or the Head, before analysis starts. */
export const canEditNarcoticsIntake = (
  user: { id: string; role: string },
  intake: { status: NarcoticsIntakeStatus; receivingOfficerId: string; edited?: boolean },
) =>
  intake.status === 'Awaiting Assignment' &&
  (user.role === 'HEAD_OF_DEPARTMENT' || (intake.receivingOfficerId === user.id && !intake.edited));
