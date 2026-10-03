import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'motion/react';
import {
  Shield,
  KeyRound,
  FlaskConical,
  CheckCircle2,
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
import { apiRequest } from '../../lib/api';
import {
  DEPARTMENT_LABELS,
  departmentForRole,
  departmentsForRole,
} from '../../lib/departments';

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

const ADMIN_PROVISIONED_ROLES: UserRole[] = ['CEO', 'VICE_CEO', 'ADMINISTRATOR', 'HEAD_OF_DEPARTMENT'];

const SELF_REGISTER_ROLES: UserRole[] = CREDENTIAL_GROUPS
  .flatMap(g => g.roles)
  .filter(role => !ADMIN_PROVISIONED_ROLES.includes(role));

type AuthMode = 'signin' | 'register' | 'activate' | 'forgot' | 'reset';

const AUTH_COPY: Record<AuthMode, { title: string; subtitle: string; switchPrompt: string; switchCta: string; switchTo: AuthMode }> = {
  signin: {
    title: 'Sign in to GC-ILCMS',
    subtitle: 'Welcome back. Sign in with your work email.',
    switchPrompt: 'No account yet?',
    switchCta: 'Create account',
    switchTo: 'register',
  },
  register: {
    title: 'Request an account',
    subtitle: 'A super-admin must approve your request before you receive a 15-minute activation link.',
    switchPrompt: 'Already have an account?',
    switchCta: 'Sign in',
    switchTo: 'signin',
  },
  activate: {
    title: 'Activate your account',
    subtitle: 'Set a password to complete your staff account activation.',
    switchPrompt: 'Already activated?',
    switchCta: 'Sign in',
    switchTo: 'signin',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: 'Enter your work email and we will send you a one-time reset link.',
    switchPrompt: 'Remembered it?',
    switchCta: 'Sign in',
    switchTo: 'signin',
  },
  reset: {
    title: 'Choose a new password',
    subtitle: 'Set a new password to regain access to your account.',
    switchPrompt: 'Changed your mind?',
    switchCta: 'Sign in',
    switchTo: 'signin',
  },
};

const FormError: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="flex items-center gap-1.5 text-[12px] text-rose-600">
    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
    {message}
  </p>
);

const getRoleTier = (role: UserRole): string => {
  const group = CREDENTIAL_GROUPS.find(g => g.roles.includes(role));
  return group?.tier || 'standard';
};

