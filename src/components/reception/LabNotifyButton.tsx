import React, { useState } from 'react';
import { Check, UserPlus } from 'lucide-react';

import { OfficerVisitor } from '../../types';
import { useResendCountdown } from '../../lib/labNotification';
import { Button } from '../common/Dashboard';

interface LabNotifyButtonProps {
  visit: OfficerVisitor;
  onSend: (visitor: OfficerVisitor, resend: boolean) => Promise<void>;
  stopPropagation?: boolean;
  notifyLabel?: string;
  size?: 'xs' | 'sm';
}

/**
 * Notifies the destination lab. A resend unlocks 60s after the last send and
 * only while nobody in that lab has read the notification.
 */
export const LabNotifyButton: React.FC<LabNotifyButtonProps> = ({
  visit,
  onSend,
  stopPropagation = false,
  notifyLabel,
  size = 'xs',
}) => {
  const [sending, setSending] = useState(false);
  const countdown = useResendCountdown(visit.labNotificationSentAt);
  const sent = !!visit.labNotificationSentAt;
  // Reading the notification no longer stops resends; only a registered intake does.
  const registered = sent && !!visit.labIntakeRegistered;
  const seen = sent && !!visit.labNotificationSeen;
  const waiting = sent && !registered && countdown > 0;

  let label = notifyLabel ?? `Notify ${visit.laboratory}`;
  let title = `Notify ${visit.laboratory} about this visitor`;
  if (sending) label = 'Notifying…';
  else if (registered) {
    label = 'Intake registered';
    title = `${visit.laboratory} has registered this visitor's exhibit intake`;
  } else if (waiting) {
    label = `Resend in ${countdown}s`;
    title = seen
      ? `Seen by ${visit.laboratory}, but the intake is not registered yet — you can resend after the countdown`
      : `${visit.laboratory} has not registered the intake yet — you can resend after the countdown`;
  } else if (sent) {
    label = 'Resend notification';
    title = seen
      ? `Seen by ${visit.laboratory}, but the intake is not registered yet — send it again`
      : `${visit.laboratory} has not registered the intake yet — send it again`;
  }

  return (
    <Button
      size={size}
      variant={sent ? 'ghost' : 'primary'}
      icon={sent ? Check : UserPlus}
      disabled={sending || registered || waiting}
      title={title}
      onClick={async (event: React.MouseEvent) => {
        if (stopPropagation) event.stopPropagation();
        setSending(true);
        try {
          await onSend(visit, sent);
        } finally {
          setSending(false);
        }
      }}
    >
      {label}
    </Button>
  );
};
