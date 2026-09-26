import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'motion/react';
import {
  Shield,
  KeyRound,
  FlaskConical,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Activity,
  Lock,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import { Select } from '../common/Select';
import { LaboratoryDepartment, User, UserRole } from '../../types';
import { INITIAL_USERS } from '../../data/initialData';

const SHARED_PASSWORD = 'GC-ILCMS@2026';

const EASE_OUT: Transition['ease'] = [0.22, 0.61, 0.36, 1];
const TAB_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 34 };

const CREDENTIAL_GROUPS: { label: string; roles: UserRole[]; tier: 'privileged' | 'standard' | 'intern' }[] = [
  { label: 'Executive Leadership', roles: ['CEO', 'VICE_CEO'], tier: 'privileged' },
  { label: 'Administration & Support', roles: ['ADMINISTRATOR', 'HR', 'ACCOUNTANT', 'QUALITY_MANAGER'], tier: 'standard' },
  { label: 'Reception & Registry', roles: ['RECEPTIONIST', 'CLERK'], tier: 'standard' },
  { label: 'Department Heads', roles: ['HEAD_OF_DEPARTMENT'], tier: 'privileged' },
  { label: 'Scientific Analysts', roles: ['ANALYST'], tier: 'standard' },
  { label: 'Scientific Interns', roles: ['INTERN', 'ATTACHEE'], tier: 'intern' },
];

const roleTierLabel: Record<string, string> = {
  privileged: 'Privileged Access',
  standard: 'Standard Access',
  intern: 'Intern Access',
};

const roleTierIcon: Record<string, React.ReactNode> = {
  privileged: <Shield className="w-3.5 h-3.5" />,
  standard: <CheckCircle2 className="w-3.5 h-3.5" />,
  intern: <KeyRound className="w-3.5 h-3.5" />,
};

const departmentOptions: LaboratoryDepartment[] = [
  'Narcotics', 'Food & Drugs', 'Criminalistic', 'DNA', 'Instruments', 'Water', 'Toxicology', 'Procurement',
];

const SCIENTIFIC_ROLES: UserRole[] = ['ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE'];

const isScientificRole = (role: UserRole): boolean => SCIENTIFIC_ROLES.includes(role);

const ADMIN_PROVISIONED_ROLES: UserRole[] = ['CEO', 'VICE_CEO', 'ADMINISTRATOR', 'HEAD_OF_DEPARTMENT'];

const SELF_REGISTER_ROLES: UserRole[] = CREDENTIAL_GROUPS
  .flatMap(g => g.roles)
  .filter(role => !ADMIN_PROVISIONED_ROLES.includes(role));

type AuthMode = 'signin' | 'register' | 'reset';

