import { OfficerVisitor, ReceptionVisitDraft } from '../../types';

export interface ReceptionVisitStats {
  totalVisitors: number;
  currentlyOnSite: number;
  awaitingLab: number;
  totalDeparted: number;
  todayRegistered: number;
  todayAwaitingLab: number;
  todayInLaboratory: number;
  todayCompleted: number;
  todayDeparted: number;
}

export interface VisitorDeskViewProps {
  visitors: OfficerVisitor[];
  visitStats: ReceptionVisitStats | null;
  visitStatsError: string;
  visitStatsLoading: boolean;
  onRegisterVisitor: (visitor: ReceptionVisitDraft) => Promise<boolean>;
  onSendLabNotification?: (visitor: OfficerVisitor, resend?: boolean) => Promise<void>;
  onSendNotification?: (visitor: OfficerVisitor) => void;
  onRevealNationalId: (visitorId: string) => Promise<string | null>;
  onProceedToLab: (visitor: OfficerVisitor) => void;
  onCheckOutVisitor: (visitorId: string) => Promise<void>;
  isLoading: boolean;
  hasMoreVisitors: boolean;
  isLoadingMoreVisitors: boolean;
  onLoadMoreVisitors: () => Promise<void>;
  currentUserName: string;
  onNavigate?: (view: string) => void;
}