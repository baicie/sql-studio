import type { ExtensionPermission } from '@sqlgui/extension-schema';

export const permissionDescriptions: Record<
  ExtensionPermission,
  { title: string; description: string }
> = {
  'ui.notification': {
    title: '显示通知',
    description: '允许插件显示信息、警告和错误提示。',
  },

  'storage.local': {
    title: '本地插件存储',
    description: '允许插件保存自己的本地配置和状态。',
  },

  'editor.read': {
    title: '读取编辑器内容',
    description: '允许插件读取当前 SQL 编辑器中的内容。',
  },

  'editor.write': {
    title: '修改编辑器内容',
    description: '允许插件插入、替换或修改 SQL 编辑器内容。',
  },

  'clipboard.read': {
    title: '读取剪贴板',
    description: '允许插件读取系统剪贴板文本。',
  },

  'clipboard.write': {
    title: '写入剪贴板',
    description: '允许插件写入系统剪贴板文本。',
  },

  'db.connection.read': {
    title: '读取连接信息',
    description: '允许插件读取数据库连接名称、类型等元信息，不包含密码。',
  },

  'db.schema.read': {
    title: '读取数据库结构',
    description: '允许插件读取 database、schema、table 和 column 信息。',
  },

  'db.query.read': {
    title: '执行只读查询',
    description: '允许插件执行 SELECT、SHOW、EXPLAIN 等只读 SQL。',
  },

  'db.query.explain': {
    title: '执行 EXPLAIN',
    description: '允许插件对 SQL 执行 EXPLAIN。',
  },

  'db.query.write': {
    title: '执行写入查询',
    description: '允许插件执行可能修改数据或结构的 SQL。',
  },

  'network.fetch': {
    title: '访问网络',
    description: '允许插件访问网络资源。',
  },
};

export function getPermissionTitle(permission: ExtensionPermission) {
  return permissionDescriptions[permission]?.title ?? permission;
}

export function getPermissionDescription(permission: ExtensionPermission) {
  return permissionDescriptions[permission]?.description ?? '';
}