type DemoAccount = User & { title: string };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  /*
   * Temporarily disabled demo accounts. Keep the Receptionist, Food & Drugs,
   * and Water accounts active for the current workflow demo.
  { id: 'DEMO-001', name: 'Mr. William K. Munyoki', title: 'CEO', email: 'william.munyoki@chemist.go.ke', staffId: 'DEMO-CEO-001', role: 'CEO', password: SHARED_PASSWORD },
  { id: 'DEMO-002', name: 'Dr. Joseph K. Kimani', title: 'Vice CEO & Head of Directorate of Forensics Science Service', email: 'joseph.kimani@chemist.go.ke', staffId: 'DEMO-VCEO-002', role: 'VICE_CEO', password: SHARED_PASSWORD },
  { id: 'DEMO-003', name: 'Mrs. Rose N. Sikuku', title: 'Principal Deputy to the GC & Director of Research, Innovation and Quality Assurance', email: 'rose.sikuku@chemist.go.ke', staffId: 'DEMO-HOD-003', role: 'HEAD_OF_DEPARTMENT', department: 'Procurement', password: SHARED_PASSWORD },
  { id: 'DEMO-004', name: 'Mr. Geoffrey Anyona', title: 'Head of Research, Instrumentation and Quality Assurance Division', email: 'geoffrey.anyona@chemist.go.ke', staffId: 'DEMO-HOD-004', role: 'HEAD_OF_DEPARTMENT', department: 'Instruments', password: SHARED_PASSWORD },
  { id: 'DEMO-005', name: 'Ms. Catherine S. Murambi', title: 'Head Instrumentation', email: 'catherine.murambi@chemist.go.ke', staffId: 'DEMO-HOD-005', role: 'HEAD_OF_DEPARTMENT', department: 'Instruments', password: SHARED_PASSWORD },
  { id: 'DEMO-006', name: 'Ms. Abigael Cheruiyot', title: 'Officer - Instrumentation', email: 'abigael.cheruiyot@chemist.go.ke', staffId: 'DEMO-SCI-006', role: 'ANALYST', department: 'Instruments', password: SHARED_PASSWORD },
  { id: 'DEMO-007', name: 'Dr. Christine N. Matindi', title: 'Head of Quality Assurance', email: 'christine.matindi@chemist.go.ke', staffId: 'DEMO-QMS-007', role: 'QUALITY_MANAGER', password: SHARED_PASSWORD },
  { id: 'DEMO-008', name: 'Ms. Anne Nthenya', title: 'Officer - Quality Assurance', email: 'anne.nthenya@chemist.go.ke', staffId: 'DEMO-SCI-008', role: 'ANALYST', department: 'Procurement', password: SHARED_PASSWORD },
  { id: 'DEMO-009', name: 'Dr. Muthini M. Mutiso', title: 'Head Research and Innovation', email: 'muthini.mutiso@chemist.go.ke', staffId: 'DEMO-HOD-009', role: 'HEAD_OF_DEPARTMENT', department: 'Procurement', password: SHARED_PASSWORD },
  */
  { id: 'DEMO-010', name: 'Ms. Joyce Nyoike', title: 'Head Food and Water Service Division', email: 'joyce.nyoike@chemist.go.ke', staffId: 'DEMO-HOD-010', role: 'HEAD_OF_DEPARTMENT', department: 'Water', password: SHARED_PASSWORD },
  { id: 'DEMO-011', name: 'Ms. Dorcus N. Muthusi', title: 'Head Foods, Drugs and Chemical Substances Section', email: 'dorcus.muthusi@chemist.go.ke', staffId: 'DEMO-HOD-011', role: 'HEAD_OF_DEPARTMENT', department: 'Food & Drugs', password: SHARED_PASSWORD },
  { id: 'DEMO-012', name: 'Ms. Emily K. Okworo', title: 'Officer - Foods, Drugs and Chemical Substance', email: 'emily.okworo@chemist.go.ke', staffId: 'DEMO-SCI-012', role: 'ANALYST', department: 'Food & Drugs', password: SHARED_PASSWORD },
  { id: 'DEMO-013', name: 'Ms. Jane N. Kisutia', title: 'Head Water and Environment', email: 'jane.kisutia@chemist.go.ke', staffId: 'DEMO-HOD-013', role: 'HEAD_OF_DEPARTMENT', department: 'Water', password: SHARED_PASSWORD },
  { id: 'DEMO-014', name: 'Ms. Betsy C. Chepkwony', title: 'Officer - Water and Environment', email: 'betsy.chepkwony@chemist.go.ke', staffId: 'DEMO-SCI-014', role: 'ANALYST', department: 'Water', password: SHARED_PASSWORD },
  /*
  { id: 'DEMO-015', name: 'Mr. James M. Welimo', title: 'Head Forensic and Clinical Toxicology Division', email: 'james.welimo@chemist.go.ke', staffId: 'DEMO-HOD-015', role: 'HEAD_OF_DEPARTMENT', department: 'Toxicology', password: SHARED_PASSWORD },
  { id: 'DEMO-016', name: 'Ms. Everlyn A. Onyango', title: 'Officer - Forensic and Clinical Toxicology', email: 'everlyn.onyango@chemist.go.ke', staffId: 'DEMO-SCI-016', role: 'ANALYST', department: 'Toxicology', password: SHARED_PASSWORD },
  { id: 'DEMO-017', name: 'Ms. Grace N. Njenga', title: 'Head Forensic Criminalistics Division and Criminalistic Section', email: 'grace.njenga@chemist.go.ke', staffId: 'DEMO-HOD-017', role: 'HEAD_OF_DEPARTMENT', department: 'Criminalistic', password: SHARED_PASSWORD },
  { id: 'DEMO-018', name: 'Ms. Teresa N. Maina', title: 'Officer - Criminalistic Division', email: 'teresa.maina@chemist.go.ke', staffId: 'DEMO-SCI-018', role: 'ANALYST', department: 'Criminalistic', password: SHARED_PASSWORD },
  { id: 'DEMO-019', name: 'Mr. Daniel Boit', title: 'Head Narcotics Section', email: 'daniel.boit@chemist.go.ke', staffId: 'DEMO-HOD-019', role: 'HEAD_OF_DEPARTMENT', department: 'Narcotics', password: SHARED_PASSWORD },
  { id: 'DEMO-020', name: 'Ms. Sarah M. Muriuki', title: 'Officer - Narcotics', email: 'sarah.muriuki@chemist.go.ke', staffId: 'DEMO-SCI-020', role: 'ANALYST', department: 'Narcotics', password: SHARED_PASSWORD },
  { id: 'DEMO-021', name: 'Ms. Margaret G. Kanja', title: 'Officer - Narcotics', email: 'margaret.kanja@chemist.go.ke', staffId: 'DEMO-SCI-021', role: 'ANALYST', department: 'Narcotics', password: SHARED_PASSWORD },
  { id: 'DEMO-022', name: 'Ms. Nellie Pappa', title: 'Head Forensic Biology Division', email: 'nellie.pappa@chemist.go.ke', staffId: 'DEMO-HOD-022', role: 'HEAD_OF_DEPARTMENT', department: 'DNA', password: SHARED_PASSWORD },
  { id: 'DEMO-023', name: 'Mr. Henry K. Sang', title: 'Head Homicide Section', email: 'henry.sang@chemist.go.ke', staffId: 'DEMO-HOD-023', role: 'HEAD_OF_DEPARTMENT', department: 'DNA', password: SHARED_PASSWORD },
  { id: 'DEMO-024', name: 'Mr. Stanley I. Mosite', title: 'Officer - Homicide Section', email: 'stanley.mosite@chemist.go.ke', staffId: 'DEMO-SCI-024', role: 'ANALYST', department: 'DNA', password: SHARED_PASSWORD },
  { id: 'DEMO-025', name: 'Ms. Margaret W. Maina', title: 'Head Sexual Offences and Genetic Relatedness', email: 'margaret.maina@chemist.go.ke', staffId: 'DEMO-HOD-025', role: 'HEAD_OF_DEPARTMENT', department: 'DNA', password: SHARED_PASSWORD },
  { id: 'DEMO-026', name: 'Ms. Brenda S. Mbalanya', title: 'Officer - Forensic Biology', email: 'brenda.mbalanya@chemist.go.ke', staffId: 'DEMO-SCI-026', role: 'ANALYST', department: 'DNA', password: SHARED_PASSWORD },
  */
  { id: 'DEMO-027', name: 'Ms. Ezna Ratemo', title: 'Receptionist', email: 'ezna.ratemo@chemist.go.ke', staffId: 'DEMO-REC-027', role: 'RECEPTIONIST', password: SHARED_PASSWORD },
  /*
  { id: 'DEMO-028', name: 'Mr. Lee Omae', title: 'Office Assistant', email: 'lee.omae@chemist.go.ke', staffId: 'DEMO-CLK-028', role: 'CLERK', password: SHARED_PASSWORD },
  { id: 'DEMO-029', name: 'Ms. Lucy', title: 'Office Assistant', email: 'lucy@chemist.go.ke', staffId: 'DEMO-CLK-029', role: 'CLERK', password: SHARED_PASSWORD },
  { id: 'DEMO-030', name: 'Mr. James Daniel', title: 'Clerical Officer', email: 'james.daniel@chemist.go.ke', staffId: 'DEMO-CLK-030', role: 'CLERK', password: SHARED_PASSWORD },
  { id: 'DEMO-031', name: 'Ms. Diana Kemunto', title: 'Clerical Officer', email: 'diana.kemunto@chemist.go.ke', staffId: 'DEMO-CLK-031', role: 'CLERK', password: SHARED_PASSWORD },
  { id: 'DEMO-032', name: 'Ms. Glory', title: 'Administration', email: 'glory@chemist.go.ke', staffId: 'DEMO-ADM-032', role: 'ADMINISTRATOR', password: SHARED_PASSWORD },
  { id: 'DEMO-033', name: 'Mr. Nchoshoi Shungea', title: 'HR', email: 'nchoshoi.shungea@chemist.go.ke', staffId: 'DEMO-HR-033', role: 'HR', password: SHARED_PASSWORD },
  { id: 'DEMO-034', name: 'Mr. John Siele', title: 'Intern - ICT', email: 'john.siele@chemist.go.ke', staffId: 'DEMO-INT-034', role: 'INTERN', password: SHARED_PASSWORD },
  */
  { id: 'DEMO-035', name: 'Mr. Stephen', title: 'Intern - Foods, Drugs and Chemical Substance Section', email: 'stephen@chemist.go.ke', staffId: 'DEMO-INT-035', role: 'INTERN', department: 'Food & Drugs', password: SHARED_PASSWORD },
  /*
  { id: 'DEMO-036', name: 'Ms. Melan', title: 'Intern - Criminalistic Section', email: 'melan@chemist.go.ke', staffId: 'DEMO-INT-036', role: 'INTERN', department: 'Criminalistic', password: SHARED_PASSWORD },
  */
];

