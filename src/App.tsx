import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ReceptionVisitDraft,
} from './types';
import { FlaskConical } from 'lucide-react';
import {
  DEMO_CASE,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './data/initialData';
import { LandingPage } from './components/landing/LandingPage';
import { FoodDrugIntakePage } from './components/laboratory/FoodDrugIntakePage';
import { WaterIntakePage } from './components/laboratory/WaterIntakePage';
import { Header } from './components/common/Header';
import { AppShell } from './components/layout/AppShell';
import { PrototypeToolbar } from './components/common/PrototypeToolbar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { PrototypeTourModal } from './components/common/PrototypeTourModal';
import { VisitorDeskView } from './components/reception/VisitorDeskView';
import { ReceptionVisitStats } from './components/reception/VisitorDeskViewProps';
import { VisitorRegistrationPage } from './components/reception/VisitorRegistrationPage';
import { LabBayView, CheckOutView, NotificationsView } from './components/reception/ReceptionWorkflowViews';
import { departmentLabel, isInstitutionWide } from './lib/departments';
import { laboratoryLabel } from './data/laboratories';
import { formatKes } from './waterIntake';

import { LaboratoryWorkspace } from './components/laboratory/LaboratoryWorkspace';
import { WaterLaboratoryView } from './components/laboratory/WaterLaboratoryView';
import { ExhibitCaseFile } from './components/laboratory/ExhibitCaseFile';
import { ExhibitCaseFileIndex } from './components/laboratory/ExhibitCaseFileIndex';
import { WaterEditAccess, WaterIntakeEdit, WaterSenderEdit, canEditWaterIntake, waterEditAccess } from './lib/waterIntakeAccess';
import { FoodDrugIntakeEdit } from './components/laboratory/FoodDrugIntakeEditModal';
import { FoodDrugLaboratoryView } from './components/laboratory/FoodDrugLaboratoryView';
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
import { ApiError, apiRequest } from './lib/api';
import { SuperAdminPage } from './components/admin/SuperAdminPage';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';

const LABORATORY_WORKSPACE_ROLES: UserRole[] = ['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT'];
const RECEPTIONIST_VIEWS = new Set(['dashboard', 'register-visitor', 'lab-bay', 'check-out', 'notifications', 'audit', 'settings', 'water-intake-edit']);

// Every member of these departments (interns included) works the laboratory
// workspace, since each of them registers submissions for the section.
const LABORATORY_WORKSPACE_DEPARTMENTS: LaboratoryDepartment[] = ['Food & Drugs', 'Water'];

const canAccessLaboratoryWorkspace = (user?: User | null) =>
  !!user &&
  (LABORATORY_WORKSPACE_ROLES.includes(user.role) ||
    (!!user.department && LABORATORY_WORKSPACE_DEPARTMENTS.includes(user.department)));

const isReceptionist = (role?: UserRole | null) => role === 'RECEPTIONIST';

// Roles the server will assign a Water exhibit to (waterLabRoles on the server,
// minus HEAD_OF_DEPARTMENT, who approves and assigns rather than analyses).
// Keep in step with the `my-exhibits` nav item.
const MY_EXHIBITS_ROLES: UserRole[] = ['ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE'];

const canAccessMyExhibits = (user?: User | null) => !!user && MY_EXHIBITS_ROLES.includes(user.role);

/**
 * An exhibit case file is reachable by the officer the exhibit is assigned to, and by
 * the Water Head and Senior Chemists, who supervise every exhibit. The server enforces this on every event and findings request; the client
 * check just avoids rendering a page the officer could not load. The Water Head
 * and super-admins keep oversight through the department register.
 */
const canOpenExhibitCaseFile = (user?: User | null, intake?: WaterIntake | null) =>
  !!user && !!intake && (
    intake.analysisOfficerId === user.id ||
    (user.department === 'Water' && (user.role === 'HEAD_OF_DEPARTMENT' || user.role === 'SENIOR_CHEMIST'))
  );

export default function App() {
  const { setMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeView, setActiveView] = useState<string>('landing');
  const [activeCase, setActiveCase] = useState<ForensicCase>(DEMO_CASE);
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>([]);
  // The exhibit whose case file is open, when activeView is 'exhibit-case-file'.
  const [activeWaterIntakeId, setActiveWaterIntakeId] = useState<string | null>(null);
  const [waterIntakesLoading, setWaterIntakesLoading] = useState(false);
  const [waterIntakesError, setWaterIntakesError] = useState('');
  const [waterStaff, setWaterStaff] = useState<Pick<User, 'id' | 'name' | 'role'>[]>([]);
  const [visitors, setVisitors] = useState<OfficerVisitor[]>([]);
  const [receptionVisitStats, setReceptionVisitStats] = useState<ReceptionVisitStats | null>(null);
  const [receptionVisitStatsError, setReceptionVisitStatsError] = useState('');
  const [receptionVisitStatsLoading, setReceptionVisitStatsLoading] = useState(false);
  const [selectedIntakeVisitId, setSelectedIntakeVisitId] = useState<string | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsHasMore, setVisitsHasMore] = useState(false);
  const [visitsLoadingMore, setVisitsLoadingMore] = useState(false);
  const receptionVisitsFullyLoaded = useRef(false);
  const [visitsError, setVisitsError] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [receptionActivityNotifications, setReceptionActivityNotifications] = useState<AppNotification[]>([]);
  const [receptionActivityNotificationError, setReceptionActivityNotificationError] = useState('');
  const [adminNotifications, setAdminNotifications] = useState<AppNotification[]>([]);
  const [adminNotificationError, setAdminNotificationError] = useState('');
  const [superAdminTab, setSuperAdminTab] = useState<'requests' | 'department-requests' | 'users' | 'audit'>('users');
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOGS);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global modals for Verification and Intake
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  // Which visitor the intake modals are bound to. Prefers the most recent
  // visitor routed to the signed-in officer's own laboratory, so a Food &
  // Drugs officer always opens intake on a Food & Drugs submission.
  const intakeVisitor = useMemo(
    () =>
      selectedIntakeVisitId
        ? visitors.find((v) =>
            v.id === selectedIntakeVisitId &&
            v.status !== 'Departed' &&
            (!currentUser?.department || v.laboratory === currentUser.department)
          )
        :
      visitors.find((v) =>
        v.status !== 'Departed' &&
        (!currentUser?.department || v.laboratory === currentUser.department)
      ),
    [visitors, selectedIntakeVisitId, currentUser?.department]
  );
  // The client the Water intake form is bound to. Only a client chosen on purpose (Open intake
  // from Reception & Client Handover) is used; opening the form from the sidebar leaves the
  // client details as dashes instead of silently picking up whoever arrived last.
  const chosenWaterVisitor = useMemo(
    () =>
      selectedIntakeVisitId
        ? visitors.find((v) => v.id === selectedIntakeVisitId && v.status !== 'Departed' && v.laboratory === 'Water')
        : undefined,
    [visitors, selectedIntakeVisitId],
  );
  const officerVerified = !!intakeVisitor &&
    intakeVisitor.status !== 'Awaiting Laboratory Reception' &&
    intakeVisitor.status !== 'Departed';

  // Officers the Food & Drugs Head of Section can assign samples to: every
  // active staff account in that department, loaded from the API.
  const [foodDrugStaff, setFoodDrugStaff] = useState<Pick<User, 'id' | 'name' | 'role'>[]>([]);
  const foodDrugOfficers = useMemo(
    () => foodDrugStaff.filter((u) => u.role !== 'HEAD_OF_DEPARTMENT'),
    [foodDrugStaff],
  );
  useEffect(() => {
    if (currentUser?.department !== 'Food & Drugs') {
      setFoodDrugStaff([]);
      return;
    }
    let cancelled = false;
    apiRequest<{ officers: Pick<User, 'id' | 'name' | 'role'>[] }>('/api/department/officers')
      .then((result) => { if (!cancelled) setFoodDrugStaff(result.officers); })
      .catch(() => { if (!cancelled) setFoodDrugStaff([]); });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.department]);

  const waterOfficers = useMemo(() => waterStaff.filter((u) => u.role !== 'HEAD_OF_DEPARTMENT'), [waterStaff]);

  // The exhibit whose case file is open. Read from the list so the case file sees
  // status and findings changes without a second fetch.
  const activeWaterIntake = useMemo(
    () => waterIntakes.find((intake) => intake.id === activeWaterIntakeId) ?? null,
    [waterIntakes, activeWaterIntakeId],
  );

  /** Merges a freshly saved intake back into the list, so every view stays in step. */
  const handleWaterIntakeUpdated = useCallback((intake: WaterIntake) => {
    setWaterIntakes((previous) => [intake, ...previous.filter((item) => item.id !== intake.id)]);
  }, []);
  // Sidebar badge for My Exhibits: this officer's queue still to finish.
  const myExhibitsCount = useMemo(
    () => (currentUser
      ? waterIntakes.filter((i) => i.analysisOfficerId === currentUser.id && i.status === 'Under Analysis').length
      : 0),
    [waterIntakes, currentUser?.id],
  );

  // Departmental alerts: staff attached to a laboratory only see notifications
  // addressed to their own department (or their role), never another
  // department's intake. Institution-wide staff — reception, administration,
  // executive, quality management, and super-admins — continue to see
  // everything, which is why General Administration must not be treated as a
  // filterable unit here.
  const visibleNotifications = useMemo(() => {
    if (currentUser?.role === 'SUPER_ADMIN') return adminNotifications;
    if (currentUser?.role === 'RECEPTIONIST') return receptionActivityNotifications;
    if (isInstitutionWide(currentUser)) return notifications;
    // isInstitutionWide is false here only for a signed-in, lab-attached user,
    // so currentUser is guaranteed non-null below.
    const { department, role } = currentUser!;
    return notifications.filter(
      (n) =>
        (n.recipientDepartment && n.recipientDepartment === department) ||
        (n.recipientRole && n.recipientRole === role)
    ).concat(
      receptionActivityNotifications.filter((notification) =>
        (notification.recipientDepartment && notification.recipientDepartment === department) ||
        (notification.recipientRole && notification.recipientRole === role)
      )
    );
  }, [notifications, adminNotifications, receptionActivityNotifications, currentUser]);

  // Prototype Modal States
  const [searchOpen, setSearchOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ user: User }>('/api/auth/me')
      .then(({ user }) => {
        if (!cancelled) {
          setCurrentUser(user);
          setActiveView('dashboard');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && !(error instanceof ApiError && error.status === 401)) {
          showToast(error instanceof Error ? error.message : 'Unable to verify your sign-in session.');
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'SUPER_ADMIN') return;
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
    } else if (activeView === 'lab-bay' && currentUser.department === 'Water' && currentUser.role !== 'SUPER_ADMIN') {
      // Water handles its clients from the Exhibit Laboratory page.
      setActiveView('laboratory');
    } else if (activeView === 'laboratory' && !canAccessLaboratoryWorkspace(currentUser)) {
      setActiveView('dashboard');
    } else if (activeView === 'exhibit-case-file' && !canOpenExhibitCaseFile(currentUser, activeWaterIntake)) {
      // e.g. the exhibit was transferred to another officer while it was open.
      setActiveWaterIntakeId(null);
      setActiveView('laboratory');
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

  const loadAdminNotifications = useCallback(async () => {
    if (currentUser?.role !== 'SUPER_ADMIN') return;
    try {
      const { notifications: rows } = await apiRequest<{
        notifications: Array<Omit<AppNotification, 'timestamp' | 'persisted' | 'relatedRecordType' | 'relatedRecordId'> & {
          createdAt: string;
          recordType?: string;
          recordId?: string;
        }>;
      }>('/api/admin/notifications');
      setAdminNotifications(rows.map(({ createdAt, recordType, recordId, ...notification }) => ({
        ...notification,
        timestamp: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdAt)),
        relatedRecordType: recordType,
        relatedRecordId: recordId,
        persisted: true,
      })));
      setAdminNotificationError('');
    } catch (cause) {
      setAdminNotificationError(cause instanceof Error ? cause.message : 'Unable to load super-admin notifications.');
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      setAdminNotifications([]);
      setAdminNotificationError('');
      return;
    }
    void loadAdminNotifications();
    const intervalId = window.setInterval(() => void loadAdminNotifications(), 15_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.role, loadAdminNotifications]);

  const loadReceptionActivityNotifications = useCallback(async () => {
    if (!currentUser || currentUser.role === 'SUPER_ADMIN') return;
    try {
      const { notifications: rows } = await apiRequest<{
        notifications: Array<Omit<AppNotification, 'timestamp' | 'persisted'> & { createdAt: string }>;
      }>('/api/notifications');
      setReceptionActivityNotifications(rows.map(({ createdAt, ...notification }) => ({
        ...notification,
        timestamp: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdAt)),
        persisted: true,
      })));
      setReceptionActivityNotificationError('');
    } catch (cause) {
      setReceptionActivityNotificationError(cause instanceof Error ? cause.message : 'Unable to load live reception activity.');
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'SUPER_ADMIN') {
      setReceptionActivityNotifications([]);
      setReceptionActivityNotificationError('');
      return;
    }
    void loadReceptionActivityNotifications();
    const intervalId = window.setInterval(() => void loadReceptionActivityNotifications(), 10_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.role, loadReceptionActivityNotifications]);

  const loadWaterIntakes = useCallback(async (showError = false) => {
    if (!currentUser ||
        (currentUser.role !== 'SUPER_ADMIN' && currentUser.department !== 'Water')) {
      setWaterIntakes([]);
      setWaterStaff([]);
      return;
    }
    try {
      const result = await apiRequest<{
        intakes: WaterIntake[];
        officers: Pick<User, 'id' | 'name' | 'role'>[];
      }>('/api/water/intakes');
      setWaterIntakes(result.intakes);
      setWaterStaff(result.officers);
      setWaterIntakesError('');
    } catch (error) {
      setWaterIntakesError(error instanceof Error ? error.message : 'Unable to load Water Lab exhibits.');
      if (showError) showToast(error instanceof Error ? error.message : 'Unable to load Water Lab exhibits.');
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.department]);

  useEffect(() => {
    if (!currentUser ||
        (currentUser.role !== 'SUPER_ADMIN' && currentUser.department !== 'Water')) {
      setWaterIntakes([]);
      setWaterStaff([]);
      setWaterIntakesError('');
      setWaterIntakesLoading(false);
      return;
    }
    setWaterIntakesLoading(true);
    void loadWaterIntakes(true).finally(() => setWaterIntakesLoading(false));
    const intervalId = window.setInterval(() => {
      void loadWaterIntakes();
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.role, currentUser?.department, loadWaterIntakes]);

  const loadReceptionVisits = useCallback(async (showLoading = true) => {
    if (!currentUser) {
      setVisitors([]);
      setVisitsLoading(false);
      receptionVisitsFullyLoaded.current = false;
      setVisitsHasMore(false);
      return;
    }
    if (showLoading) {
      setVisitsLoading(true);
      setVisitsError('');
    }
    try {
      const result = await apiRequest<{ visits: OfficerVisitor[]; hasMore: boolean }>('/api/reception/visits?limit=100&date=all');
      setVisitors((previous) => {
        const pageIds = new Set(result.visits.map((visit) => visit.id));
        return [...result.visits, ...previous.filter((visit) => !pageIds.has(visit.id))];
      });
      setVisitsHasMore(result.hasMore && !receptionVisitsFullyLoaded.current);
      setVisitsError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load reception visits.';
      setVisitsError(message);
      if (showLoading) showToast(message);
    } finally {
      if (showLoading) setVisitsLoading(false);
    }
  }, [currentUser?.id]);

  const loadOlderReceptionVisits = async () => {
    const lastVisit = visitors[visitors.length - 1];
    if (!lastVisit || visitsLoadingMore || !visitsHasMore) return;
    setVisitsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        date: 'all',
        before: lastVisit.arrivedAt,
        beforeId: lastVisit.id,
      });
      const result = await apiRequest<{ visits: OfficerVisitor[]; hasMore: boolean }>(`/api/reception/visits?${params}`);
      setVisitors((previous) => {
        const existingIds = new Set(previous.map((visit) => visit.id));
        return [...previous, ...result.visits.filter((visit) => !existingIds.has(visit.id))];
      });
      setVisitsHasMore(result.hasMore);
      receptionVisitsFullyLoaded.current = !result.hasMore;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load older visitor records.');
    } finally {
      setVisitsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setVisitors([]);
      setVisitsLoading(false);
      receptionVisitsFullyLoaded.current = false;
      return;
    }
    void loadReceptionVisits();
    const intervalId = window.setInterval(() => {
      void loadReceptionVisits(false);
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id, loadReceptionVisits]);

  const loadReceptionVisitStats = useCallback(async () => {
    if (currentUser?.role !== 'RECEPTIONIST') {
      setReceptionVisitStats(null);
      setReceptionVisitStatsError('');
      setReceptionVisitStatsLoading(false);
      return;
    }
    setReceptionVisitStatsLoading(true);
    try {
      const result = await apiRequest<{ stats: ReceptionVisitStats }>('/api/reception/visits/stats');
      setReceptionVisitStats(result.stats);
      setReceptionVisitStatsError('');
    } catch (error) {
      setReceptionVisitStatsError(error instanceof Error ? error.message : 'Unable to load visitor totals.');
    } finally {
      setReceptionVisitStatsLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'RECEPTIONIST') {
      setReceptionVisitStats(null);
      setReceptionVisitStatsError('');
      return;
    }
    void loadReceptionVisitStats();
    const intervalId = window.setInterval(() => void loadReceptionVisitStats(), 15_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.role, loadReceptionVisitStats]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveView('dashboard');

    // Add audit log
    const newLog: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: user.name,
      role: user.role,
      action: 'USER_LOGIN',
      recordType: 'Session',
      recordId: `SES-${Date.now().toString().slice(-4)}`,
      details: `User successfully authenticated into GC-ILCMS with role ${user.role}.`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(user.role === 'SUPER_ADMIN'
      ? `Welcome ${user.name} — Opened Super-admin Console`
      : `Welcome ${user.name} (${user.role}) — Opened Operational Dashboard`);
  };

  const handleSignOut = async () => {
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setActiveView('landing');
      showToast('Signed out.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setCurrentUser(null);
        setActiveView('landing');
        showToast('Your session had already expired.');
        return;
      }
      showToast(error instanceof Error ? error.message : 'Could not end the server session.');
    }
  };

  const handleNavigateView = (view: string) => {
    if (view === 'landing') {
      void handleSignOut();
      return;
    }

    if (!currentUser) {
      showToast('Sign in to access the system.');
      return;
    }

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    // Admin sidebar entries ('super-admin:users', ...) open a console section.
    if (view.startsWith('super-admin:')) {
      if (!isSuperAdmin) {
        showToast('Super-admin access is restricted.');
        return;
      }
      setSuperAdminTab(view.slice('super-admin:'.length) as typeof superAdminTab);
      setActiveView('super-admin');
      return;
    }
    if (view === 'super-admin' && !isSuperAdmin) {
      showToast('Super-admin access is restricted.');
      return;
    }
    if (isReceptionist(currentUser?.role) && !RECEPTIONIST_VIEWS.has(view)) {
      showToast('Reception access is limited to registration, Reception & Client Handover monitoring, and check-out.');
      return;
    }

    if (!isSuperAdmin && view === 'food-drug-intake' && currentUser.department !== 'Food & Drugs') {
      showToast('Food & Drugs sample registration is restricted to Food & Drugs staff.');
      return;
    }

    if (!isSuperAdmin && view === 'water-intake' && currentUser.department !== 'Water') {
      showToast('Water & Environment exhibit intake is restricted to Water & Environment staff.');
      return;
    }

    if (!isSuperAdmin && view === 'laboratory' && !canAccessLaboratoryWorkspace(currentUser)) {
      showToast('Laboratory Workspace is restricted to Analyst and Head of Department roles, and Food & Drugs staff.');
      return;
    }

    // The case file is a drill-down from My Exhibits, not a sidebar destination,
    // so it is only reachable through an exhibit the officer actually owns.
    if (view === 'exhibit-case-file' && !canOpenExhibitCaseFile(currentUser, activeWaterIntake)) {
      showToast('Open an exhibit assigned to you from the Exhibit Laboratory to see its case file.');
      return;
    }

    // Going to the intake form from the menu starts blank; Open intake sets the client itself.
    if (view === 'water-intake') setSelectedIntakeVisitId(null);

    // Opening Case File from the sidebar starts at the list, not the last exhibit.
    if (view === 'case-file' && isSuperAdmin) setActiveWaterIntakeId(null);

    setActiveView(view);
  };

  const markNotificationRead = async (id: string, read: boolean) => {
    const notification = visibleNotifications.find((item) => item.id === id);
    if (notification?.persisted) {
      try {
        const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
        await apiRequest(`${isSuperAdmin ? '/api/admin/notifications' : '/api/notifications'}/${id}/read`, {
          method: 'PATCH',
          body: JSON.stringify({ read }),
        });
        if (isSuperAdmin) await loadAdminNotifications();
        else await loadReceptionActivityNotifications();
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not update notification.');
      }
      return;
    }
    setNotifications((previous) => previous.map((item) => item.id === id ? { ...item, read } : item));
  };

  const markAllNotificationsRead = async () => {
    if (currentUser) {
      try {
        const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
        await apiRequest(`${isSuperAdmin ? '/api/admin/notifications' : '/api/notifications'}/read-all`, { method: 'PATCH', body: '{}' });
        if (isSuperAdmin) await loadAdminNotifications();
        else await loadReceptionActivityNotifications();
        showToast(isSuperAdmin ? 'All administration notifications marked as read.' : 'All notifications marked as read.');
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not mark notifications as read.');
      }
      return;
    }
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
    showToast('All notifications marked as read.');
  };

  const dismissNotification = async (id: string) => {
    const notification = visibleNotifications.find((item) => item.id === id);
    if (notification?.persisted) {
      try {
        const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
        await apiRequest(`${isSuperAdmin ? '/api/admin/notifications' : '/api/notifications'}/${id}`, { method: 'DELETE' });
        if (isSuperAdmin) await loadAdminNotifications();
        else await loadReceptionActivityNotifications();
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not dismiss notification.');
      }
      return;
    }
    setNotifications((previous) => previous.filter((item) => item.id !== id));
  };

  const performAdminNotificationAction = async (
    notification: AppNotification,
    action: 'approve' | 'reject' | 'reset-password',
  ) => {
    if (action === 'reset-password' && notification.relatedRecordType === 'user' && notification.relatedRecordId) {
      try {
        const result = await apiRequest<{ message: string; emailSent?: boolean }>(
          `/api/admin/users/${notification.relatedRecordId}/reset-password`,
          { method: 'POST', body: '{}' },
        );
        showToast(result.message);
        if (result.emailSent !== false) {
          try {
            await apiRequest(`/api/admin/notifications/${notification.id}`, { method: 'DELETE' });
          } catch {
            showToast('The reset link was sent, but its notification could not be dismissed.');
          }
        }
        await loadAdminNotifications();
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not send a password reset link.');
      }
      return;
    }
    if (action !== 'reset-password' && notification.relatedRecordType === 'account_request' && notification.relatedRecordId) {
      try {
        const result = await apiRequest<{ message: string; emailSent?: boolean }>(
          `/api/admin/requests/${notification.relatedRecordId}/${action}`,
          { method: 'POST', body: '{}' },
        );
        showToast(result.message);
        try {
          await apiRequest(`/api/admin/notifications/${notification.id}`, { method: 'DELETE' });
        } catch {
          showToast('The request was processed, but its notification could not be dismissed.');
        }
        await loadAdminNotifications();
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not process the account request.');
      }
      return;
    }
    if (action !== 'reset-password' && notification.relatedRecordType === 'department_change_request' && notification.relatedRecordId) {
      try {
        const result = await apiRequest<{ message: string }>(
          `/api/admin/department-change-requests/${notification.relatedRecordId}/${action}`,
          { method: 'POST', body: '{}' },
        );
        showToast(result.message);
        try {
          await apiRequest(`/api/admin/notifications/${notification.id}`, { method: 'DELETE' });
        } catch {
          showToast('The request was processed, but its notification could not be dismissed.');
        }
        await loadAdminNotifications();
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not process the department request.');
      }
    }
  };

  const selectNotification = async (notification: AppNotification) => {
    if (notification.persisted) {
      await markNotificationRead(notification.id, true);
      setNotificationsOpen(false);
      if (notification.linkAction === 'RECEPTION_LAB_BAY' && notification.relatedVisitorId) {
        try {
          const { visit } = await apiRequest<{ visit: OfficerVisitor }>(
            `/api/reception/visits/${notification.relatedVisitorId}`,
          );
          setVisitors((previous) => [visit, ...previous.filter((current) => current.id !== visit.id)]);
          setSelectedIntakeVisitId(visit.id);
          setActiveView(
            currentUser?.department === 'Water' &&
              visit.laboratory === 'Water' &&
              !!visit.labNotificationSentAt &&
              visit.status !== 'Departed'
              ? 'water-intake'
              : 'lab-bay',
          );
        } catch (cause) {
          showToast(cause instanceof Error ? cause.message : 'Could not load the visitor record.');
        }
        return;
      }
      if (notification.linkAction === 'RECEPTION_REGISTER' && notification.relatedVisitorId) {
        try {
          const { visit } = await apiRequest<{ visit: OfficerVisitor }>(
            `/api/reception/visits/${notification.relatedVisitorId}`,
          );
          setVisitors((previous) => [visit, ...previous.filter((current) => current.id !== visit.id)]);
          setSelectedIntakeVisitId(visit.id);
        } catch (cause) {
          showToast(cause instanceof Error ? cause.message : 'Could not load the visitor record.');
        }
        setActiveView(currentUser?.role === 'RECEPTIONIST' ? 'dashboard' : 'reception');
        return;
      }
      if (currentUser?.role === 'SUPER_ADMIN') {
        const nextTab = notification.linkAction === 'ADMIN_DEPARTMENT_REQUESTS'
          ? 'department-requests'
          : notification.linkAction === 'ADMIN_USERS'
            ? 'users'
            : 'requests';
        setSuperAdminTab(nextTab);
        setActiveView('super-admin');
      } else if (notification.linkAction === 'RECEPTION_LAB_BAY') {
        setActiveView('lab-bay');
      } else if (notification.linkAction === 'RECEPTION_REGISTER') {
        setActiveView('reception');
      }
      return;
    }
    setNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    setNotificationsOpen(false);
  };

  const handleSendLabNotification = async (visitor: OfficerVisitor, resend = false) => {
    try {
      const result = await apiRequest<{ message: string; notifiedAt: string }>(
        `/api/reception/visits/${visitor.id}/notify-lab`,
        { method: 'POST', body: JSON.stringify({ resend }) },
      );
      setVisitors((previous) => previous.map((visit) =>
        visit.id === visitor.id ? { ...visit, labNotificationSentAt: result.notifiedAt } : visit
      ));
      await loadReceptionActivityNotifications();
      showToast(result.message);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404 && cause.message === 'API route not found.') {
        showToast('The server is running an older version. Restart it with npm run dev, then try again.');
      } else {
        showToast(cause instanceof Error ? cause.message : `Could not notify ${visitor.laboratory}.`);
      }
    }
  };

  // Receptionist only (the server refuses everyone else).
  const handleDeleteVisitor = async (visitor: OfficerVisitor) => {
    try {
      const result = await apiRequest<{ message: string }>(`/api/reception/visits/${visitor.id}`, { method: 'DELETE' });
      setVisitors((previous) => previous.filter((visit) => visit.id !== visitor.id));
      void loadReceptionVisitStats();
      showToast(result.message);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'The visitor record could not be deleted.');
    }
  };

  const handleRegisterVisitor = async (draft: ReceptionVisitDraft): Promise<boolean> => {
    try {
      const { visit } = await apiRequest<{ visit: OfficerVisitor }>('/api/reception/visits', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      setVisitors((prev) => [visit, ...prev.filter((current) => current.id !== visit.id)]);
      void loadReceptionVisitStats();
      await loadReceptionActivityNotifications();
      showToast(`Visitor ${visit.visitNumber} registered. Press "Notify ${laboratoryLabel(visit.laboratory)}" to send the client to the laboratory.`);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not register visitor.');
      return false;
    }
  };

  const transitionReceptionVisit = async (id: string, action: 'lab-received' | 'service-completed' | 'check-out') => {
    try {
      const result = await apiRequest<{ visit: OfficerVisitor }>(`/api/reception/visits/${id}/${action}`, { method: 'POST', body: '{}' });
      setVisitors((previous) => previous.map((visit) => visit.id === result.visit.id ? result.visit : visit));
      await loadReceptionVisits(false);
      void loadReceptionVisitStats();
      showToast(action === 'lab-received'
        ? 'Laboratory receipt recorded.'
        : action === 'service-completed'
          ? 'Laboratory service marked complete.'
          : 'Visitor departure recorded.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update visitor status.');
    }
  };

  const handleCheckOutVisitor = (id: string) => transitionReceptionVisit(id, 'check-out');
  const handleVerifyOfficer = (visitorId?: string) => {
    if (!visitorId) return Promise.resolve();
    return transitionReceptionVisit(visitorId, 'lab-received');
  };
  const handleRevealNationalId = async (id: string): Promise<string | null> => {
    try {
      const result = await apiRequest<{ nationalId: string }>(`/api/reception/visits/${id}/national-id`);
      return result.nationalId;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not reveal National ID.');
      return null;
    }
  };
  const openOfficerVerification = () => {
    if (!intakeVisitor) {
      showToast('No current visitor is waiting for laboratory receipt.');
      return;
    }
    setShowOfficerModal(true);
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
        toEntity: `${submissionData.receivedBy} (${departmentLabel(submissionData.department)} Lab)`,
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
      user: currentUser ? currentUser.name : 'Analyst',
      role: currentUser ? currentUser.role : 'ANALYST',
      action: 'EXHIBITS_REGISTERED',
      recordType: 'Exhibit',
      recordId: submissionData.exhibits[0]?.id || 'EXH-BATCH',
      details: `Registered ${submissionData.exhibits.length} exhibit item(s) from ${submissionData.receivedFrom} into ${departmentLabel(submissionData.department)} Lab vault.`,
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

  const handleRegisterWaterIntake = async (
    submissionData: Parameters<typeof handleRegisterSubmission>[0],
  ): Promise<WaterIntake> => {
    const draft = submissionData.waterIntake;
    if (!draft) throw new Error('Water exhibit details are missing.');
    const result = await apiRequest<{ intake: WaterIntake }>('/api/water/intakes', {
      method: 'POST',
      body: JSON.stringify({
        receptionVisitId: draft.receptionVisitId,
        senderType: draft.senderType,
        senderName: draft.senderName,
        senderAddress: draft.senderAddress,
        senderMobile: draft.senderMobile,
        contactPerson: draft.contactPerson,
        contactPersonMobile: draft.contactPersonMobile,
        receivingOfficerId: draft.receivingOfficerId,
        dateReceived: draft.dateReceived,
        dateSampled: draft.dateSampled,
        testType: draft.testType,
        specificParameters: draft.specificParameters ?? [],
        sourceCategory: draft.sourceCategory,
        sourceType: draft.sourceType,
        locationFrom: draft.locationFrom,
        dischargeTo: draft.dischargeTo,
        receiptNumber: draft.receiptNumber,
        documentsConfirmed: !!draft.documentsConfirmedAt,
        supportingDocuments: submissionData.supportingDocuments,
        remarks: submissionData.remarks,
      }),
    });
    const savedIntake = { ...result.intake, caseId: draft.caseId };
    const persistedExhibit = {
      ...submissionData.exhibits[0],
      id: savedIntake.exhibitId,
      sealNumber: savedIntake.sealNumber ?? submissionData.exhibits[0].sealNumber,
      packaging: savedIntake.packaging ?? submissionData.exhibits[0].packaging,
      condition: savedIntake.condition ?? submissionData.exhibits[0].condition,
      storageLocation: savedIntake.storageLocation ?? submissionData.exhibits[0].storageLocation,
      markings: `Marked "${savedIntake.labReference}" on receipt`,
      remarks: `${savedIntake.testType}. Charges ${formatKes(savedIntake.charges)}. Awaiting Analysis Officer assignment.`,
    };
    handleRegisterSubmission({
      ...submissionData,
      exhibits: [persistedExhibit],
      waterIntake: savedIntake,
    });
    setWaterIntakes((previous) => [savedIntake, ...previous.filter((intake) => intake.id !== savedIntake.id)]);
    return savedIntake;
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
        user: currentUser.name,
        role: currentUser.role,
        action,
        recordType: 'Exhibit',
        recordId: intakeId,
        details,
      },
      ...prev,
    ]);
  };

  // Stage 1b: the Head of the Food & Drugs section signs off the submitted
  // documents before an officer can be assigned.
  const handleApproveFoodDrugIntake = (intakeId: string) => {
    const intake = activeCase.foodDrugIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake || intake.status !== 'Awaiting Approval') return;
    if (currentUser.role !== 'HEAD_OF_DEPARTMENT' || currentUser.department !== 'Food & Drugs') {
      showToast('Only the Head of the Food & Drugs section can approve these documents.');
      return;
    }
    updateFoodDrugIntake(intakeId, {
      status: 'Awaiting Assignment',
      approvedBy: currentUser.name,
      approvedDate: new Date().toISOString().split('T')[0],
    });
    logFoodDrugAudit('FD_DOCUMENTS_APPROVED', intakeId, `Approved the submitted documents for ${intakeId}.`);
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        timestamp: 'Just now',
        title: 'Food & Drugs documents approved',
        message: `${intakeId} (${intake.sampleType}) documents were approved by ${currentUser.name} and the sample is ready for an officer.`,
        recipientDepartment: 'Food & Drugs',
        type: 'success',
        read: false,
        linkAction: 'LAB_WORKSPACE',
      },
      ...prev,
    ]);
    showToast(`${intakeId} documents approved.`);
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

  // Only the Head of Water & Environment assigns the Analysis Officer. The
  // assignment, transfer and completion transitions are enforced by the API.
  const handleAssignWaterIntake = async (intakeId: string, officerId: string) => {
    try {
      const previousAssignee = waterIntakes.find((item) => item.id === intakeId)?.analysisOfficer;
      const { intake } = await apiRequest<{ intake: WaterIntake }>(`/api/water/intakes/${intakeId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ analysisOfficerId: officerId }),
      });
      setWaterIntakes((previous) => [intake, ...previous.filter((item) => item.id !== intake.id)]);
      const transferred = !!previousAssignee;
      setNotifications((previous) => [
        {
          id: `NOTIF-${Date.now()}`,
          timestamp: 'Just now',
          title: transferred ? 'Water & Environment exhibit transferred' : 'Water & Environment exhibit assigned',
          message: transferred
            ? `${intake.labReference} (${intake.testType}) was transferred from ${previousAssignee} to ${intake.analysisOfficer} by ${intake.assignedBy}.`
            : `${intake.labReference} (${intake.testType}) has been assigned to ${intake.analysisOfficer} for analysis by ${intake.assignedBy}.`,
          recipientDepartment: 'Water',
          type: 'info',
          read: false,
          linkAction: 'LAB_WORKSPACE',
        },
        ...previous,
      ]);
      showToast(transferred
        ? `${intake.labReference} transferred from ${previousAssignee} to ${intake.analysisOfficer}.`
        : `${intake.labReference} assigned to ${intake.analysisOfficer}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not assign the Water exhibit.');
    }
  };

  const handleCompleteWaterIntake = async (intakeId: string) => {
    try {
      const { intake } = await apiRequest<{ intake: WaterIntake }>(`/api/water/intakes/${intakeId}/complete`, {
        method: 'POST',
        body: '{}',
      });
      setWaterIntakes((previous) => [intake, ...previous.filter((item) => item.id !== intake.id)]);
      showToast(`${intake.labReference} marked analysis complete.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not complete the Water exhibit.');
    }
  };

  const openWaterCaseFile = (intake: WaterIntake) => {
    setActiveWaterIntakeId(intake.id);
    setActiveView('exhibit-case-file');
  };

  // Editing an exhibit opens the intake form with its details ready to change. Who may change
  // what is decided by waterEditAccess and enforced again by the API.
  const [editingIntake, setEditingIntake] = useState<{ intake: WaterIntake; access: WaterEditAccess; returnTo: string } | null>(null);

  const openWaterIntakeEdit = (intake: WaterIntake, returnTo = 'laboratory') => {
    const access = waterEditAccess(currentUser, intake);
    if (!canEditWaterIntake(access)) {
      showToast('You cannot edit this exhibit at its current stage.');
      return;
    }
    setEditingIntake({ intake, access, returnTo });
    setActiveView('water-intake-edit');
  };

  // Reception works from the visit, so the exhibit registered for it is fetched first.
  const openVisitIntakeEdit = async (visit: OfficerVisitor) => {
    try {
      const { intake } = await apiRequest<{ intake: WaterIntake }>(`/api/water/intakes/by-visit/${visit.id}`);
      openWaterIntakeEdit(intake, 'lab-bay');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not open the exhibit intake.');
    }
  };

  // The intake documents tick: saved at once, and kept in sync in the register and in the open form.
  const setWaterDocumentsConfirmed = async (intakeId: string, confirmed: boolean) => {
    const { intake } = await apiRequest<{ intake: WaterIntake }>(`/api/water/intakes/${intakeId}/documents-check`, {
      method: 'POST',
      body: JSON.stringify({ confirmed }),
    });
    setWaterIntakes((previous) => previous.map((item) => (item.id === intake.id ? intake : item)));
    setEditingIntake((previous) => (previous && previous.intake.id === intake.id ? { ...previous, intake } : previous));
  };

  const closeWaterIntakeEdit = () => {
    const returnTo = editingIntake?.returnTo ?? 'laboratory';
    setEditingIntake(null);
    setActiveView(returnTo);
  };

  const handleSaveWaterIntakeEdit = async (
    intakeId: string,
    intakeEdit: WaterIntakeEdit | null,
    senderEdit: WaterSenderEdit | null,
  ) => {
    let labReference = editingIntake?.intake.labReference ?? '';
    if (senderEdit) {
      const { sender } = await apiRequest<{ sender: Partial<WaterIntake> }>(`/api/water/intakes/${intakeId}/sender`, {
        method: 'PATCH',
        body: JSON.stringify(senderEdit),
      });
      setWaterIntakes((previous) => previous.map((item) => (item.id === intakeId ? { ...item, ...sender } : item)));
    }
    if (intakeEdit) {
      const { intake } = await apiRequest<{ intake: WaterIntake }>(`/api/water/intakes/${intakeId}`, {
        method: 'PATCH',
        body: JSON.stringify(intakeEdit),
      });
      labReference = intake.labReference;
      setWaterIntakes((previous) => previous.map((item) => (item.id === intake.id ? intake : item)));
    }
    showToast(`${labReference} updated.`);
    closeWaterIntakeEdit();
  };

  // Only the Head of Water & Environment deletes an intake (enforced by the API).
  const handleDeleteWaterIntake = async (intakeId: string) => {
    try {
      const result = await apiRequest<{ message: string }>(`/api/water/intakes/${intakeId}`, { method: 'DELETE' });
      setWaterIntakes((previous) => previous.filter((item) => item.id !== intakeId));
      showToast(result.message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete the Water exhibit.');
    }
  };

  const handleEditFoodDrugIntake = (intakeId: string, edit: FoodDrugIntakeEdit) => {
    const intake = activeCase.foodDrugIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake) return;
    if (intake.edited) {
      showToast(`${intakeId} has already been edited once and cannot be edited again.`);
      return;
    }
    if (intake.status !== 'Awaiting Approval' && intake.status !== 'Awaiting Assignment') {
      showToast('An intake cannot be edited once analysis has started.');
      return;
    }
    updateFoodDrugIntake(intakeId, {
      ...edit,
      edited: true,
      editedDate: new Date().toISOString().split('T')[0],
    });
    logFoodDrugAudit('FD_SAMPLE_EDITED', intakeId, `Edited ${intakeId} (one-time edit used).`);
    showToast(`${intakeId} updated. It can't be edited again.`);
  };

  const handleDeleteFoodDrugIntake = (intakeId: string) => {
    const intake = activeCase.foodDrugIntakes?.find((i) => i.id === intakeId);
    if (!currentUser || !intake) return;
    if (currentUser.role !== 'HEAD_OF_DEPARTMENT' || currentUser.department !== 'Food & Drugs') {
      showToast('Only the Head of the Food & Drugs section can delete an intake.');
      return;
    }
    setActiveCase((prev) => ({
      ...prev,
      foodDrugIntakes: prev.foodDrugIntakes?.filter((i) => i.id !== intakeId),
      exhibits: prev.exhibits.filter((exhibit) => exhibit.id !== intake.exhibitId),
    }));
    logFoodDrugAudit('FD_SAMPLE_DELETED', intakeId, `Deleted intake ${intakeId} (${intake.sampleType}, ${intake.clientName}).`);
    showToast(`${intakeId} deleted.`);
  };

  const isFoodDrugUser = currentUser?.role === 'SUPER_ADMIN' || currentUser?.department === 'Food & Drugs';
  const isWaterUser = currentUser?.role === 'SUPER_ADMIN' || currentUser?.department === 'Water';

  // Every intake button funnels through here: Food & Drugs staff go to the
  // registration page, everyone else gets the generic exhibit intake modal.
  const openIntake = () => {
    // Water's intake form can be opened and filled before a client arrives; registering stays locked until reception notifies the lab.
    if (isWaterUser) {
      handleNavigateView('water-intake');
      return;
    }
    if (!intakeVisitor || intakeVisitor.status === 'Departed') {
      showToast('A current visitor record is required before laboratory intake.');
      return;
    }
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
      user: currentUser ? currentUser.name : 'Gazetted Analyst',
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
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 border border-amber-400 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* IF NOT AUTHENTICATED OR ON LANDING VIEW -> RENDER REFINED LANDING PAGE */}
      {checkingSession ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking sign-in session…</div>
      ) : (!currentUser || activeView === 'landing') ? (
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
            waitingVisitor={intakeVisitor}
            onOpenVerifyOfficer={openOfficerVerification}
            onOpenIntakeModal={openIntake}
            onOpenCaseFile={() => setActiveView('case-file')}
            onOpenNotifications={() => setNotificationsOpen(true)}
            myExhibitsCount={myExhibitsCount}
            superAdminTab={superAdminTab}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
            mobileNavOpen={mobileNavOpen}
            onCloseMobileNav={() => setMobileNavOpen(false)}
          >
            {visitsError && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                Reception records could not be refreshed: {visitsError}
              </div>
            )}
            {activeView === 'dashboard' && (
              currentUser.role === 'RECEPTIONIST' ? (
                <VisitorDeskView
                  visitors={visitors}
                  visitStats={receptionVisitStats}
                  visitStatsError={receptionVisitStatsError}
                  visitStatsLoading={receptionVisitStatsLoading}
                  onRegisterVisitor={handleRegisterVisitor}
                  onSendLabNotification={handleSendLabNotification}
                  onRevealNationalId={handleRevealNationalId}
                  onProceedToLab={(v) => {
                    handleNavigateView('lab-bay');
                    showToast(`Opened Reception & Client Handover for ${v.visitNumber}.`);
                  }}
                  onCheckOutVisitor={handleCheckOutVisitor}
                  onDeleteVisitor={handleDeleteVisitor}
                  isLoading={visitsLoading}
                  hasMoreVisitors={visitsHasMore}
                  isLoadingMoreVisitors={visitsLoadingMore}
                  onLoadMoreVisitors={loadOlderReceptionVisits}
                  currentUserName={currentUser.name}
                  onNavigate={handleNavigateView}
                />
              ) : currentUser.role === 'SUPER_ADMIN' ? (
                <SuperAdminDashboard
                  currentUser={currentUser}
                  visitors={visitors}
                  waterIntakes={waterIntakes}
                  onNavigate={handleNavigateView}
                />
              ) : (
                <RoleDashboard
                  currentUser={currentUser}
                  activeCase={activeCase}
                  visitors={visitors}
                  waterIntakes={waterIntakes}
                  waterIntakesLoading={waterIntakesLoading}
                  waterIntakesError={waterIntakesError}
                  officerVerified={officerVerified}
                  onNavigate={handleNavigateView}
                  onOpenVerifyOfficer={openOfficerVerification}
                  onOpenIntakeModal={openIntake}
                  onOpenCaseFile={(id) => setActiveView('case-file')}
                  onOpenGCMS={() => setActiveView('case-file')}
                />
              )
            )}

            {activeView === 'reception' && (
              <VisitorDeskView
                visitors={visitors}
                visitStats={receptionVisitStats}
                visitStatsError={receptionVisitStatsError}
                visitStatsLoading={receptionVisitStatsLoading}
                onRegisterVisitor={handleRegisterVisitor}
                onSendLabNotification={handleSendLabNotification}
                onRevealNationalId={handleRevealNationalId}
                onProceedToLab={(v) => {
                  handleNavigateView('lab-bay');
                  showToast(`Opened Reception & Client Handover for ${v.visitNumber}.`);
                }}
                onCheckOutVisitor={handleCheckOutVisitor}
                onDeleteVisitor={currentUser.role === 'RECEPTIONIST' ? handleDeleteVisitor : undefined}
                isLoading={visitsLoading}
                hasMoreVisitors={visitsHasMore}
                isLoadingMoreVisitors={visitsLoadingMore}
                onLoadMoreVisitors={loadOlderReceptionVisits}
                currentUserName={currentUser.name}
                onNavigate={handleNavigateView}
              />
            )}

            {activeView === 'register-visitor' && (
              <VisitorRegistrationPage
                currentUserName={currentUser.name}
                onRegister={async (draft) => {
                  const saved = await handleRegisterVisitor(draft);
                  if (saved) setActiveView('dashboard');
                  return saved;
                }}
                onCancel={() => setActiveView('dashboard')}
              />
            )}

            {activeView === 'lab-bay' && (
              <LabBayView
                visitors={visitors}
                initialSelectedVisitorId={selectedIntakeVisitId}
                onCheckOut={handleCheckOutVisitor}
                onLabReceive={(visitorId) => transitionReceptionVisit(visitorId, 'lab-received')}
                onServiceComplete={(visitorId) => transitionReceptionVisit(visitorId, 'service-completed')}
                onRevealNationalId={handleRevealNationalId}
                canReceiveVisits={['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT'].includes(currentUser.role)}
                canCompleteVisits={['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT'].includes(currentUser.role)}
                canCheckOutVisits={['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'].includes(currentUser.role)}
                isLoading={visitsLoading}
                hasMoreVisitors={visitsHasMore}
                isLoadingMoreVisitors={visitsLoadingMore}
                onLoadMoreVisitors={loadOlderReceptionVisits}
                currentUserName={currentUser.name}
                onEditClientDetails={
                  currentUser.role === 'RECEPTIONIST'
                    ? (visit) => void openVisitIntakeEdit(visit)
                    : undefined
                }
                onSendLabNotification={
                  currentUser.role === 'RECEPTIONIST' || currentUser.department === 'Food & Drugs' || currentUser.department === 'Water'
                    ? handleSendLabNotification
                    : undefined
                }
              />
            )}

            {activeView === 'exhibit-case-file' && activeWaterIntake && (
              <ExhibitCaseFile
                intake={activeWaterIntake}
                currentUser={currentUser}
                backLabel="Exhibit Laboratory"
                onEditIntake={(intake) => openWaterIntakeEdit(intake, 'exhibit-case-file')}
                onBack={() => setActiveView('laboratory')}
                onComplete={handleCompleteWaterIntake}
                onIntakeUpdated={handleWaterIntakeUpdated}
              />
            )}

            {activeView === 'check-out' && (
              <CheckOutView
                visitors={visitors}
                onCheckOut={handleCheckOutVisitor}
                canCheckOutVisits={['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'].includes(currentUser.role)}
                hasMoreVisitors={visitsHasMore}
                isLoadingMoreVisitors={visitsLoadingMore}
                onLoadMoreVisitors={loadOlderReceptionVisits}
              />
            )}

            {activeView === 'notifications' && (
              <>
                {currentUser.role === 'SUPER_ADMIN' && adminNotificationError && (
                  <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                    Super-admin notifications could not be loaded: {adminNotificationError}
                  </div>
                )}
                {currentUser.role !== 'SUPER_ADMIN' && receptionActivityNotificationError && (
                  <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                    Live visit activity could not be loaded: {receptionActivityNotificationError}
                  </div>
                )}
                <NotificationsView
                  notifications={visibleNotifications}
                  onMarkAllAsRead={() => void markAllNotificationsRead()}
                  onSelect={(notification) => void selectNotification(notification)}
                  onAdminAction={performAdminNotificationAction}
                  unreadCount={unreadCount}
                  description={currentUser.role === 'SUPER_ADMIN'
                    ? 'Account registrations, department requests and account security actions. Select an alert to open its administration workflow.'
                    : currentUser.role === 'RECEPTIONIST'
                      ? 'Live reception activity, including newly registered clients, laboratory routing and checkout updates.'
                    : undefined}
                />
              </>
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

            {activeView === 'laboratory' && canAccessLaboratoryWorkspace(currentUser) && intakeVisitor && currentUser.department !== 'Water' && (
              <LaboratoryWorkspace
                currentDepartment={currentUser.department || 'Narcotics'}
                activeCase={activeCase}
                visitor={intakeVisitor}
                onOpenCaseFile={(id) => setActiveView('case-file')}
                onVerifyOfficer={() => handleVerifyOfficer(intakeVisitor.id)}
                officerVerified={officerVerified}
                onRegisterSubmission={handleRegisterSubmission}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserRole={currentUser.role}
                foodDrugOfficers={foodDrugOfficers}
                onApproveFoodDrugIntake={handleApproveFoodDrugIntake}
                onAssignFoodDrugIntake={handleAssignFoodDrugIntake}
                onReportFoodDrugIntake={handleReportFoodDrugIntake}
                onEditFoodDrugIntake={handleEditFoodDrugIntake}
                onDeleteFoodDrugIntake={handleDeleteFoodDrugIntake}
                waterOfficers={waterOfficers}
                waterIntakes={waterIntakes}
                onAssignWaterIntake={handleAssignWaterIntake}
                onOpenWaterCaseFile={openWaterCaseFile}
                onEditWaterIntake={(intake) => openWaterIntakeEdit(intake)}
                onDeleteWaterIntake={handleDeleteWaterIntake}
                onOpenIntake={openIntake}
              />
            )}
            {activeView === 'laboratory' && canAccessLaboratoryWorkspace(currentUser) && currentUser.department === 'Water' && (
              <WaterLaboratoryView
                intakes={waterIntakes}
                currentUser={currentUser}
                officers={waterOfficers}
                onOpenIntake={openIntake}
                onAssign={handleAssignWaterIntake}
                onOpenCaseFile={openWaterCaseFile}
                onEdit={(intake) => openWaterIntakeEdit(intake)}
                onDelete={handleDeleteWaterIntake}
                clients={visitors.filter((v) => v.laboratory === 'Water' && ((v.status === 'Awaiting Laboratory Reception' && !!v.labNotificationSentAt) || v.status === 'In Laboratory'))}
                canReceiveClients={['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT'].includes(currentUser.role)}
                onAcceptClient={(visitId) => void transitionReceptionVisit(visitId, 'lab-received')}
                onRegisterExhibit={(visit) => {
                  setSelectedIntakeVisitId(visit.id);
                  setActiveView('water-intake');
                }}
              />
            )}
            {activeView === 'laboratory' && canAccessLaboratoryWorkspace(currentUser) && !intakeVisitor && currentUser.department === 'Food & Drugs' && (
              <FoodDrugLaboratoryView
                intakes={activeCase.foodDrugIntakes ?? []}
                currentUser={currentUser}
                officers={foodDrugOfficers}
                onOpenIntake={openIntake}
                onApprove={handleApproveFoodDrugIntake}
                onAssign={handleAssignFoodDrugIntake}
                onReport={handleReportFoodDrugIntake}
                onEdit={handleEditFoodDrugIntake}
                onDelete={handleDeleteFoodDrugIntake}
              />
            )}
            {activeView === 'laboratory' && canAccessLaboratoryWorkspace(currentUser) && !intakeVisitor && currentUser.department !== 'Water' && currentUser.department !== 'Food & Drugs' && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <FlaskConical className="mx-auto h-8 w-8 text-slate-400" />
                <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No active reception visits</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New arrivals routed to your laboratory will appear under Reception &amp; Client Handover.</p>
              </div>
            )}

            {activeView === 'food-drug-intake' && isFoodDrugUser && intakeVisitor && (
              <FoodDrugIntakePage
                key={intakeVisitor.id}
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
            {activeView === 'food-drug-intake' && isFoodDrugUser && !intakeVisitor && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">No active reception visit</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A Food &amp; Drugs arrival must be received at Reception &amp; Client Handover before intake.</p>
              </div>
            )}

            {activeView === 'water-intake' && isWaterUser && (
              // Fillable even before a client is sent; registering stays disabled until reception has notified Water.
              <WaterIntakePage
                activeCase={activeCase}
                visitor={chosenWaterVisitor ?? null}
                currentUserId={currentUser.id}
                staffMembers={waterStaff}
                intakes={waterIntakes}
                onSaveIntake={async (data) => {
                  const intake = await handleRegisterWaterIntake(data);
                  handleNavigateView('laboratory');
                  return intake;
                }}
                onCancel={() => handleNavigateView('laboratory')}
              />
            )}
            {activeView === 'water-intake-edit' && editingIntake && (
              <WaterIntakePage
                activeCase={activeCase}
                visitor={null}
                currentUserId={currentUser.id}
                staffMembers={waterStaff}
                intakes={waterIntakes}
                onSaveIntake={async () => { throw new Error('This exhibit is already registered.'); }}
                onCancel={closeWaterIntakeEdit}
                editIntake={editingIntake.intake}
                editAccess={editingIntake.access}
                onSaveEdit={handleSaveWaterIntakeEdit}
                canConfirmDocuments={currentUser.department === 'Water'}
                onSetDocumentsConfirmed={setWaterDocumentsConfirmed}
              />
            )}
            {activeView === 'case-file' && currentUser.role === 'SUPER_ADMIN' && (
              activeWaterIntake ? (
                <ExhibitCaseFile
                  intake={activeWaterIntake}
                  currentUser={currentUser}
                  backLabel="Case files"
                  onBack={() => setActiveWaterIntakeId(null)}
                  onComplete={handleCompleteWaterIntake}
                  onIntakeUpdated={handleWaterIntakeUpdated}
                />
              ) : (
                <ExhibitCaseFileIndex
                  intakes={waterIntakes}
                  isLoading={waterIntakesLoading}
                  error={waterIntakesError}
                  onOpenCaseFile={(intake) => setActiveWaterIntakeId(intake.id)}
                />
              )
            )}
            {activeView === 'case-file' && currentUser.role !== 'SUPER_ADMIN' && (
              <DigitalCaseFile
                caseData={activeCase}
                onUpdateDraftReport={handleUpdateDraftReport}
              />
            )}

            {activeView === 'references' && <ReferenceDatabaseView />}

            {activeView === 'super-admin' && currentUser.role === 'SUPER_ADMIN' && (
              <SuperAdminPage currentUserId={currentUser.id} initialTab={superAdminTab} hideTabs />
            )}

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
          {intakeVisitor && <OfficerVerificationModal
            isOpen={showOfficerModal}
            onClose={() => setShowOfficerModal(false)}
            visitor={intakeVisitor}
            currentAnalystName={currentUser.name}
            onConfirmVerification={async (data) => {
              await handleVerifyOfficer(intakeVisitor.id);
              setShowOfficerModal(false);
              if (data.proceedToIntake) {
                openIntake();
              }
            }}
          />}

          {/* Global Submission & Exhibits Intake Modal (Triggerable from Dashboard or Workspaces) */}
          {intakeVisitor && <SubmissionIntakeModal
            isOpen={showIntakeModal}
            onClose={() => setShowIntakeModal(false)}
            activeCase={activeCase}
            visitor={intakeVisitor}
            receivingAnalystName={currentUser.name}
            onSaveIntake={(data) => {
              handleRegisterSubmission(data);
              setShowIntakeModal(false);
            }}
          />}

          {/* Notifications Drawer */}
          <NotificationDrawer
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            notifications={visibleNotifications}
            unreadCount={visibleNotifications.filter((n) => !n.read).length}
            onMarkAllAsRead={() => void markAllNotificationsRead()}
            onSelectNotification={(notification) => void selectNotification(notification)}
            onToggleRead={(id) => {
              const notification = visibleNotifications.find((item) => item.id === id);
              if (notification) void markNotificationRead(id, !notification.read);
            }}
            onDismiss={(id) => void dismissNotification(id)}
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
