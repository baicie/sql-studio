import { Button } from '@sqlgui/ui';
import { useNotificationStore } from '@/services/notification/notification-store';
import { notificationService } from '@/services/notification/notification-service';
import { cn } from '@/lib/cn';

export function NotificationCenter() {
  const items = useNotificationStore((state) => state.items);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2">
      {items.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          className={cn(
            'pointer-events-auto justify-start text-left shadow-lg',
            item.type === 'error' && 'border-destructive/40 bg-destructive/10',
            item.type === 'warning' && 'border-yellow-500/40 bg-yellow-500/10',
            item.type === 'success' && 'border-green-500/40 bg-green-500/10',
          )}
          onClick={() => notificationService.dismiss(item.id)}
        >
          <div>
            <div className="text-xs font-medium uppercase tracking-wide">{item.type}</div>
            <div className="mt-1 text-foreground">{item.message}</div>
          </div>
        </Button>
      ))}
    </div>
  );
}
