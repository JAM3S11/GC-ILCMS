import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  UserRole,
  ForensicCase,
  OfficerVisitor,
  AppNotification,
  AuditEvent,
  DraftReport,
  ExhibitItem,
  CustodyRecord,
  FoodDrugIntake,
  LaboratoryDepartment,
  WaterIntake,
} from './types';
import { FlaskConical } from 'lucide-react';
import {
  INITIAL_USERS,
  DEMO_CASE,
  INITIAL_VISITOR,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './data/initialData';
import { LandingPage, DEMO_ACCOUNTS } from './components/landing/LandingPage';
import { FoodDrugIntakePage } from './components/laboratory/FoodDrugIntakePage';
import { WaterIntakePage } from './components/laboratory/WaterIntakePage';
import { Header } from './components/common/Header';
import { AppShell } from './components/layout/AppShell';
import { PrototypeToolbar } from './components/common/PrototypeToolbar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { PrototypeTourModal } from './components/common/PrototypeTourModal';
import { VisitorDeskView } from './components/reception/VisitorDeskView';
import { VisitorRegistrationPage } from './components/reception/VisitorRegistrationPage';
import { LabBayView, CheckOutView, NotificationsView } from './components/reception/ReceptionWorkflowViews';

import { LaboratoryWorkspace } from './components/laboratory/LaboratoryWorkspace';
import { DigitalCaseFile } from './components/case/DigitalCaseFile';
import { ReferenceDatabaseView } from './components/reference/ReferenceDatabaseView';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { RoleDashboard } from './components/dashboard/RoleDashboard';
import { OfficerVerificationModal } from './components/laboratory/OfficerVerificationModal';
import { SubmissionIntakeModal } from './components/laboratory/SubmissionIntakeModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { SettingsView, readUserSettings } from './components/settings/SettingsView';
import { useTheme } from './theme/ThemeProvider';

const LABORATORY_WORKSPACE_ROLES: UserRole[] = ['ANALYST', 'HEAD_OF_DEPARTMENT'];
const RECEPTIONIST_VIEWS = new Set(['dashboard', 'register-visitor', 'lab-bay', 'check-out', 'audit', 'settings']);

// Every member of these departments (interns included) works the laboratory
// workspace, since each of them registers submissions for the section.
const LABORATORY_WORKSPACE_DEPARTMENTS: LaboratoryDepartment[] = ['Food & Drugs'];

const canAccessLaboratoryWorkspace = (user?: User | null) =>
  !!user &&
  (LABORATORY_WORKSPACE_ROLES.includes(user.role) ||
    (!!user.department && LABORATORY_WORKSPACE_DEPARTMENTS.includes(user.department)));

const isReceptionist = (role?: UserRole | null) => role === 'RECEPTIONIST';

export default function App() {
  const { setMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('landing');
  const [activeCase, setActiveCase] = useState<ForensicCase>(DEMO_CASE);
  const [visitors, setVisitors] = useState<OfficerVisitor[]>([INITIAL_VISITOR]);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOGS);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [officerVerified, setOfficerVerified] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global modals for Verification and Intake
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  // Which visitor the intake modals are bound to. Prefers the most recent
  // visitor routed to the signed-in officer's own laboratory, so a Food &
  // Drugs officer always opens intake on a Food & Drugs submission.
  const intakeVisitor = useMemo(
    () =>
      visitors.find((v) => !!currentUser?.department && v.laboratory === currentUser.department) ??
      visitors[0],
    [visitors, currentUser?.department]
  );

  // Officers the Food & Drugs Head of Section can assign samples to.
  const foodDrugOfficers = useMemo(() => {
    const seen = new Set<string>();
    return [...INITIAL_USERS, ...DEMO_ACCOUNTS].filter((u) => {
      if (u.department !== 'Food & Drugs' || u.role === 'HEAD_OF_DEPARTMENT' || seen.has(u.name)) return false;
      seen.add(u.name);
      return true;
    });
  }, []);

  // Water & Environment staff: every member can receive an exhibit; only
  // officers (not the Head) are offered as Analysis Officers.
  const waterStaff = useMemo(() => {
    const seen = new Set<string>();
    return [...INITIAL_USERS, ...DEMO_ACCOUNTS].filter((u) => {
      if (u.department !== 'Water' || seen.has(u.name)) return false;
      seen.add(u.name);
      return true;
    });
  }, []);
  const waterOfficers = useMemo(() => waterStaff.filter((u) => u.role !== 'HEAD_OF_DEPARTMENT'), [waterStaff]);

  // Departmental alerts: staff attached to a laboratory only see notifications
  // addressed to their own department (or their role), never another
  // department's intake. Roles with no department — reception, administration,
  // executive — continue to see everything.
  const visibleNotifications = useMemo(() => {
    if (!currentUser || !currentUser.department) return notifications;
    return notifications.filter(
      (n) =>
        (n.recipientDepartment && n.recipientDepartment === currentUser.department) ||
        (n.recipientRole && n.recipientRole === currentUser.role)
    );
  }, [notifications, currentUser]);

  // Prototype Modal States
  const [searchOpen, setSearchOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const settings = readUserSettings(currentUser.id);
    setMode(settings.themeMode);
    setSidebarCollapsed(settings.compactSidebar);
  }, [currentUser?.id, setMode]);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (isReceptionist(currentUser.role) && !RECEPTIONIST_VIEWS.has(activeView)) {
      setActiveView('dashboard');
    } else if (activeView === 'laboratory' && !canAccessLaboratoryWorkspace(currentUser)) {
      setActiveView('dashboard');
    } else if (activeView === 'food-drug-intake' && currentUser.department !== 'Food & Drugs') {
      setActiveView('dashboard');
    } else if (activeView === 'water-intake' && currentUser.department !== 'Water') {
      setActiveView('dashboard');
    }
  }, [currentUser?.role, currentUser?.department, activeView]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // User logs directly into the real operational dashboard
    setActiveView('dashboard');

    // Add audit log
    const newLog: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: `${user.name} (${user.staffId})`,
      role: user.role,
      action: 'USER_LOGIN',
      recordType: 'Session',
      recordId: `SES-${Date.now().toString().slice(-4)}`,
      details: `User successfully authenticated into GC-ILCMS with role ${user.role}.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(`Welcome ${user.name} (${user.role}) — Opened Operational Dashboard`);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setActiveView('landing');
    showToast('Signed out of forensic workstation. Returned to public portal.');
  };

  const handleNavigateView = (view: string) => {    if (view === 'landing') {
      setCurrentUser(null);
      setActiveView('landing');
      return;
    }

    if (isReceptionist(currentUser?.role) && !RECEPTIONIST_VIEWS.has(view)) {
      showToast('Reception access is limited to registration, Lab Bay monitoring, and check-out.');
      return;
    }

    if (view === 'food-drug-intake' && currentUser?.department !== 'Food & Drugs') {
      showToast('Food & Drugs sample registration is restricted to Food & Drugs staff.');
      return;
    }

    if (view === 'water-intake' && currentUser?.department !== 'Water') {
      showToast('Water & Environment exhibit intake is restricted to Water & Environment staff.');
      return;
    }

    if (view === 'laboratory' && !canAccessLaboratoryWorkspace(currentUser)) {
      showToast('Laboratory Workspace is restricted to Analyst and Head of Department roles, and Food & Drugs staff.');
      return;
    }

    if (!currentUser) {
      setCurrentUser(INITIAL_USERS[0]); // Default to Dr. Wanjiku (Reporting Analyst)
    }
    setActiveView(view);
  };

  const handleRegisterVisitor = (newVisitor: OfficerVisitor) => {
    setVisitors((prev) => [newVisitor, ...prev]);

    // Add alert notification for target laboratory
    const isFoodDrug = newVisitor.laboratory === 'Food & Drugs';
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      timestamp: 'Just now',
      title: isFoodDrug
        ? 'Incoming Food & Drugs Sample Submission'
        : 'Incoming Police Seizure Exhibit',
      message: isFoodDrug
        ? `${newVisitor.officerName} (${newVisitor.poBox || newVisitor.station}) has been registered at reception and is awaiting sample registration.`
        : `${newVisitor.officerName} (${newVisitor.station}) presented exhibits for ${newVisitor.laboratory} examination.`,
      recipientDepartment: newVisitor.laboratory,
      type: 'urgent',
      read: false,
      linkAction: 'LAB_VERIFICATION',
      relatedVisitorId: newVisitor.id,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Add audit event
    const audit: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser ? `${currentUser.name} (${currentUser.staffId})` : 'Reception Desk',
      role: currentUser ? currentUser.role : 'RECEPTIONIST',
      action: 'VISITOR_REGISTERED',
      recordType: 'Visitor',
      recordId: newVisitor.id,
      details: `Registered officer ${newVisitor.officerName} from ${newVisitor.station} with exhibits for ${newVisitor.laboratory} Lab.`,
    };
    setAuditLogs((prev) => [audit, ...prev]);
    showToast(`Visitor ${newVisitor.id} registered & laboratory notified.`);
  };

  const handleSendLabNotification = (visitor: OfficerVisitor) => {
    showToast(`Notification sent to Head of ${visitor.laboratory} Laboratory.`);
  };

  const handleCheckOutVisitor = (id: string) => {
    const outTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const target = visitors.find((v) => v.id === id);
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, timeOut: outTime, status: 'Departed' } : v
      )
    );

    const audit: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser ? `${currentUser.name} (${currentUser.staffId})` : 'Reception Desk',
      role: currentUser ? currentUser.role : 'RECEPTIONIST',
      action: 'VISITOR_CHECKED_OUT',
      recordType: 'Visitor',
      recordId: id,
      details: `Recorded departure of ${target?.officerName ?? 'client'} at ${outTime} and closed visitor register entry.`,
    };
    setAuditLogs((prev) => [audit, ...prev]);
    showToast(`Visitor ${id} checked out at ${outTime}.`);
  };

  const handleVerifyOfficer = (visitorId?: string) => {
    const targetId = visitorId || visitors[0]?.id || 'VIS-2026-0042';
    setOfficerVerified(true);
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === targetId ? { ...v, status: 'In Laboratory' } : v
      )
    );

    const audit: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser ? `${currentUser.name} (${currentUser.staffId})` : 'Analyst',
      role: currentUser ? currentUser.role : 'ANALYST',
      action: 'OFFICER_VERIFIED',
      recordType: 'Visitor',
      recordId: targetId,
      details: 'Officer credentials verified and exhibits accepted into Narcotics Receiving Bay.',
    };
    setAuditLogs((prev) => [audit, ...prev]);
    showToast('Officer credentials verified. Exhibits admitted for analytical intake.');
  };

  const handleRegisterSubmission = (submissionData: {
    caseNumber: string;
    submissionType: string;
    description: string;
    dateReceived: string;
    receivedFrom: string;
    receivedBy: string;
    department: LaboratoryDepartment;
    storageLocation: string;
    supportingDocuments: string;
    remarks: string;
    exhibits: ExhibitItem[];
    foodDrugIntake?: FoodDrugIntake;
    waterIntake?: WaterIntake;
  }) => {
    setActiveCase((prev) => {
      const existingExhibitIds = new Set(prev.exhibits.map((e) => e.id));
      const combinedExhibits = [
        ...prev.exhibits,
        ...submissionData.exhibits.filter((e) => !existingExhibitIds.has(e.id)),
      ];

      const newCustodyRecords: CustodyRecord[] = submissionData.exhibits.map((ex, idx) => ({
        id: `CUST-REC-${Date.now()}-${idx}`,
        timestamp: `${submissionData.dateReceived} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        sampleOrExhibitId: ex.id,
        fromEntity: submissionData.receivedFrom,
        toEntity: `${submissionData.receivedBy} (${submissionData.department} Lab)`,
        officerOrStaffName: submissionData.receivedBy,
        location: submissionData.storageLocation,
        action: 'Received',
        condition: ex.condition,
        destination: submissionData.storageLocation,
        remarks: submissionData.foodDrugIntake
          ? `Sample registered under Section 9F protocol. ${submissionData.foodDrugIntake.sampleType} sample. Seal: ${ex.sealNumber}`
          : submissionData.waterIntake
            ? `Water & Environment exhibit ${submissionData.waterIntake.labReference}. Seal: ${ex.sealNumber}`
            : `Physical intake completed under Section 9 protocol. Seal: ${ex.sealNumber}`,
        signatureHash: `SHA256:7f9a2b8c4d1e${Date.now().toString().slice(-6)}`,
      }));

      return {
        ...prev,
        caseNumber: submissionData.caseNumber,
        description: submissionData.description,
        exhibits: combinedExhibits,
        foodDrugIntakes: submissionData.foodDrugIntake
          ? [submissionData.foodDrugIntake, ...(prev.foodDrugIntakes ?? [])]
          : prev.foodDrugIntakes,
        waterIntakes: submissionData.waterIntake
          ? [submissionData.waterIntake, ...(prev.waterIntakes ?? [])]
          : prev.waterIntakes,
        custodyHistory: [...newCustodyRecords, ...prev.custodyHistory],
      };
    });

    const audit: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser ? `${currentUser.name} (${currentUser.staffId})` : 'Analyst',
      role: currentUser ? currentUser.role : 'ANALYST',
      action: 'EXHIBITS_REGISTERED',
      recordType: 'Exhibit',
      recordId: submissionData.exhibits[0]?.id || 'EXH-BATCH',
      details: `Registered ${submissionData.exhibits.length} exhibit item(s) from ${submissionData.receivedFrom} into ${submissionData.department} Lab vault.`,
    };
    setAuditLogs((prev) => [audit, ...prev]);

    const fdi = submissionData.foodDrugIntake;
    if (fdi) {
      setNotifications((prev) => [
        {
          id: `NOTIF-${Date.now()}`,
          timestamp: 'Just now',
          title: 'Food & Drugs sample awaiting assignment',
          message: `${fdi.id} (${fdi.sampleType}) from ${fdi.clientName} was received by ${fdi.receiver}. The Head of Section must assign an officer.`,
          recipientDepartment: 'Food & Drugs',
          type: 'warning',
          read: false,
          linkAction: 'LAB_WORKSPACE',
        },
        ...prev,
      ]);
      showToast(`Sample ${fdi.id} registered. Awaiting officer assignment by the Head of Section.`);
      return;
    }

    const wi = submissionData.waterIntake;
    if (wi) {
      setNotifications((prev) => [
        {
          id: `NOTIF-${Date.now()}`,
          timestamp: 'Just now',
          title: 'Water & Environment exhibit awaiting assignment',
          message: `${wi.labReference} (${wi.testType}, ${wi.sourceCategory}) from ${wi.senderName} was received by ${wi.receivingOfficer}. The Head of Water & Environment must assign an Analysis Officer.`,
          recipientDepartment: 'Water',
          type: 'warning',
          read: false,
          linkAction: 'LAB_WORKSPACE',
        },
        ...prev,
      ]);
      showToast(`Exhibit ${wi.labReference} registered. Awaiting Analysis Officer assignment by the Head.`);
      return;
    }
    showToast(`Registered ${submissionData.exhibits.length} exhibit(s) into Digital Case File.`);
  };

  const updateFoodDrugIntake = (intakeId: string, patch: Partial<FoodDrugIntake>) =>
    setActiveCase((prev) => ({
      ...prev,
      foodDrugIntakes: prev.foodDrugIntakes?.map((i) => (i.id === intakeId ? { ...i, ...patch } : i)),
    }));

  const logFoodDrugAudit = (action: string, intakeId: string, details: string) => {
    if (!currentUser) return;
    setAuditLogs((prev) => [
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: `${currentUser.name} (${currentUser.staffId})`,
        role: currentUser.role,
        action,
        recordType: 'Exhibit',
        recordId: intakeId,
        details,
      },
      ...prev,
    ]);
  };

  // Stage 2: only the Head of the Food & Drugs section assigns an officer.
  const handleAssignFoodDrugIntake = (intakeId: string, analyst: string) => {
    const intake = activeCase.foodDrugIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake || intake.status !== 'Awaiting Assignment') return;
    if (currentUser.role !== 'HEAD_OF_DEPARTMENT' || currentUser.department !== 'Food & Drugs') {
      showToast('Only the Head of the Food & Drugs section can assign officers.');
      return;
    }
    updateFoodDrugIntake(intakeId, {
      status: 'Under Analysis',
      analystAssigned: analyst,
      assignedBy: currentUser.name,
      assignedDate: new Date().toISOString().split('T')[0],
    });
    logFoodDrugAudit('FD_SAMPLE_ASSIGNED', intakeId, `Assigned ${intakeId} to ${analyst} for analysis.`);
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        timestamp: 'Just now',
        title: 'Food & Drugs sample assigned',
        message: `${intakeId} (${intake.sampleType}) has been assigned to ${analyst} by ${currentUser.name}.`,
        recipientDepartment: 'Food & Drugs',
        type: 'info',
        read: false,
        linkAction: 'LAB_WORKSPACE',
      },
      ...prev,
    ]);
    showToast(`${intakeId} assigned to ${analyst}.`);
  };

  // Stage 3 (final): Reported By, once the assigned officer's analysis is done.
  const handleReportFoodDrugIntake = (intakeId: string, reportedBy: string) => {
    const intake = activeCase.foodDrugIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake || intake.status !== 'Under Analysis') return;
    const allowed =
      currentUser.department === 'Food & Drugs' &&
      (currentUser.role === 'HEAD_OF_DEPARTMENT' || currentUser.name === intake.analystAssigned);
    if (!allowed) {
      showToast('Only the assigned officer or the Head of Section can report this sample.');
      return;
    }
    updateFoodDrugIntake(intakeId, {
      status: 'Reported',
      reportedBy,
      reportedDate: new Date().toISOString().split('T')[0],
    });
    logFoodDrugAudit('FD_SAMPLE_REPORTED', intakeId, `Analysis of ${intakeId} completed and reported by ${reportedBy}.`);
    showToast(`${intakeId} reported by ${reportedBy}.`);
  };

  const updateWaterIntake = (intakeId: string, patch: Partial<WaterIntake>) =>
    setActiveCase((prev) => ({
      ...prev,
      waterIntakes: prev.waterIntakes?.map((i) => (i.id === intakeId ? { ...i, ...patch } : i)),
    }));

  // Only the Head of Water & Environment assigns the Analysis Officer. The
  // alert goes to the whole department so every officer sees who holds it.
  const handleAssignWaterIntake = (intakeId: string, officer: string) => {
    const intake = activeCase.waterIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake || intake.status !== 'Awaiting Assignment') return;
    if (currentUser.role !== 'HEAD_OF_DEPARTMENT' || currentUser.department !== 'Water') {
      showToast('Only the Head of Water & Environment can assign an Analysis Officer.');
      return;
    }
    updateWaterIntake(intakeId, {
      status: 'Under Analysis',
      analysisOfficer: officer,
      assignedBy: currentUser.name,
      assignedDate: new Date().toISOString().split('T')[0],
    });
    logFoodDrugAudit('WE_EXHIBIT_ASSIGNED', intake.labReference, `Assigned ${intake.labReference} to ${officer} as Analysis Officer.`);
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        timestamp: 'Just now',
        title: 'Water & Environment exhibit assigned',
        message: `${intake.labReference} (${intake.testType}) has been assigned to ${officer} for analysis by ${currentUser.name}.`,
        recipientDepartment: 'Water',
        type: 'info',
        read: false,
        linkAction: 'LAB_WORKSPACE',
      },
      ...prev,
    ]);
    showToast(`${intake.labReference} assigned to ${officer}.`);
  };

  const handleCompleteWaterIntake = (intakeId: string) => {
    const intake = activeCase.waterIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake || intake.status !== 'Under Analysis') return;
    const allowed =
      currentUser.department === 'Water' &&
      (currentUser.role === 'HEAD_OF_DEPARTMENT' || currentUser.name === intake.analysisOfficer);
    if (!allowed) {
      showToast('Only the assigned Analysis Officer or the Head can complete this exhibit.');
      return;
    }
    updateWaterIntake(intakeId, {
      status: 'Analysis Complete',
      completedBy: currentUser.name,
      completedDate: new Date().toISOString().split('T')[0],
    });
    logFoodDrugAudit('WE_ANALYSIS_COMPLETE', intake.labReference, `Analysis of ${intake.labReference} completed by ${currentUser.name}.`);
    showToast(`${intake.labReference} marked analysis complete.`);
  };

  const isFoodDrugUser = currentUser?.department === 'Food & Drugs';
  const isWaterUser = currentUser?.department === 'Water';

  // Every intake button funnels through here: Food & Drugs staff go to the
  // registration page, everyone else gets the generic exhibit intake modal.
  const openIntake = () => {
    if (isFoodDrugUser) {
      handleNavigateView('food-drug-intake');
      return;
    }
    if (isWaterUser) {
      handleNavigateView('water-intake');
      return;
    }
    setShowIntakeModal(true);
  };

  const handleUpdateDraftReport = (updatedReport: DraftReport) => {
    setActiveCase((prev) => ({
      ...prev,
      draftReport: updatedReport,
      status: 'REPORT_DRAFT',
    }));

    const audit: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser ? `${currentUser.name} (${currentUser.staffId})` : 'Gazetted Analyst',
      role: currentUser ? currentUser.role : 'ANALYST',
      action: 'DRAFT_REPORT_UPDATED',
      recordType: 'Report',
      recordId: updatedReport.reportNumber,
      details: 'Statutory certificate draft findings and conclusion modified in digital case file.',
    };
    setAuditLogs((prev) => [audit, ...prev]);
    showToast('Digital Case File draft report synchronized.');
  };

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 border border-amber-400 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* IF NOT AUTHENTICATED OR ON LANDING VIEW -> RENDER REFINED LANDING PAGE */}
      {(!currentUser || activeView === 'landing') ? (
        <LandingPage onLogin={handleLogin} />
      ) : (
        /* IF AUTHENTICATED -> RENDER FULL GC-ILCMS INTERNAL WORKSPACE
           As a fixed, full-height app frame: toolbar + header stay pinned,
           only the main content region scrolls. */
        <div className="h-[100dvh] flex flex-col overflow-hidden">
          {/* Persistent Prototype Demonstration Toolbar */}
          <PrototypeToolbar onOpenTour={() => setTourOpen(true)} />

          {/* Main Authenticated Header */}
          <Header
            currentUser={currentUser}
            onSignOut={handleSignOut}
            onNavigate={handleNavigateView}
            unreadNotificationsCount={unreadCount}
            onToggleNotifications={() => setNotificationsOpen(!notificationsOpen)}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />

          {/* Persistent app shell: left nav sidebar + content + right command-center sidebar */}
          <AppShell
            currentUser={currentUser}
            activeView={activeView}
            onNavigate={handleNavigateView}
            onSignOut={handleSignOut}
            unreadNotificationsCount={unreadCount}
            notifications={visibleNotifications}
            auditLogs={auditLogs}
            activeCase={activeCase}
            officerVerified={officerVerified}
            waitingVisitor={visitors[0]}
            onOpenVerifyOfficer={() => setShowOfficerModal(true)}
            onOpenIntakeModal={openIntake}
            onOpenCaseFile={() => setActiveView('case-file')}
            onOpenNotifications={() => setNotificationsOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
            mobileNavOpen={mobileNavOpen}
            onCloseMobileNav={() => setMobileNavOpen(false)}
          >
            {activeView === 'dashboard' && (
              currentUser.role === 'RECEPTIONIST' ? (
                <VisitorDeskView
                  visitors={visitors}
                  onRegisterVisitor={handleRegisterVisitor}
                  onSendLabNotification={handleSendLabNotification}
                  onProceedToLab={(v) => {
                    handleNavigateView('lab-bay');
                    showToast(`Opened Lab Bay monitoring for ${v.officerName}.`);
                  }}
                  onCheckOutVisitor={handleCheckOutVisitor}
                  currentUserName={currentUser.name}
                  onNavigate={handleNavigateView}
                />
              ) : (
                <RoleDashboard
                  currentUser={currentUser}
                  activeCase={activeCase}
                  visitors={visitors}
                  officerVerified={officerVerified}
                  onNavigate={handleNavigateView}
                  onOpenVerifyOfficer={() => setShowOfficerModal(true)}
                  onOpenIntakeModal={openIntake}
                  onOpenCaseFile={(id) => setActiveView('case-file')}
                  onOpenGCMS={() => setActiveView('case-file')}
                />
              )
            )}

            {activeView === 'reception' && (
              <VisitorDeskView
                visitors={visitors}
                onRegisterVisitor={handleRegisterVisitor}
                onSendLabNotification={handleSendLabNotification}
                onProceedToLab={(v) => {
                  handleNavigateView('lab-bay');
                  showToast(`Opened Lab Bay monitoring for ${v.officerName}.`);
                }}
                onCheckOutVisitor={handleCheckOutVisitor}
                currentUserName={currentUser.name}
                onNavigate={handleNavigateView}
              />
            )}

            {activeView === 'register-visitor' && (
              <VisitorRegistrationPage
                currentUserName={currentUser.name}
                onRegister={(v) => {
                  handleRegisterVisitor(v);
                  setActiveView('dashboard');
                }}
                onCancel={() => setActiveView('dashboard')}
              />
            )}

            {activeView === 'lab-bay' && (
              <LabBayView
                visitors={visitors}
                onNotifyLab={(visitor) => handleSendLabNotification(visitor)}
                onProceedToLab={function () {
                  showToast('Laboratory Workspace is restricted to Analyst and Head of Department roles, and Food & Drugs staff.');
                }}
                onCheckOut={(visitorId) => handleCheckOutVisitor(visitorId)}
                currentUserName={currentUser.name}
              />
            )}

            {activeView === 'check-out' && (
              <CheckOutView
                visitors={visitors}
                onCheckOut={(visitorId) => handleCheckOutVisitor(visitorId)}
                onProceedToLab={function () {
                  showToast('Laboratory Workspace is restricted to Analyst and Head of Department roles, and Food & Drugs staff.');
                }}
              />
            )}

            {activeView === 'notifications' && (
              <NotificationsView
                notifications={visibleNotifications}
                onMarkAllAsRead={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  showToast('All notifications marked as read.');
                }}
                onSelect={(n) => {
                  // Routing disabled for now: selecting a notification only
                  // marks it read, it no longer jumps to the reception desk.
                  setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                }}
                unreadCount={unreadCount}
              />
            )}

            {activeView === 'laboratory' && !canAccessLaboratoryWorkspace(currentUser) && (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
                <FlaskConical className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
                <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Laboratory Workspace access restricted</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  This workspace is available only to Analyst and Head of Department roles.
                </p>
              </div>
            )}

            {activeView === 'laboratory' && canAccessLaboratoryWorkspace(currentUser) && (
              <LaboratoryWorkspace
                currentDepartment={currentUser.department || 'Narcotics'}
                activeCase={activeCase}
                visitor={intakeVisitor}
                onOpenCaseFile={(id) => setActiveView('case-file')}
                onVerifyOfficer={handleVerifyOfficer}
                officerVerified={officerVerified}
                onRegisterSubmission={handleRegisterSubmission}
                currentUserName={currentUser.name}
                currentUserRole={currentUser.role}
                foodDrugOfficers={foodDrugOfficers}
                onAssignFoodDrugIntake={handleAssignFoodDrugIntake}
                onReportFoodDrugIntake={handleReportFoodDrugIntake}
                waterOfficers={waterOfficers}
                onAssignWaterIntake={handleAssignWaterIntake}
                onCompleteWaterIntake={handleCompleteWaterIntake}
                onOpenIntake={openIntake}
              />
            )}

            {activeView === 'food-drug-intake' && isFoodDrugUser && (
              <FoodDrugIntakePage
                activeCase={activeCase}
                visitor={intakeVisitor}
                receivingAnalystName={currentUser.name}
                staffNames={[currentUser.name, ...foodDrugOfficers.map((o) => o.name).filter((n) => n !== currentUser.name)]}
                onSaveIntake={(data) => {
                  handleRegisterSubmission(data);
                  handleNavigateView('laboratory');
                }}
                onCancel={() => handleNavigateView('laboratory')}
              />
            )}

            {activeView === 'water-intake' && isWaterUser && (
              <WaterIntakePage
                activeCase={activeCase}
                visitor={intakeVisitor}
                receivingOfficerName={currentUser.name}
                staffNames={[currentUser.name, ...waterStaff.map((o) => o.name).filter((n) => n !== currentUser.name)]}
                onSaveIntake={(data) => {
                  handleRegisterSubmission(data);
                  handleNavigateView('laboratory');
                }}
                onCancel={() => handleNavigateView('laboratory')}
              />
            )}

            {activeView === 'case-file' && (
              <DigitalCaseFile
                caseData={activeCase}
                onUpdateDraftReport={handleUpdateDraftReport}
              />
            )}

            {activeView === 'references' && <ReferenceDatabaseView />}

            {activeView === 'executive' && (
              <ExecutiveDashboard
                activeCase={activeCase}
                onSelectCase={(id) => setActiveView('case-file')}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView
                currentUser={currentUser}
                onCompactSidebarChange={(compact) => setSidebarCollapsed(compact)}
                onSignOut={handleSignOut}
              />
            )}

            {activeView === 'audit' && (
              <AuditTrailView
                auditLogs={auditLogs}
                currentUserRole={currentUser.role}
              />
            )}
          </AppShell>

          {/* Global Officer Verification Modal (Triggerable from Dashboard or Workspaces) */}
          <OfficerVerificationModal
            isOpen={showOfficerModal}
            onClose={() => setShowOfficerModal(false)}
            visitor={visitors[0]}
            currentAnalystName={currentUser.name}
            onConfirmVerification={(data) => {
              handleVerifyOfficer();
              setShowOfficerModal(false);
              if (data.proceedToIntake) {
                openIntake();
              }
            }}
          />

          {/* Global Submission & Exhibits Intake Modal (Triggerable from Dashboard or Workspaces) */}
          <SubmissionIntakeModal
            isOpen={showIntakeModal}
            onClose={() => setShowIntakeModal(false)}
            activeCase={activeCase}
            visitor={intakeVisitor}
            receivingAnalystName={currentUser.name}
            onSaveIntake={(data) => {
              handleRegisterSubmission(data);
              setShowIntakeModal(false);
            }}
          />

          {/* Notifications Drawer */}
          <NotificationDrawer
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            notifications={visibleNotifications}
            unreadCount={visibleNotifications.filter((n) => !n.read).length}
            onMarkAllAsRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              showToast('All alerts marked as read.');
            }}
            onSelectNotification={(notif) => {
              // Click-through routing is disabled for now: selecting a
              // notification only marks it read. It no longer jumps to the
              // originating screen, the lab workspace, or an intake page.
              setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
              );
              setNotificationsOpen(false);
            }}
            onToggleRead={(id) =>
              setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)))
            }
            onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
          />
        </div>
      )}

      {/* Global Quick Search Modal (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigateView}
        activeCase={activeCase}
        currentUser={currentUser}
      />

      {/* Interactive Prototype Guided Tour Modal */}
      <PrototypeTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onNavigate={handleNavigateView}
      />
    </div>
  );
}
