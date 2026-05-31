import { IconButton } from '@sqlgui/ui';
import { executeCommand } from '@/services/command/execute-command';
import { workbenchService } from '@/services/workbench/workbench-service';
import { useAppTranslation } from '@/i18n';
import { ACTIVITY_ITEMS } from '../constants';
import { useWorkbenchStore } from '../store/workbenchStore';
import type { ActivityId } from '../types';
import { cn } from '@/lib/cn';

/**
 * Flux Activity Bar -- 48px narrow rail for global navigation.
 * Icons centered, active state = 2px left vertical bar in primary color.
 * Hover state = subtle background shift.
 */
export function ActivityBar() {
  const activeActivity = useWorkbenchStore((state) => state.activeActivity);
  const { t } = useAppTranslation('workbench');

  function handleClick(id: ActivityId) {
    if (id === activeActivity) {
      workbenchService.toggleSideBar();
      return;
    }

    void executeCommand(getShowActivityCommand(id));
  }

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center border-r border-outline-variant bg-surface py-2">
      {/* Top navigation group */}
      <div className="flex flex-1 flex-col items-center gap-0.5">
        {ACTIVITY_ITEMS.filter((item) => item.id !== 'settings').map((item) => {
          const Icon = item.icon;
          const active = item.id === activeActivity;

          return (
            <IconButton
              key={item.id}
              variant="ghost"
              title={item.titleKey ? t(item.titleKey) : item.title}
              className={cn(
                'relative h-10 w-10 rounded-[4px]',
                active
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
              onClick={() => handleClick(item.id)}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
            </IconButton>
          );
        })}
      </div>

      {/* Bottom group: settings */}
      <div className="flex flex-col items-center gap-0.5">
        {ACTIVITY_ITEMS.filter((item) => item.id === 'settings').map((item) => {
          const Icon = item.icon;
          const active = item.id === activeActivity;

          return (
            <IconButton
              key={item.id}
              variant="ghost"
              title={item.titleKey ? t(item.titleKey) : item.title}
              className={cn(
                'relative h-10 w-10 rounded-[4px]',
                active
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
              onClick={() => handleClick(item.id)}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
            </IconButton>
          );
        })}
      </div>
    </aside>
  );
}

function getShowActivityCommand(id: ActivityId) {
  if (id === 'connections') {
    return 'workbench.showConnections';
  }

  if (id === 'extensions') {
    return 'workbench.showExtensions';
  }

  if (id === 'history') {
    return 'workbench.showHistory';
  }

  return 'workbench.showSettings';
}
