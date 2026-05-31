import { useSyncExternalStore } from 'react';
import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import { extensionService } from '@/services/extension/extension-service';
import { IconButton } from '@sqlgui/ui';
import { useWorkbenchStore } from '../store/workbenchStore';
import { cn } from '@/lib/cn';

interface StatusBarProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

/**
 * Flux Status Bar -- Slim 28px bar at bottom.
 * Shows: connection status, dialect, theme toggle.
 */
export function StatusBar({ health }: StatusBarProps) {
  const { t } = useAppTranslation('workbench');

  const connectionSnapshot = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
  );

  const extensionSnapshot = useSyncExternalStore(
    extensionService.subscribe.bind(extensionService),
    extensionService.getSnapshot.bind(extensionService),
  );

  const activeConnection = connectionService.getActiveConnection();
  const dialectLabel = activeConnection ? activeConnection.kind.toUpperCase() : 'SQL';
  const pluginLabel =
    extensionSnapshot.hostState === 'ready'
      ? `${extensionSnapshot.extensions.filter((item) => item.enabled).length} active`
      : extensionSnapshot.hostState;

  const theme = useWorkbenchStore((state) => state.theme);
  const setTheme = useWorkbenchStore((state) => state.setTheme);

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container px-3 text-[11px] text-on-surface-variant">
      {/* Left: app info */}
      <div className="flex items-center gap-4">
        <span className="font-medium text-on-surface">{t('appName')}</span>

        {/* Connection status */}
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              activeConnection
                ? connectionSnapshot.status === 'connected'
                  ? 'bg-green-400'
                  : 'bg-yellow-400'
                : 'bg-outline',
            )}
          />
          <span className="text-on-surface-variant">
            {activeConnection ? activeConnection.name : t('statusBar.noConnection')}
          </span>
        </span>

        {/* Dialect */}
        <span className="rounded-[4px] bg-surface px-1.5 py-0.5 font-mono text-[10px] text-on-surface">
          {dialectLabel}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Execution time */}
        <span id="execution-time" className="tabular-nums font-mono">
          {t('statusBar.rustCore', {
            status: health?.rustCoreReady ? t('statusBar.ready') : t('statusBar.checking'),
          })}
        </span>

        {/* Separator */}
        <span className="h-3 w-px bg-outline-variant" />

        {/* Theme toggle */}
        <IconButton
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="h-5 w-5 text-on-surface-variant hover:text-on-surface"
        >
          {theme === 'dark' ? (
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </IconButton>

        {/* Plugin count */}
        <span className="text-on-surface-variant">{pluginLabel}</span>
      </div>
    </footer>
  );
}
