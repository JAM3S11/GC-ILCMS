import { OfficerVisitor } from '../../types';
import type { Tone } from '../common/Dashboard';

export const VISITOR_STATUS: Record<OfficerVisitor['status'], { label: string; tone: Tone }> = {
  'Awaiting Laboratory Reception': { label: 'Awaiting lab', tone: 'sky' },
  'In Laboratory': { label: 'In laboratory', tone: 'amber' },
  Completed: { label: 'Completed', tone: 'emerald' },
  Departed: { label: 'Departed', tone: 'slate' },
};

export const isOnSite = (v: OfficerVisitor) => v.status !== 'Departed';
