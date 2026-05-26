import type { ExtensionPermission } from '@sqlgui/extension-schema';

interface PermissionChangeWarningProps {
  previousPermissions: ExtensionPermission[];
  currentPermissions: ExtensionPermission[];
}

export function PermissionChangeWarning(props: PermissionChangeWarningProps) {
  const { previousPermissions, currentPermissions } = props;

  const previousSet = new Set(previousPermissions);
  const currentSet = new Set(currentPermissions);

  const added = currentPermissions.filter((p) => !previousSet.has(p));
  const removed = previousPermissions.filter((p) => !currentSet.has(p));

  if (!added.length && !removed.length) return null;

  return (
    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
      <div className="mb-2 font-medium">Permission Changes Detected</div>

      {added.length > 0 && (
        <div className="mb-1">
          <span className="text-destructive">New permissions added:</span>
          <ul className="ml-4 list-disc text-xs">
            {added.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {removed.length > 0 && (
        <div>
          <span className="text-muted-foreground">Permissions removed:</span>
          <ul className="ml-4 list-disc text-xs">
            {removed.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