const AUTH_COPY: Record<AuthMode, { title: string; subtitle: string; switchPrompt: string; switchCta: string; switchTo: AuthMode }> = {
  signin: {
    title: 'Sign in to GC-ILCMS',
    subtitle: 'Welcome back. Use your staff email or ID.',
    switchPrompt: 'No account yet?',
    switchCta: 'Create account',
    switchTo: 'register',
  },
  register: {
    title: 'Create your account',
    subtitle: 'For Government Chemist staff. Senior roles are set up by an administrator.',
    switchPrompt: 'Already have an account?',
    switchCta: 'Sign in',
    switchTo: 'signin',
  },
  reset: {
    title: 'Reset your password',
    subtitle: 'Enter your work email and we will send you a reset link.',
    switchPrompt: 'Remembered it?',
    switchCta: 'Back to sign in',
    switchTo: 'signin',
  },
};

const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: '8+ characters', test: (v) => v.length >= 8 },
  { label: 'a number', test: (v) => /\d/.test(v) },
  { label: 'a symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const passwordStrength = (value: string): number => PASSWORD_RULES.filter(rule => rule.test(value)).length;

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good'];
const STRENGTH_COLORS = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500'];

const FormError: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="flex items-center gap-1.5 text-[12px] text-rose-600">
    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
    {message}
  </p>
);

