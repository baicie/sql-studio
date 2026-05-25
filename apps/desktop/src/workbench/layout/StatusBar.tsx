import { useSyncExternalStore } from 'react';

import { connectionService } from '@/services/connection/connection-service';
import { extensionService } from '@/services/extension/extension-service';

interface StatusBarProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function StatusBar({ health }: StatusBarProps) {
  const connectionSnapshot = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
  );

  const extensionSnapshot = useSyncExternalStore(
    extensionService.subscribe.bind(extensionService),
    extensionService.getSnapshot.bind(extensionService),
  );

  const activeConnection = connectionService.getActiveConnection();
  const connectionLabel = activeConnection
    ? `${activeConnection.name} (${connectionSnapshot.status})`
    : 'No Connection';
  const dialectLabel = activeConnection ? activeConnection.kind.toUpperCase() : 'SQL';
  const pluginLabel =
    extensionSnapshot.hostState === 'ready'
      ? `${extensionSnapshot.extensions.filter((item) => item.enabled).length} active`
      : extensionSnapshot.hostState;

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t bg-primary px-3 text-xs text-primary-foreground">
      <div className="flex items-center gap-4">
        <span>SQL GUI</span>
        <span>{connectionLabel}</span>
        <span>Dialect: {dialectLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        <span>Plugins: {pluginLabel}</span>
        <span>Rust Core: {health?.rustCoreReady ? 'Ready' : 'Checking'}</span>
      </div>
    </footer>
  );
}
