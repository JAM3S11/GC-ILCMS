import { OfficerVisitor } from '../../types';

export interface VisitorDeskViewProps {
  visitors: OfficerVisitor[];
  onRegisterVisitor: (visitor: OfficerVisitor) => void;
  onSendNotification?: (visitor: OfficerVisitor) => void;
  onSendLabNotification?: (visitor: OfficerVisitor) => void;
  onProceedToLab: (visitor: OfficerVisitor) => void;
  onCheckOutVisitor: (visitorId: string) => void;
  currentUserName: string;
  onNavigate?: (view: string) => void;
}