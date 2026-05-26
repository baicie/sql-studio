import { useSyncExternalStore } from 'react';
import type { ExtensionPermission } from '@sqlgui/extension-schema';
import { permissionStorage } from './PermissionStorage';

export function useExtensionPermissions(extensionId: string) {
  const subscribe = (listener: () => void) => {
    permissionStorage.addChangeListener(listener);
    return () => permissionStorage.removeChangeListener(listener);
  };

  const grant = useSyncExternalStore(subscribe, () => permissionStorage.getGrant(extensionId));

  const grantedPermissions = grant?.permissions ?? [];

  return {
    grant,
    grantedPermissions,
    hasPermission: (permission: ExtensionPermission) => grantedPermissions.includes(permission),
    hasAllPermissions: (permissions: ExtensionPermission[]) =>
      permissions.every((p) => grantedPermissions.includes(p)),
    isGranted: Boolean(grant),
  };
}
