import { ACTIVITY_ITEMS } from '../constants';
import { useWorkbenchStore } from '../store/workbenchStore';
import type { ActivityId } from '../types';
import { cn } from '@/lib/cn';

export function ActivityBar() {
  const activeActivity = useWorkbenchStore((state) => state.activeActivity);
  const setActiveActivity = useWorkbenchStore((state) => state.setActiveActivity);
  const toggleSideBar = useWorkbenchStore((state) => state.toggleSideBar);

  function handleClick(id: ActivityId) {
    if (id === activeActivity) {
      toggleSideBar();
      return;
    }

    setActiveActivity(id);
  }

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center border-r bg-muted/40 py-2">
      <div className="flex flex-1 flex-col items-center gap-1">
        {ACTIVITY_ITEMS.filter((item) => item.id !== 'settings').map((item) => {
          const Icon = item.icon;
          const active = item.id === activeActivity;

          return (
            <button
              key={item.id}
              type="button"
              title={item.title}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                active && 'bg-accent text-accent-foreground',
              )}
              onClick={() => handleClick(item.id)}
            >
              {active ? <span className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" /> : null}

              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      {ACTIVITY_ITEMS.filter((item) => item.id === 'settings').map((item) => {
        const Icon = item.icon;
        const active = item.id === activeActivity;

        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              active && 'bg-accent text-accent-foreground',
            )}
            onClick={() => handleClick(item.id)}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </aside>
  );
}
