import type { ExtensionPermission } from '@sqlgui/extension-schema';

export class PermissionError extends Error {
  readonly code = 'PLUGIN_PERMISSION_DENIED';

  constructor(
    readonly extensionId: string,
    readonly method: string,
    readonly missingPermissions: ExtensionPermission[],
  ) {
    super(
      `Extension "${extensionId}" is missing permissions for "${method}": ${missingPermissions.join(', ')}`,
    );
  }
}

export class DangerousOperationError extends Error {
  readonly code = 'PLUGIN_DANGEROUS_OPERATION_DENIED';

  constructor(
    readonly extensionId: string,
    readonly method: string,
    readonly reason: string,
  ) {
    super(`Dangerous operation denied for extension "${extensionId}" on "${method}": ${reason}`);
  }
}
