import type { ExtensionPermission } from '@sqlgui/extension-schema';
import type { PermissionMeta } from './types';

export const permissionMetas: Record<ExtensionPermission, PermissionMeta> = {
  'ui.notification': {
    permission: 'ui.notification',
    risk: 'low',
    titleKey: 'extension.permission.ui.notification.title',
    descriptionKey: 'extension.permission.ui.notification.description',
  },

  'storage.local': {
    permission: 'storage.local',
    risk: 'low',
    titleKey: 'extension.permission.storage.local.title',
    descriptionKey: 'extension.permission.storage.local.description',
  },

  'editor.read': {
    permission: 'editor.read',
    risk: 'medium',
    titleKey: 'extension.permission.editor.read.title',
    descriptionKey: 'extension.permission.editor.read.description',
  },

  'editor.write': {
    permission: 'editor.write',
    risk: 'medium',
    titleKey: 'extension.permission.editor.write.title',
    descriptionKey: 'extension.permission.editor.write.description',
  },

  'clipboard.read': {
    permission: 'clipboard.read',
    risk: 'high',
    titleKey: 'extension.permission.clipboard.read.title',
    descriptionKey: 'extension.permission.clipboard.read.description',
  },

  'clipboard.write': {
    permission: 'clipboard.write',
    risk: 'medium',
    titleKey: 'extension.permission.clipboard.write.title',
    descriptionKey: 'extension.permission.clipboard.write.description',
  },

  'db.connection.read': {
    permission: 'db.connection.read',
    risk: 'medium',
    titleKey: 'extension.permission.db.connection.read.title',
    descriptionKey: 'extension.permission.db.connection.read.description',
  },

  'db.schema.read': {
    permission: 'db.schema.read',
    risk: 'medium',
    titleKey: 'extension.permission.db.schema.read.title',
    descriptionKey: 'extension.permission.db.schema.read.description',
  },

  'db.query.read': {
    permission: 'db.query.read',
    risk: 'high',
    titleKey: 'extension.permission.db.query.read.title',
    descriptionKey: 'extension.permission.db.query.read.description',
  },

  'db.query.explain': {
    permission: 'db.query.explain',
    risk: 'high',
    titleKey: 'extension.permission.db.query.explain.title',
    descriptionKey: 'extension.permission.db.query.explain.description',
  },

  'db.query.write': {
    permission: 'db.query.write',
    risk: 'critical',
    titleKey: 'extension.permission.db.query.write.title',
    descriptionKey: 'extension.permission.db.query.write.description',
  },

  'network.fetch': {
    permission: 'network.fetch',
    risk: 'critical',
    titleKey: 'extension.permission.network.fetch.title',
    descriptionKey: 'extension.permission.network.fetch.description',
  },
};

export function getPermissionRisk(permission: ExtensionPermission) {
  return permissionMetas[permission]?.risk ?? 'high';
}
