import { useSyncExternalStore } from 'react';

import { logService } from '@/services/log/log-service';
import { useAppTranslation } from '@/i18n';

export function TerminalPanel() {
  const { t } = useAppTranslation('workbench');
  const logs = useSyncExternalStore(
    logService.subscribe.bind(logService),
    logService.getSnapshot.bind(logService),
  );

  if (logs.length === 0) {
    return <div className="p-3 text-sm text-muted-foreground">{t('panel.terminalEmpty')}</div>;
  }

  return (
    <div className="h-full overflow-auto p-3 font-mono text-xs">
      {logs.map((item) => (
        <div key={item.id} className="whitespace-pre-wrap py-0.5">
          <span className="text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString()}
          </span>{' '}
          <span>[{item.level}]</span> <span>[{item.scope}]</span> <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
