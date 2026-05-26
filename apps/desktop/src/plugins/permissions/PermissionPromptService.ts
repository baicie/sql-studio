import type { ExtensionPermission } from '@sqlgui/extension-schema';
import type { InstalledExtension } from '@/services/extension/types';

export interface PermissionGrantRequest {
  id: string;
  extension: InstalledExtension;
  permissions: ExtensionPermission[];
  previousPermissions: ExtensionPermission[];
  resolve(value: boolean): void;
}

export interface DangerousSqlConfirmRequest {
  id: string;
  extensionId: string;
  extensionName: string;
  sql: string;
  reason: string;
  resolve(value: boolean): void;
}

type Listener = () => void;

class PermissionPromptService {
  private grantRequest?: PermissionGrantRequest;
  private dangerousSqlRequest?: DangerousSqlConfirmRequest;
  private listeners = new Set<Listener>();

  requestPermissionGrant(input: {
    extension: InstalledExtension;
    permissions: ExtensionPermission[];
    previousPermissions: ExtensionPermission[];
  }) {
    return new Promise<boolean>((resolve) => {
      this.grantRequest = Object.assign(
        {
          id: crypto.randomUUID(),
          resolve,
        },
        input,
      );

      this.emit();
    });
  }

  confirmDangerousOperation(input: {
    extensionId: string;
    extensionName: string;
    sql: string;
    reason: string;
  }) {
    return new Promise<boolean>((resolve) => {
      this.dangerousSqlRequest = Object.assign(
        {
          id: crypto.randomUUID(),
          resolve,
        },
        input,
      );

      this.emit();
    });
  }

  getGrantRequest() {
    return this.grantRequest;
  }

  getDangerousSqlRequest() {
    return this.dangerousSqlRequest;
  }

  resolveGrantRequest(value: boolean) {
    this.grantRequest?.resolve(value);
    this.grantRequest = undefined;
    this.emit();
  }

  resolveDangerousSqlRequest(value: boolean) {
    this.dangerousSqlRequest?.resolve(value);
    this.dangerousSqlRequest = undefined;
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const permissionPromptService = new PermissionPromptService();
