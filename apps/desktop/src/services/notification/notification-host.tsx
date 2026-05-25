import { useSyncExternalStore } from 'react';

import { notificationService } from './notification-service';
import { cn } from '@/lib/cn';

export function NotificationHost() {
  const notifications = useSyncExternalStore(
    notificationService.subscribe.bind(notificationService),
    notificationService.getSnapshot.bind(notificationService),
  );

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-50 flex w-80 flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg',
            notification.type === 'info' && 'border-border bg-popover text-popover-foreground',
            notification.type === 'warn' && 'border-yellow-500/40 bg-yellow-500/10 text-foreground',
            notification.type === 'error' &&
              'border-destructive/40 bg-destructive/10 text-foreground',
          )}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}