const departmentLabels = DEPARTMENT_LABELS;

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
      body: 'The system records your identity (name, email), role, and department to control access. When you use it, the platform persists case records, exhibit descriptions, analysis results, and custody events that you legitimately create or are assigned to. It does not collect unrelated personal data.',
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
  // Read the token once at mount. Re-deriving it on every render races the
  // effect below that strips the query string from the address bar, which drops
  // the token mid-flow and leaves the form unusable.
  // Reset links land on /reset-password?token=..., activation links on
  // /activate?token=...
  const [{ token: invitationToken, expiresAt: invitationExpiresAt, resetToken, resetExpiresAt }] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const expires = params.get('expires');
    const isResetLink = window.location.pathname === '/reset-password';
    return {
      token: isResetLink ? '' : params.get('token') ?? '',
      expiresAt: expires ? Date.parse(expires) || 0 : 0,
      resetToken: isResetLink ? params.get('token') ?? '' : '',
      resetExpiresAt: expires ? Date.parse(expires) || 0 : 0,
    };
  });
  const [activeStep, setActiveStep] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(
    resetToken ? 'reset' : invitationToken ? 'activate' : 'signin',
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showSigninPass, setShowSigninPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [regError, setRegError] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('ANALYST');
  const [regDepartment, setRegDepartment] = useState<LaboratoryDepartment>(departmentForRole('ANALYST'));
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [activationPassword, setActivationPassword] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationComplete, setActivationComplete] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetComplete, setResetComplete] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [activationSecondsLeft, setActivationSecondsLeft] = useState(() =>
    invitationExpiresAt ? Math.max(0, Math.ceil((invitationExpiresAt - Date.now()) / 1000)) : 0);
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

  useEffect(() => {
    if (!invitationExpiresAt) return;
    const updateTimer = () => setActivationSecondsLeft(
      Math.max(0, Math.ceil((invitationExpiresAt - Date.now()) / 1000)),
    );
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [invitationExpiresAt]);

  useEffect(() => {
    if (activationComplete && invitationToken) window.history.replaceState({}, '', window.location.pathname);
  }, [activationComplete, invitationToken]);

  useEffect(() => {
    if (resetComplete) window.history.replaceState({}, '', '/');
  }, [resetComplete]);

  const moveStep = (direction: -1 | 1) => {
    setActiveStep((current) => (current + direction + LIFECYCLE_STEPS.length) % LIFECYCLE_STEPS.length);
  };

  const step = LIFECYCLE_STEPS[activeStep];

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setLoginError(null);
    setRegError(null);
    setActivationError(null);
    if (mode === 'register') {
      setRegSubmitted(false);
      setRegistrationMessage('');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setLoginError(null);
    setSubmitting(true);
    try {
      const result = await apiRequest<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      onLogin(result.user);
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          role: regRole,
          department: regDepartment,
        }),
      });
      setRegSubmitted(true);
      setRegError(null);
      setRegistrationMessage(result.message);
    } catch (cause) {
      setRegError(cause instanceof Error ? cause.message : 'Could not submit the account request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({ token: invitationToken, password: activationPassword }),
      });
      setActivationComplete(true);
      window.history.replaceState({}, '', window.location.pathname);
    } catch (cause) {
      setActivationError(cause instanceof Error ? cause.message : 'Account activation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotMessage(result.message);
      setForgotError(null);
    } catch (cause) {
      setForgotError(cause instanceof Error ? cause.message : 'The reset link could not be requested.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (resetPassword !== resetConfirm) {
      setResetError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, password: resetPassword }),
      });
      setResetComplete(true);
    } catch (cause) {
      setResetError(cause instanceof Error ? cause.message : 'The password could not be updated.');
    } finally {
      setSubmitting(false);
    }
  };

  const copy = AUTH_COPY[authMode];

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
                  Secure staff access
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
                            <label htmlFor="loginEmail" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Work email</label>
                            <input
                              id="loginEmail"
                              type="email"
                              autoComplete="email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="name@chemist.go.ke"
                              required
                              className={inputClass}
                            />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="signinPass" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Password</label>
                            <div className="relative">
                              <input
                                id="signinPass"
                                type={showSigninPass ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                placeholder="Enter your password"
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

                          <button type="submit" disabled={submitting} className={`${primaryBtnClass} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80`}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? 'Signing in…' : 'Sign in'}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setForgotEmail(loginEmail); setAuthMode('forgot'); }}
                            className="cursor-pointer text-[12px] font-semibold text-[#f26522] underline-offset-2 hover:underline"
                          >
                            Forgot your password?
                          </button>
                        </form>

                      </div>
                    )}

                    {authMode === 'forgot' && (
                      <div className="space-y-6">
                        <form onSubmit={handleForgotPassword} className="space-y-[18px]">
                          <div className="space-y-2">
                            <label htmlFor="forgotEmail" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Work email</label>
                            <input
                              id="forgotEmail"
                              type="email"
                              autoComplete="email"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="name@chemist.go.ke"
                              required
                              className={inputClass}
                            />
                          </div>

                          {forgotError && <FormError message={forgotError} />}

                          {forgotMessage ? (
                            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                              <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                              <p className="text-sm font-semibold text-slate-700">Check your inbox</p>
                              <p className="mt-1 text-xs text-slate-600">{forgotMessage}</p>
                            </div>
                          ) : (
                            <button type="submit" disabled={submitting} className={`${primaryBtnClass} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80`}>
                              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                              {submitting ? 'Sending…' : 'Send reset link'}
                            </button>
                          )}
                        </form>
                      </div>
                    )}

                    {authMode === 'reset' && (
                      <div className="space-y-6">
                        {!resetToken ? (
                          <>
                            <FormError message="This reset link is missing its token. Request a new link from the sign-in page." />
                            <button
                              type="button"
                              onClick={() => setAuthMode('forgot')}
                              className={`${primaryBtnClass} inline-flex w-full items-center justify-center gap-2`}
                            >
                              Request a new link
                            </button>
                          </>
                        ) : resetComplete ? (
                          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                            <p className="text-sm font-semibold text-slate-700">Password updated</p>
                            <p className="mt-1 text-xs text-slate-600">Sign in with your new password. Any other active sessions were signed out.</p>
                            <button
                              type="button"
                              onClick={() => setAuthMode('signin')}
                              className="mt-3 cursor-pointer text-[12px] font-semibold text-[#f26522] underline-offset-2 hover:underline"
                            >
                              Go to sign in
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleResetPassword} className="space-y-[18px]">
                            <div className="space-y-2">
                              <label htmlFor="resetPassword" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">New password</label>
                              <div className="relative">
                                <input
                                  id="resetPassword"
                                  type={showResetPass ? 'text' : 'password'}
                                  autoComplete="new-password"
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  placeholder="At least 12 characters"
                                  minLength={12}
                                  required
                                  className={`${inputClass} pr-11`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowResetPass((prev) => !prev)}
                                  aria-label={showResetPass ? 'Hide password' : 'Show password'}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b98] hover:text-[#f26522] cursor-pointer"
                                >
                                  {showResetPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-500">Use at least 12 characters.</p>
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="resetConfirm" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Confirm new password</label>
                              <input
                                id="resetConfirm"
                                type={showResetPass ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={resetConfirm}
                                onChange={(e) => setResetConfirm(e.target.value)}
                                placeholder="Repeat the new password"
                                minLength={12}
                                required
                                className={inputClass}
                              />
                            </div>

                            {resetError && <FormError message={resetError} />}

                            <button type="submit" disabled={submitting} className={`${primaryBtnClass} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80`}>
                              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                              {submitting ? 'Updating…' : 'Update password'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {authMode === 'register' && (
                      <form onSubmit={handleRegister} className="space-y-[18px]">
                        {regSubmitted ? (
                          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                            <p className="text-sm font-semibold text-slate-700">Request submitted</p>
                            <p className="mt-1 text-xs text-slate-600">{registrationMessage}</p>
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
                              </div>

                            <p className="pt-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">Your role</p>

                            <div className="space-y-2">
                              <label htmlFor="regRole" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Role</label>
                              <Select<UserRole>
                                id="regRole"
                                value={regRole}
                                onChange={(role) => {
                                  setRegRole(role);
                                  setRegDepartment(departmentForRole(role, regDepartment));
                                }}
                                buttonClassName={`${inputClass} !py-0 !pl-[14px]`}
                                options={SELF_REGISTER_ROLES.map((role) => ({ value: role, label: role.replace(/_/g, ' ') }))}
                              />
                              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                {roleTierIcon[getRoleTier(regRole)]}
                                {roleTierLabel[getRoleTier(regRole)]}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="regDept" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Department</label>
                              <Select<LaboratoryDepartment>
                                id="regDept"
                                value={regDepartment}
                                onChange={setRegDepartment}
                                buttonClassName={`${inputClass} !py-0 !pl-[14px]`}
                                options={departmentsForRole(regRole).map((dept) => ({ value: dept, label: departmentLabels[dept] }))}
                              />
                              <p className="text-[11px] text-slate-500">
                                {departmentsForRole(regRole).length === 1
                                  ? 'This role is institution-wide and is not attached to a laboratory.'
                                  : 'Select the laboratory division you work in.'}
                              </p>
                            </div>

                            {regError && <FormError message={regError} />}

                            <button type="submit" disabled={submitting} className={`${primaryBtnClass} disabled:opacity-60`}>{submitting ? 'Submitting…' : 'Request account approval'}</button>

                            <p className="text-center text-[11px] leading-relaxed text-slate-500">
                              By submitting a request you agree to the{' '}
                              <button type="button" onClick={() => setShowTerms(true)} className="cursor-pointer text-[#111] underline">Terms &amp; Privacy</button>.
                            </p>
                          </>
                        )}
                      </form>
                    )}

                    {authMode === 'activate' && (
                      activationComplete ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                            <p className="text-sm font-semibold text-slate-800">Account activated</p>
                            <p className="mt-1 text-xs text-slate-600">You can now sign in using your work email.</p>
                          </div>
                          <button type="button" onClick={() => switchMode('signin')} className={primaryBtnClass}>Continue to sign in</button>
                        </div>
                      ) : (
                        <form onSubmit={handleActivate} className="space-y-[18px]">
                          <div className="space-y-2">
                            <label htmlFor="activatePassword" className="block text-[13px] font-semibold text-[#111] sm:text-[12px]">Create password</label>
                            <input
                              id="activatePassword"
                              type="password"
                              autoComplete="new-password"
                              minLength={12}
                              maxLength={256}
                              value={activationPassword}
                              onChange={(e) => setActivationPassword(e.target.value)}
                              placeholder="At least 12 characters"
                              required
                              className={inputClass}
                            />
                          </div>
                          {!invitationToken && <FormError message="The invitation link is missing its token." />}
                          {invitationToken && invitationExpiresAt > 0 && (
                            <p role="timer" className={`text-xs font-semibold ${activationSecondsLeft ? 'text-amber-700' : 'text-rose-600'}`}>
                              {activationSecondsLeft
                                ? `Invitation expires in ${String(Math.floor(activationSecondsLeft / 60)).padStart(2, '0')}:${String(activationSecondsLeft % 60).padStart(2, '0')}`
                                : 'Invitation expired. Ask the administrator to resend it.'}
                            </p>
                          )}
                          {activationError && <FormError message={activationError} />}
                          <button disabled={submitting || !invitationToken || (invitationExpiresAt > 0 && !activationSecondsLeft)} className={`${primaryBtnClass} disabled:opacity-60`}>
                            {submitting ? 'Activating…' : 'Activate account'}
                          </button>
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