const DemoAccountList: React.FC<{
  accounts: DemoAccount[];
  onSelect: (account: DemoAccount) => void;
}> = ({ accounts, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const accountGroups = [
    { id: 'water', label: 'Water & Environment', accounts: accounts.filter((account) => account.department === 'Water') },
    { id: 'food-drugs', label: 'Food & Drugs', accounts: accounts.filter((account) => account.department === 'Food & Drugs') },
    { id: 'reception', label: 'Receptionist', accounts: accounts.filter((account) => account.role === 'RECEPTIONIST') },
  ].filter((group) => group.accounts.length > 0);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const overlayContainer = triggerRef.current?.closest<HTMLElement>('[data-demo-accounts-panel]');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[#dcdce3] bg-slate-50/60 px-3 py-3 text-left transition-colors hover:border-[#f26522] hover:bg-orange-50/50 sm:px-4"
      >
        <span className="min-w-0 text-[11px] font-semibold text-[#111] sm:text-[12px]">
          Demo accounts <span className="font-normal text-slate-500">· View {accounts.length} staff</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && overlayContainer && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Demo accounts"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(2,6,23,0.3)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e6e6eb] px-4 py-4 sm:px-6">
                <div>
                  <h3 className="text-base font-bold text-[#111] sm:text-lg">Demo accounts</h3>
                  <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">Select a staff member to fill in their sign-in details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Close
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5">
                <div className="mx-auto w-full max-w-2xl space-y-2">
                  {accountGroups.map((group) => {
                    const expanded = expandedGroup === group.id;
                    const panelId = `demo-accounts-${group.id}`;
                    return (
                      <section key={group.id} className="overflow-hidden rounded-xl border border-[#e6e6eb] bg-slate-50/70">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          onClick={() => setExpandedGroup(expanded ? null : group.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50/70"
                        >
                          <span className="text-sm font-semibold text-slate-800">{group.label}</span>
                          <span className="flex items-center gap-2 text-xs text-slate-500">
                            {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                        {expanded && (
                          <div id={panelId} className="grid gap-1 border-t border-[#e6e6eb] bg-white p-2 sm:grid-cols-2">
                            {group.accounts.map((account) => (
                              <button
                                key={account.id}
                                type="button"
                                onClick={() => {
                                  onSelect(account);
                                  setIsOpen(false);
                                }}
                                className="flex min-h-[52px] w-full cursor-pointer items-start gap-2 rounded-lg border border-transparent bg-white px-2.5 py-2.5 text-left transition-colors hover:border-[#f26522] hover:bg-orange-50 sm:px-3 sm:py-2"
                              >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-[#c94c17]">
                                  {account.name.split(' ').filter(Boolean).map((word) => word[0]).slice(0, 2).join('')}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block break-words text-[11px] font-semibold leading-snug text-slate-800">{account.name}</span>
                                  <span className="block break-words text-[10px] leading-relaxed text-slate-500">{account.title}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        overlayContainer
      )}
    </>
  );
};

const getRoleTier = (role: UserRole): string => {
  const group = CREDENTIAL_GROUPS.find(g => g.roles.includes(role));
  return group?.tier || 'standard';
};

const departmentLabels: Record<string, string> = {
  'Narcotics': 'Narcotics & Psychotropic',
  'Food & Drugs': 'Food, Cosmetics & Pharma',
  'Criminalistic': 'Criminalistic & Physical Evidence',
  'DNA': 'Forensic DNA Profiling',
  'Instruments': 'Trace Elemental Analysis',
  'Water': 'Environmental & Water Quality',
  'Toxicology': 'Forensic Toxicology',
  'Procurement': 'Reference Materials & CRM',
};

const SLIDE_MS = 5000;
const INTRO_SECONDS = 5;

const LIFECYCLE_STEPS: { key: string; icon: React.ReactNode; title: string; body: string }[] = [
  {
    key: 'Intake',
    icon: <ClipboardList className="h-4 w-4" />,
    title: 'Register requests & cases',
    body: 'Log submissions from police, courts and agencies under a unique case number.',
  },
  {
    key: 'Custody',
    icon: <Lock className="h-4 w-4" />,
    title: 'Exhibits under chain of custody',
    body: 'Every hand-over is signed, timestamped and sealed with a SHA-256 hash.',
  },
  {
    key: 'Analysis',
    icon: <FlaskConical className="h-4 w-4" />,
    title: 'Route work to 8 lab units',
    body: 'Narcotics, Toxicology, DNA, Water and more, each with its own queue.',
  },
  {
    key: 'Review',
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Peer review & approval',
    body: 'Results are interpreted, checked and approved by the head of department.',
  },
  {
    key: 'Report',
    icon: <FileCheck2 className="h-4 w-4" />,
    title: 'Controlled, signed reports',
    body: 'Versioned certificates are issued with a full audit trail.',
  },
];

const TRUST_LINE: { label: string; icon: React.ReactNode }[] = [
  { label: '8 accredited labs', icon: <FlaskConical className="h-3.5 w-3.5" /> },
  { label: 'ISO/IEC 17025', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { label: 'SHA-256 custody', icon: <Lock className="h-3.5 w-3.5" /> },
  { label: '3.2d mean SLA', icon: <Activity className="h-3.5 w-3.5" /> },
];

const SERIF_STACK = "'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif";

const PANEL_BACKGROUND =
  'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 55%),' +
  ' linear-gradient(165deg, #0b3a42 0%, #0d4a52 55%, #0f5860 100%)';

const GUILLOCHE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E" +
  "%3Cpath d='M0 20 Q15 2 30 20 T60 20 T90 20 T120 20' fill='none' stroke='white' stroke-opacity='0.06'/%3E" +
  "%3Cpath d='M0 20 Q15 38 30 20 T60 20 T90 20 T120 20' fill='none' stroke='white' stroke-opacity='0.06'/%3E" +
  '%3C/svg%3E")';

const inputClass =
  'h-11 w-full rounded-[9px] border border-[#d8d8df] bg-white px-[14px] text-[16px] text-[#111] sm:h-9 sm:text-[13px] outline-none transition-colors placeholder:text-[#9b9ba5] focus:border-[#f26522] focus:shadow-[0_0_0_2px_rgba(242,101,34,0.15)]';

const primaryBtnClass =
  'h-11 w-full cursor-pointer rounded-[8px] bg-[#f26522] text-[15px] font-bold sm:h-[38px] sm:text-[13px] text-white transition-colors hover:bg-[#d9541a] active:scale-[0.99]';

interface LandingPageProps {
  onLogin: (user: User) => void;
}

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
}

const TermsDialog: React.FC<TermsDialogProps> = ({ open, onClose }) => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const sections: { title: string; body: string }[] = [
    {
      title: '1. What this agreement covers',
      body: 'These Terms & Privacy apply to your use of the GC-ILCMS (Government Chemist Information Laboratory Case Management System). By signing in you agree to access the system solely for authorized laboratory, case, and evidence work in line with the Government Chemist\u2019s official mandate.',
    },
    {
      title: '2. Information & data collected',
      body: 'The system records your identity (name, email, staff ID), role, and department to control access. When you use it, the platform persists case records, exhibit descriptions, analysis results, and custody events that you legitimately create or are assigned to. It does not collect unrelated personal data.',
    },
    {
      title: '3. How your data is protected',
      body: 'All data is encrypted in transit and at rest. Access is restricted by role-based permissions, every sign-in and record change is written to an immutable audit trail, and evidence custody follows a SHA-256 integrity pipeline so exhibits cannot be altered undetected.',
    },
    {
      title: '4. Your responsibilities',
      body: 'You must keep your credentials confidential, never share them, use the system only for official purposes, and ensure case data you enter is accurate and lawful. You are accountable for every action performed under your account.',
    },
    {
      title: '5. Monitoring & retention',
      body: 'System activity is monitored to detect misuse and is retained in line with Government of Kenya record-keeping policy. Suspected breaches or unauthorized access should be reported to the system administrator immediately.',
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Terms & Privacy"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.02em] text-[#101014]">Terms & Privacy</h3>
                <p className="mt-1 text-[13px] text-[#8b8b98]">What you're agreeing to when you sign in to GC-ILCMS</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Terms & Privacy"
                className="cursor-pointer rounded-full p-1.5 text-[#8b8b98] transition-colors hover:bg-slate-100 hover:text-[#111]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 max-h-[45vh] space-y-4 overflow-y-auto pr-1">
              {sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[13px] font-bold text-[#111]">{section.title}</h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#555562]">{section.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#eeeeef] pt-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">Govt. Chemist · GC-ILCMS</p>
              <button
                type="button"
                onClick={onClose}
                className="h-[38px] cursor-pointer rounded-[8px] bg-[#f26522] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#d9541a]"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const shouldReduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showSigninPass, setShowSigninPass] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStaffId, setRegStaffId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regRole, setRegRole] = useState<UserRole>('ANALYST');
  const [regDepartment, setRegDepartment] = useState<LaboratoryDepartment | undefined>(departmentOptions[0]);
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  // Mobile only: the carousel plays first, then the sign-in modal opens.
  const [showMobileAuth, setShowMobileAuth] = useState(false);
  const [introSecondsLeft, setIntroSecondsLeft] = useState(INTRO_SECONDS);

  useEffect(() => {
    if (showMobileAuth || introSecondsLeft <= 0) return;
    const timeout = window.setTimeout(() => {
      if (introSecondsLeft <= 1) setShowMobileAuth(true);
      setIntroSecondsLeft((s) => s - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [showMobileAuth, introSecondsLeft]);

  // Back to the overview; the sign-in modal returns after another intro.
  const showMobileOverview = () => {
    setShowMobileAuth(false);
    setIntroSecondsLeft(INTRO_SECONDS);
  };

  const autoAdvance = !shouldReduceMotion && !carouselPaused;

  useEffect(() => {
    if (!autoAdvance) return;
    const timeout = window.setTimeout(() => {
      setActiveStep((current) => (current + 1) % LIFECYCLE_STEPS.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(timeout);
  }, [autoAdvance, activeStep]);

  const moveStep = (direction: -1 | 1) => {
    setActiveStep((current) => (current + direction + LIFECYCLE_STEPS.length) % LIFECYCLE_STEPS.length);
  };

  const step = LIFECYCLE_STEPS[activeStep];

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setLoginError(null);
    setRegError(null);
    setResetSent(false);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setLoginError(null);
    const matched = [...INITIAL_USERS, ...DEMO_ACCOUNTS].find(u => u.email.toLowerCase() === loginId.toLowerCase() || u.staffId.toLowerCase() === loginId.toLowerCase());
    if (matched?.password && loginPass !== matched.password) {
      setLoginError('That password is incorrect. Try again or reset it.');
      return;
    }
    const user: User = matched ?? { id: `USR-${Date.now().toString().slice(-4)}`, name: loginId.split('@')[0] || 'User', email: loginId, staffId: 'GC-SCI-2026', role: 'ANALYST', department: 'Narcotics' };
    setSubmitting(true);
    window.setTimeout(() => onLogin(user), shouldReduceMotion ? 0 : 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (ADMIN_PROVISIONED_ROLES.includes(regRole)) return;
    if (passwordStrength(regPassword) < PASSWORD_RULES.length) {
      setRegError('Use a password with 8+ characters, a number and a symbol.');
      return;
    }
    const isScientific = isScientificRole(regRole);
    const user: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: regFullName || 'New Analyst',
      email: regEmail || 'staff@chemist.go.ke',
      staffId: regStaffId || 'GC-REG-2026',
      role: regRole,
      department: isScientific ? regDepartment : undefined,
      password: regPassword,
    };
    setRegSubmitted(true);
    setTimeout(() => { onLogin(user); }, 1000);
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(true);
  };

  const copy = AUTH_COPY[authMode];
  const regStrength = passwordStrength(regPassword);

  const panelVariants = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.09, delayChildren: shouldReduceMotion ? 0 : 0.15 } },
  };
  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  };

  return (
    <div
      className="relative isolate min-h-[100dvh] w-full lg:h-[100dvh] lg:overflow-hidden"
      style={{ background: PANEL_BACKGROUND, colorScheme: 'light' }}
    >
      {/* National colours stripe */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-20 flex h-1.5">
        <span className="flex-1 bg-black" />
        <span className="w-[3px] bg-white" />
        <span className="flex-1 bg-[#bb0000]" />
        <span className="w-[3px] bg-white" />
        <span className="flex-1 bg-[#006600]" />
      </div>

      {/* Security-paper line pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ backgroundImage: GUILLOCHE_PATTERN, backgroundSize: '120px 40px' }}
      />
      {/* Guilloché rosette */}
      <svg
        aria-hidden="true"
        viewBox="-100 -100 200 200"
        className="pointer-events-none absolute -bottom-40 -left-40 -z-10 h-[28rem] w-[28rem] text-white opacity-[0.07]"
      >
        {Array.from({ length: 36 }, (_, i) => (
          <ellipse key={i} cx="0" cy="0" rx="96" ry="34" fill="none" stroke="currentColor" strokeWidth="0.5" transform={`rotate(${i * 5})`} />
        ))}
      </svg>

      <div className="grid min-h-[100dvh] w-full grid-cols-1 lg:h-[100dvh] lg:grid-cols-2 lg:items-stretch">
        {/* Institutional branding panel */}
        <div className="relative flex min-h-[100dvh] flex-col justify-between text-white lg:h-[100dvh] lg:overflow-hidden">

          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="show"
            className="relative z-10 flex min-h-[100dvh] flex-col justify-between px-4 py-5 sm:px-10 sm:py-7 lg:h-full xl:px-12"
          >
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:text-left">
                <div className="flex items-center gap-3">
                  <LogoPlaceholder size="sm" variant="on-teal" id="gc-auth-brand" showText={false} />
                  <div className="text-white">
                    <p className="text-[15px] font-bold leading-tight tracking-tight">Government Chemist</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">GC-ILCMS</p>
                  </div>
                </div>
                <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white sm:text-[10px] sm:tracking-[0.2em]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 animate-pulse-ring" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  </span>
                  Demo access
                </div>
              </motion.div>

            {/* Centred story block: heading + lifecycle carousel */}
            <div className="flex min-h-0 flex-1 flex-col justify-center py-4 sm:py-8 [@media(min-width:1024px)_and_(max-height:820px)]:py-5">
              <motion.div variants={itemVariants} className="mx-auto w-full max-w-2xl space-y-3 px-2 text-center sm:px-8 [@media(min-width:1024px)_and_(max-height:820px)]:space-y-2">
                <h1
                  className="mx-auto max-w-xl text-[clamp(1.8rem,1.45rem+2.4vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-white"
                  style={{ fontFamily: SERIF_STACK }}
                >
                  Government Chemist <span className="text-[#f26522]">LIMS</span>
                </h1>
                <p className="mx-auto max-w-md text-[14px] leading-relaxed text-white/85 sm:text-[15px]">
                  Register cases, track exhibits and route work to laboratory units.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="mx-auto mt-5 w-full max-w-lg [@media(min-width:1024px)_and_(max-height:820px)]:mt-4">
                <div
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Case lifecycle"
                  tabIndex={0}
                  onMouseEnter={() => setCarouselPaused(true)}
                  onMouseLeave={() => setCarouselPaused(false)}
                  onFocus={() => setCarouselPaused(true)}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCarouselPaused(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); moveStep(-1); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); moveStep(1); }
                  }}
                  className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/[0.07] px-3.5 pb-4 pt-3.5 shadow-[0_24px_50px_-32px_rgba(2,6,23,0.7)] outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-6 sm:pb-5 sm:pt-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/75 sm:text-[11px] sm:tracking-[0.18em]">
                      <span className="tabular-nums text-white">{String(activeStep + 1).padStart(2, '0')}</span>
                      {' / '}{String(LIFECYCLE_STEPS.length).padStart(2, '0')}
                      <span className="mx-2 text-white/40">·</span>
                      <span className="text-white">{step.key}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Previous step"
                        onClick={() => moveStep(-1)}
                        className="rounded-full p-1.5 text-white/75 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next step"
                        onClick={() => moveStep(1)}
                        className="rounded-full p-1.5 text-white/75 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step.key}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: EASE_OUT }}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${activeStep + 1} of ${LIFECYCLE_STEPS.length}: ${step.title}`}
                      className="flex min-h-[132px] flex-col items-center justify-center py-4 text-center sm:min-h-[150px] sm:items-start sm:py-5 sm:text-left [@media(max-width:1023px)_and_(max-height:700px)]:min-h-[110px] [@media(max-width:1023px)_and_(max-height:700px)]:py-2.5 [@media(min-width:1024px)_and_(max-height:820px)]:min-h-[120px] [@media(min-width:1024px)_and_(max-height:820px)]:py-3"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white [&>svg]:h-5 [&>svg]:w-5">
                        {step.icon}
                      </span>
                      <h2
                        className="mt-3 text-[18px] font-semibold leading-tight text-white sm:text-[20px]"
                        style={{ fontFamily: SERIF_STACK }}
                      >
                        {step.title}
                      </h2>
                      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/80 max-sm:mx-auto">{step.body}</p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Process stepper */}
                  <div className="relative border-t border-white/15 pt-3 sm:pt-4">
                    <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[30px] h-px bg-white/25">
                      <motion.div
                        className="h-full bg-white"
                        initial={false}
                        animate={{ width: `${(activeStep / (LIFECYCLE_STEPS.length - 1)) * 100}%` }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: EASE_OUT }}
                      />
                    </div>
                    <div className="relative grid grid-cols-5">
                      {LIFECYCLE_STEPS.map((s, index) => {
                        const done = index < activeStep;
                        const current = index === activeStep;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            aria-label={`Go to ${s.key}`}
                            aria-current={current ? 'step' : undefined}
                            onClick={() => setActiveStep(index)}
                            className="group flex cursor-pointer flex-col items-center gap-1.5 sm:gap-2"
                          >
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold transition-colors sm:h-7 sm:w-7 sm:text-[11px] ${
                                done
                                  ? 'bg-white text-[#0b3a42]'
                                  : current
                                    ? 'bg-[#0d4a52] text-white ring-2 ring-white ring-offset-2 ring-offset-[#0d4a52]'
                                    : 'border border-white/35 bg-[#0d4a52] text-white/70 group-hover:border-white/70'
                              }`}
                            >
                              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                            </span>
                            <span
                              className={`block font-mono text-[9px] uppercase tracking-[0.02em] transition-colors sm:text-[10px] sm:tracking-[0.1em] ${
                                current ? 'font-bold text-white' : 'text-white/70 group-hover:text-white'
                              }`}
                            >
                              {s.key}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-advance timer */}
                  <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                    <motion.div
                      key={`${activeStep}-${autoAdvance}`}
                      className="h-full origin-left bg-[#f26522]"
                      initial={{ scaleX: autoAdvance ? 0 : 1 }}
                      animate={{ scaleX: autoAdvance ? 1 : 0 }}
                      transition={{ duration: autoAdvance ? SLIDE_MS / 1000 : 0, ease: 'linear' }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.ul
              variants={itemVariants}
              aria-label="Accreditation and service standards"
              className="flex flex-wrap items-center justify-center gap-1.5 px-1 sm:gap-2.5"
            >
              {TRUST_LINE.map((item) => (
                <li
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white/90 sm:gap-2 sm:px-3.5 sm:text-[12px]"
                >
                  <span className="text-white">{item.icon}</span>
                  {item.label}
                </li>
              ))}
            </motion.ul>
          </motion.div>
        </div>

        {/* Form panel: floating card over the page background */}
        <div className={`${showMobileAuth ? 'flex animate-fade-in' : 'hidden'} fixed inset-0 z-30 items-center justify-center overflow-y-auto bg-[#0b3a42]/45 p-4 backdrop-blur-md sm:p-6 lg:static lg:z-auto lg:block lg:bg-transparent lg:backdrop-blur-none lg:h-[100dvh] lg:py-6 lg:pl-0 lg:pr-6`}>
        <div data-demo-accounts-panel className={`relative flex w-full max-w-[560px] max-h-[calc(100dvh-2rem)] flex-col ${authMode === 'signin' ? 'overflow-hidden' : 'overflow-y-auto'} rounded-3xl bg-slate-50 shadow-[0_20px_50px_-20px_rgba(2,6,23,0.5)] sm:max-h-[calc(100dvh-2.5rem)] lg:max-h-none lg:max-w-none lg:h-full lg:overflow-y-auto lg:shadow-none`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-8 sm:pt-6">
            <button
              type="button"
              onClick={showMobileOverview}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[8px] pr-2 text-[13px] font-semibold text-[#0d4a52] transition-colors hover:text-[#f26522] lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
              Overview
            </button>
            <p className="ml-auto text-[12px] text-[#6b6b78]">
              {copy.switchPrompt}{' '}
              <button
                type="button"
                onClick={() => switchMode(copy.switchTo)}
                className="ml-1 inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-[#dcdce3] px-3 font-semibold text-[#111] transition-colors hover:border-[#0d4a52] hover:text-[#0d4a52]"
              >
                {copy.switchCta}
              </button>
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-start px-4 py-7 sm:px-10 sm:py-8 lg:justify-center">
            <div className="relative z-10 w-full">
              <motion.div
                layout
                transition={{ layout: { duration: shouldReduceMotion ? 0 : 0.35, ease: EASE_OUT } }}
              >
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={authMode}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: EASE_OUT }}
                  className="text-[22px] font-bold leading-tight tracking-[-0.03em] text-[#101014] sm:text-[26px]"
                >
                  {copy.title}
                </motion.h2>
              </AnimatePresence>
              <p className="mt-2 text-[13px] text-[#6b6b78]">{copy.subtitle}</p>

              <div className="relative mt-7">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={authMode}
                    layout
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: EASE_OUT }}
                  >
                    {authMode === 'signin' && (
                      <div className="space-y-6">
                        <form onSubmit={handleSignIn} className="space-y-[18px]">
                          <div className="space-y-2">
                            <label htmlFor="loginId" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Email or staff ID</label>
                            <input
                              id="loginId"
                              type="text"
                              autoComplete="username"
                              value={loginId}
                              onChange={(e) => setLoginId(e.target.value)}
                              placeholder="Select a demo account or enter your staff email"
                              required
                              className={inputClass}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label htmlFor="signinPass" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Password</label>
                              <button
                                type="button"
                                onClick={() => { setResetEmail(loginId.includes('@') ? loginId : ''); switchMode('reset'); }}
                                className="cursor-pointer text-[12px] font-semibold text-[#f26522] hover:underline"
                              >
                                Forgot password?
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                id="signinPass"
                                type={showSigninPass ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                placeholder="Select a demo account or enter your password"
                                required
                                className={`${inputClass} pr-11`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSigninPass((prev) => !prev)}
                                aria-label={showSigninPass ? 'Hide password' : 'Show password'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b98] hover:text-[#f26522] cursor-pointer"
                              >
                                {showSigninPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {loginError && <FormError message={loginError} />}

                          <label className="flex items-center gap-2 text-[12px] text-[#222]">
                            <input
                              type="checkbox"
                              checked={keepSignedIn}
                              onChange={(e) => setKeepSignedIn(e.target.checked)}
                              className="h-[15px] w-[15px] accent-[#f26522]"
                            />
                            Keep me signed in
                          </label>

                          <button type="submit" disabled={submitting} className={`${primaryBtnClass} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80`}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? 'Signing in…' : 'Sign in'}
                          </button>
                        </form>

                        <DemoAccountList
                          accounts={DEMO_ACCOUNTS}
                          onSelect={(account) => {
                            setLoginId(account.email);
                            setLoginPass(account.password || SHARED_PASSWORD);
                            setShowSigninPass(true);
                            setLoginError(null);
                          }}
                        />

                      </div>
                    )}

                    {authMode === 'register' && (
                      <form onSubmit={handleRegister} className="space-y-[18px]">
                        {regSubmitted ? (
                          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                            <p className="text-sm text-slate-700">Account created. Signing you in…</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">Your details</p>

                            <div className="space-y-2">
                              <label htmlFor="regFullName" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Full name</label>
                              <input
                                id="regFullName"
                                type="text"
                                autoComplete="name"
                                value={regFullName}
                                onChange={(e) => setRegFullName(e.target.value)}
                                placeholder="Jane Wanjiku"
                                required
                                className={inputClass}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[1fr_140px]">
                              <div className="space-y-2">
                                <label htmlFor="regEmail" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Work email</label>
                                <input
                                  id="regEmail"
                                  type="email"
                                  autoComplete="email"
                                  value={regEmail}
                                  onChange={(e) => setRegEmail(e.target.value)}
                                  placeholder="you@chemist.go.ke"
                                  required
                                  className={inputClass}
                                />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="regStaffId" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Staff ID</label>
                                <input
                                  id="regStaffId"
                                  type="text"
                                  value={regStaffId}
                                  onChange={(e) => setRegStaffId(e.target.value)}
                                  placeholder="GC-0000"
                                  required
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="regPass" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Password</label>
                              <div className="relative">
                                <input
                                  id="regPass"
                                  type={showRegPass ? 'text' : 'password'}
                                  autoComplete="new-password"
                                  value={regPassword}
                                  onChange={(e) => { setRegPassword(e.target.value); setRegError(null); }}
                                  placeholder="Create a password"
                                  required
                                  aria-describedby="regPassHint"
                                  className={`${inputClass} pr-11`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowRegPass((prev) => !prev)}
                                  aria-label={showRegPass ? 'Hide password' : 'Show password'}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b98] hover:text-[#f26522] cursor-pointer"
                                >
                                  {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              <div id="regPassHint" className="flex items-center gap-3">
                                <div className="grid flex-1 grid-cols-3 gap-1" aria-hidden="true">
                                  {PASSWORD_RULES.map((rule, index) => (
                                    <span
                                      key={rule.label}
                                      className={`h-1 rounded-full transition-colors ${index < regStrength ? STRENGTH_COLORS[regStrength] : 'bg-slate-200'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  {regPassword ? STRENGTH_LABELS[regStrength] : PASSWORD_RULES.map(r => r.label).join(', ')}
                                </span>
                              </div>
                            </div>

                            <p className="pt-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">Your role</p>

                            <div className="space-y-2">
                              <label htmlFor="regRole" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Role</label>
                              <Select<UserRole>
                                id="regRole"
                                value={regRole}
                                onChange={(role) => {
                                  setRegRole(role);
                                  setRegDepartment(isScientificRole(role) ? departmentOptions[0] : undefined);
                                }}
                                buttonClassName={`${inputClass} !py-0 !pl-[14px]`}
                                options={SELF_REGISTER_ROLES.map((role) => ({ value: role, label: role.replace(/_/g, ' ') }))}
                              />
                              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                {roleTierIcon[getRoleTier(regRole)]}
                                {roleTierLabel[getRoleTier(regRole)]}
                              </p>
                            </div>

                            {isScientificRole(regRole) && (
                              <div className="space-y-2">
                                <label htmlFor="regDept" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Department</label>
                                <Select<LaboratoryDepartment>
                                  id="regDept"
                                  value={regDepartment ?? departmentOptions[0]}
                                  onChange={setRegDepartment}
                                  buttonClassName={`${inputClass} !py-0 !pl-[14px]`}
                                  options={departmentOptions.map((dept) => ({ value: dept, label: departmentLabels[dept] }))}
                                />
                              </div>
                            )}

                            {regError && <FormError message={regError} />}

                            <button type="submit" className={primaryBtnClass}>Create account</button>

                            <p className="text-center text-[11px] leading-relaxed text-slate-500">
                              By creating an account you agree to the{' '}
                              <button type="button" onClick={() => setShowTerms(true)} className="cursor-pointer text-[#111] underline">Terms &amp; Privacy</button>.
                            </p>
                          </>
                        )}
                      </form>
                    )}

                    {authMode === 'reset' && (
                      resetSent ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                            <p className="text-sm font-semibold text-slate-800">Check your inbox</p>
                            <p className="mt-1 text-[12px] text-slate-600">
                              If an account exists for <span className="font-semibold">{resetEmail}</span>, a reset link is on its way.
                            </p>
                          </div>
                          <button type="button" onClick={() => switchMode('signin')} className={primaryBtnClass}>Back to sign in</button>
                        </div>
                      ) : (
                        <form onSubmit={handleReset} className="space-y-[18px]">
                          <div className="space-y-2">
                            <label htmlFor="resetEmail" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Work email</label>
                            <input
                              id="resetEmail"
                              type="email"
                              autoComplete="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              placeholder="you@chemist.go.ke"
                              required
                              className={inputClass}
                            />
                          </div>
                          <button type="submit" className={primaryBtnClass}>Send reset link</button>
                        </form>
                      )
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              </motion.div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#eeeef1] px-4 py-4 text-[11px] text-slate-500 sm:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowTerms(true)} className="cursor-pointer hover:text-[#111]">Terms</button>
              <button type="button" onClick={() => setShowTerms(true)} className="cursor-pointer hover:text-[#111]">Privacy</button>
              <a href="mailto:support@chemist.go.ke" className="hover:text-[#111]">Help</a>
            </div>
            <span>© {new Date().getFullYear()} Government Chemist</span>
          </div>
        </div>
        </div>
      </div>

      <TermsDialog open={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};