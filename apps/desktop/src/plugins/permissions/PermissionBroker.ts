import type { ExtensionPermission } from '@sqlgui/extension-schema';
import type { ExtensionManifest } from '@sqlgui/extension-schema';
import type { InstalledExtension } from '@/services/extension/types';
import { apiPermissionMap } from './apiPermissionMap';
import { permissionStorage } from './PermissionStorage';
import { DangerousOperationError, PermissionError } from './PermissionError';
import { sqlSafetyAnalyzer } from './SqlSafetyAnalyzer';
import { permissionPromptService } from './PermissionPromptService';
import { pluginAuditService } from './PluginAuditService';

class PermissionBroker {
  async ensureManifestGranted(extension: InstalledExtension) {
    const required = extension.manifest.permissions ?? [];
    const grant = permissionStorage.getGrant(extension.id);

    if (!required.length) return true;

    const manifestHash = await this.getManifestPermissionHash(extension.manifest);

    if (grant && grant.manifestHash === manifestHash && includesAll(grant.permissions, required)) {
      return true;
    }

    const granted = await permissionPromptService.requestPermissionGrant({
      extension,
      permissions: required,
      previousPermissions: grant?.permissions ?? [],
    });

    if (!granted) {
      return false;
    }

    permissionStorage.updatePermissions(extension.id, required, manifestHash);

    return true;
  }

  async assertAllowed(extension: InstalledExtension, method: string, params?: unknown) {
    const required = this.getRequiredPermissions(method, params);
    const granted = permissionStorage.getGrantedPermissions(extension.id);

    const missing = required.filter((permission) => !granted.includes(permission));

    pluginAuditService.record({
      extensionId: extension.id,
      method,
      requiredPermissions: required,
      grantedPermissions: granted,
      paramsSummary: summarizeParams(params),
      createdAt: Date.now(),
    });

    if (missing.length) {
      throw new PermissionError(extension.id, method, missing);
    }

    await this.assertDangerousOperationConfirmed(extension, method, params, granted);
  }

  getRequiredPermissions(method: string, params?: unknown): ExtensionPermission[] {
    const base = apiPermissionMap[method];

    if (!base) {
      return ['network.fetch'];
    }

    if (method === 'db.query') {
      const sql = String((params as { sql?: string })?.sql ?? '');
      const analysis = sqlSafetyAnalyzer.analyze(sql);

      if (analysis.kind === 'write' || analysis.kind === 'ddl') {
        return unique([...base, 'db.query.write']);
      }

      return base;
    }

    return base;
  }

  private async assertDangerousOperationConfirmed(
    extension: InstalledExtension,
    method: string,
    params: unknown,
    granted: ExtensionPermission[],
  ) {
    if (method !== 'db.query') return;

    const sql = String((params as { sql?: string })?.sql ?? '');
    const analysis = sqlSafetyAnalyzer.analyze(sql);

    if (!analysis.dangerous) return;

    if (!granted.includes('db.query.write')) {
      throw new DangerousOperationError(
        extension.id,
        method,
        'Write query permission is required.',
      );
    }

    const confirmed = await permissionPromptService.confirmDangerousOperation({
      extensionId: extension.id,
      extensionName: extension.manifest.displayName ?? extension.manifest.name,
      sql,
      reason: analysis.reason ?? 'Dangerous SQL operation',
    });

    if (!confirmed) {
      throw new DangerousOperationError(
        extension.id,
        method,
        analysis.reason ?? 'User denied dangerous SQL operation.',
      );
    }
  }

  private async getManifestPermissionHash(manifest: ExtensionManifest) {
    const relevant = {
      permissions: [...(manifest.permissions ?? [])].sort(),
      name: manifest.name,
      publisher: manifest.publisher,
      version: manifest.version,
    };

    const encoded = new TextEncoder().encode(JSON.stringify(relevant));
    const digest = await crypto.subtle.digest('SHA-256', encoded);

    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  }
}

function includesAll<T>(source: T[], required: T[]) {
  return required.every((item) => source.includes(item));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function summarizeParams(params: unknown) {
  if (!params || typeof params !== 'object') return undefined;

  const payload = params as Record<string, unknown>;

  if (typeof payload.sql === 'string') {
    return Object.assign({}, payload, {
      sql: payload.sql.slice(0, 500),
    });
  }

  return payload;
}

export const permissionBroker = new PermissionBroker();
