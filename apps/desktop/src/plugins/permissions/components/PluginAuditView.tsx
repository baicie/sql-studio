import { useSyncExternalStore } from 'react';
import { pluginAuditService } from '../PluginAuditService';

interface PluginAuditViewProps {
  extensionId?: string;
}

export function PluginAuditView(props: PluginAuditViewProps) {
  const items = useSyncExternalStore(
    (callback) => pluginAuditService.subscribe(callback),
    () => pluginAuditService.getItems(props.extensionId),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center justify-between border-b px-2">
        <div className="text-xs font-medium">Permission Audit</div>

        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs hover:bg-accent"
          onClick={() => pluginAuditService.clear(props.extensionId)}
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 text-xs">
        {items
          .slice()
          .reverse()
          .map((item) => (
            <div key={item.id} className="mb-2 rounded-md border p-2">
              <div className="flex gap-2">
                <span className="font-mono">{item.method}</span>

                <span className="text-muted-foreground">{item.extensionId}</span>

                <span className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="mt-1 text-muted-foreground">
                Required: {item.requiredPermissions.join(', ') || 'none'}
              </div>

              {item.paramsSummary ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2">
                  {JSON.stringify(item.paramsSummary, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
      </div>
    </div>
  );
}
