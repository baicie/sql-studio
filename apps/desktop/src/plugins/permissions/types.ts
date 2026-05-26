import type { ExtensionPermission } from '@sqlgui/extension-schema';

export type PermissionDecision = 'granted' | 'denied';

export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PermissionMeta {
  permission: ExtensionPermission;
  risk: PermissionRiskLevel;
  titleKey: string;
  descriptionKey: string;
}

export interface ExtensionPermissionGrant {
  extensionId: string;
  permissions: ExtensionPermission[];
  grantedAt: number;
  manifestHash: string;
}

export interface PermissionCheckContext {
  extensionId: string;
  method: string;
  params?: unknown;
  permissions: ExtensionPermission[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: ExtensionPermission[];
  requiresConfirmation?: boolean;
}

export interface DangerousOperationContext {
  extensionId: string;
  method: string;
  sql?: string;
  reason: string;
}
