import type { ExtensionPermission } from '@sqlgui/extension-schema';
import { permissionMetas } from '../permissions';
import { PermissionRiskBadge } from './PermissionRiskBadge';

interface PermissionListProps {
  permissions: ExtensionPermission[];
}

export function PermissionList(props: PermissionListProps) {
  const { permissions } = props;

  if (!permissions.length) {
    return <div className="text-sm text-muted-foreground">No permissions required.</div>;
  }

  return (
    <div className="space-y-2">
      {permissions.map((permission) => {
        const meta = permissionMetas[permission];

        return (
          <div key={permission} className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-xs">{permission}</span>

              {meta ? <PermissionRiskBadge risk={meta.risk} /> : null}
            </div>

            <div className="text-sm">{describePermission(permission)}</div>
          </div>
        );
      })}
    </div>
  );
}

function describePermission(permission: ExtensionPermission) {
  const descriptions: Record<ExtensionPermission, string> = {
    'ui.notification': 'Show notifications and messages.',
    'storage.local': 'Store data locally for this extension.',
    'editor.read': 'Read SQL editor content.',
    'editor.write': 'Modify SQL editor content.',
    'clipboard.read': 'Read text from clipboard.',
    'clipboard.write': 'Write text to clipboard.',
    'db.connection.read': 'Read database connection metadata.',
    'db.schema.read': 'Read database schemas, tables and columns.',
    'db.query.read': 'Execute read-only SQL queries.',
    'db.query.explain': 'Execute EXPLAIN queries.',
    'db.query.write': 'Execute SQL that may modify data or schema.',
    'network.fetch': 'Access network resources.',
  };

  return descriptions[permission] ?? permission;
}
