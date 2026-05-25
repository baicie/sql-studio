下面是 **Phase 7：i18n 国际化基础设施详细设计**。

这一阶段目标是：

> **把应用内所有用户可见文案统一收敛到 i18n 系统里，先支持中文 / 英文，并为后续插件系统、插件市场、错误提示、数据库方言文案预留扩展能力。**

Phase 7 做完以后，你的 SQL GUI 应该具备：

```txt
1. 支持 zh-CN / en-US
2. 支持应用内切换语言
3. 支持语言配置持久化
4. 支持模块化 namespace
5. 支持 Rust 错误码映射到前端多语言文案
6. 支持插件贡献自己的语言包
7. 所有核心 UI 不再硬编码中文/英文
```

---

# Phase 7：i18n 详细设计

## 1. 阶段目标

Phase 7 的核心不是“翻译一下文案”，而是建立一套长期可维护的国际化结构。

## 1.1 必做功能

```txt
[ ] 接入 i18next / react-i18next
[ ] 建立 packages/i18n 共享包
[ ] 支持 zh-CN
[ ] 支持 en-US
[ ] 支持语言切换
[ ] 支持语言配置持久化
[ ] 支持 namespace 拆分
[ ] 支持 common / workbench / connection / editor / result / extension
[ ] 支持错误码翻译
[ ] 支持日期/数字格式化基础能力
[ ] 替换 Phase 1-6 中的硬编码 UI 文案
[ ] 给插件系统预留插件语言包注册接口
```

## 1.2 暂不做

```txt
[ ] 完整多地区格式，例如 zh-TW / ja-JP / ko-KR
[ ] 远程语言包更新
[ ] 语言包市场
[ ] 插件市场自动翻译
[ ] 复杂 ICU MessageFormat
[ ] Rust 端完整 i18n
```

MVP 阶段只做：

```txt
zh-CN
en-US
```

---

# 2. 技术选型

推荐：

```txt
i18next + react-i18next
```

原因：

```txt
1. React 生态成熟
2. namespace 拆分方便
3. 插件系统后续可以动态 addResourceBundle
4. 支持语言切换
5. 支持 fallbackLng
6. 支持插值
7. 支持复数、格式化扩展
```

---

# 3. 总体架构

```txt
packages/i18n
  ↓
提供语言资源、类型、初始化工具
  ↓
apps/desktop/src/i18n
  ↓
初始化应用 i18n 实例
  ↓
React 组件通过 useTranslation 使用
  ↓
服务层通过 i18n.t 使用
  ↓
插件系统后续通过 pluginI18nRegistry 注册插件语言包
```

整体结构：

```txt
┌───────────────────────────────────────────┐
│ packages/i18n                             │
│  ├─ locales                               │
│  │  ├─ zh-CN                              │
│  │  └─ en-US                              │
│  ├─ namespaces                            │
│  ├─ types                                 │
│  └─ helpers                               │
└─────────────────────┬─────────────────────┘
                      │
┌─────────────────────▼─────────────────────┐
│ apps/desktop/src/i18n                      │
│  ├─ initI18n                               │
│  ├─ languageStore                          │
│  ├─ useAppTranslation                      │
│  └─ pluginI18nRegistry                     │
└─────────────────────┬─────────────────────┘
                      │
┌─────────────────────▼─────────────────────┐
│ React Workbench                            │
│  ├─ connection                             │
│  ├─ editor                                 │
│  ├─ result                                 │
│  ├─ extension                              │
│  └─ settings                               │
└───────────────────────────────────────────┘
```

---

# 4. 目录设计

## 4.1 packages/i18n

```txt
packages/i18n/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ index.ts
│  ├─ types.ts
│  ├─ resources.ts
│  ├─ namespaces.ts
│  ├─ locales/
│  │  ├─ zh-CN/
│  │  │  ├─ common.json
│  │  │  ├─ workbench.json
│  │  │  ├─ connection.json
│  │  │  ├─ editor.json
│  │  │  ├─ result.json
│  │  │  ├─ extension.json
│  │  │  ├─ marketplace.json
│  │  │  ├─ settings.json
│  │  │  └─ error.json
│  │  │
│  │  └─ en-US/
│  │     ├─ common.json
│  │     ├─ workbench.json
│  │     ├─ connection.json
│  │     ├─ editor.json
│  │     ├─ result.json
│  │     ├─ extension.json
│  │     ├─ marketplace.json
│  │     ├─ settings.json
│  │     └─ error.json
│  │
│  └─ utils/
│     ├─ format.ts
│     └─ validateLocale.ts
```

## 4.2 apps/desktop

```txt
apps/desktop/src/i18n/
├─ index.ts
├─ initI18n.ts
├─ languageStore.ts
├─ languageService.ts
├─ useAppTranslation.ts
├─ pluginI18nRegistry.ts
└─ detectLanguage.ts
```

## 4.3 设置页

```txt
apps/desktop/src/workbench/settings/
├─ components/
│  ├─ SettingsView.tsx
│  ├─ LanguageSettings.tsx
│  └─ AppearanceSettings.tsx
└─ registerSettingsCommands.ts
```

---

# 5. namespace 设计

不要所有文案都塞进 `common.json`。
按模块拆：

```txt
common        通用按钮、状态、操作
workbench     工作台布局、ActivityBar、Panel
connection    连接管理
editor        SQL 编辑器
result        查询结果
extension     插件系统
marketplace   插件市场
settings      设置页
error         错误码映射
```

## 5.1 namespace 定义

```ts
// packages/i18n/src/namespaces.ts

export const namespaces = [
  'common',
  'workbench',
  'connection',
  'editor',
  'result',
  'extension',
  'marketplace',
  'settings',
  'error',
] as const;

export type I18nNamespace = (typeof namespaces)[number];
```

---

# 6. 语言类型设计

```ts
// packages/i18n/src/types.ts

export const supportedLanguages = ['zh-CN', 'en-US'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const languageOptions: LanguageOption[] = [
  {
    value: 'zh-CN',
    label: 'Chinese Simplified',
    nativeLabel: '简体中文',
  },
  {
    value: 'en-US',
    label: 'English',
    nativeLabel: 'English',
  },
];
```

---

# 7. resources 聚合

```ts
// packages/i18n/src/resources.ts

import commonZh from './locales/zh-CN/common.json';
import workbenchZh from './locales/zh-CN/workbench.json';
import connectionZh from './locales/zh-CN/connection.json';
import editorZh from './locales/zh-CN/editor.json';
import resultZh from './locales/zh-CN/result.json';
import extensionZh from './locales/zh-CN/extension.json';
import marketplaceZh from './locales/zh-CN/marketplace.json';
import settingsZh from './locales/zh-CN/settings.json';
import errorZh from './locales/zh-CN/error.json';

import commonEn from './locales/en-US/common.json';
import workbenchEn from './locales/en-US/workbench.json';
import connectionEn from './locales/en-US/connection.json';
import editorEn from './locales/en-US/editor.json';
import resultEn from './locales/en-US/result.json';
import extensionEn from './locales/en-US/extension.json';
import marketplaceEn from './locales/en-US/marketplace.json';
import settingsEn from './locales/en-US/settings.json';
import errorEn from './locales/en-US/error.json';

export const resources = {
  'zh-CN': {
    common: commonZh,
    workbench: workbenchZh,
    connection: connectionZh,
    editor: editorZh,
    result: resultZh,
    extension: extensionZh,
    marketplace: marketplaceZh,
    settings: settingsZh,
    error: errorZh,
  },
  'en-US': {
    common: commonEn,
    workbench: workbenchEn,
    connection: connectionEn,
    editor: editorEn,
    result: resultEn,
    extension: extensionEn,
    marketplace: marketplaceEn,
    settings: settingsEn,
    error: errorEn,
  },
} as const;
```

```ts
// packages/i18n/src/index.ts

export { resources } from './resources';
export { namespaces } from './namespaces';
export type { I18nNamespace } from './namespaces';
export { supportedLanguages, languageOptions } from './types';
export type { SupportedLanguage, LanguageOption } from './types';
```

---

# 8. 语言资源设计

## 8.1 common.json

### zh-CN

```json
{
  "appName": "SQL GUI",
  "actions": {
    "ok": "确定",
    "cancel": "取消",
    "save": "保存",
    "delete": "删除",
    "edit": "编辑",
    "close": "关闭",
    "refresh": "刷新",
    "copy": "复制",
    "clear": "清空",
    "run": "运行",
    "stop": "停止",
    "search": "搜索",
    "install": "安装",
    "uninstall": "卸载",
    "enable": "启用",
    "disable": "禁用",
    "retry": "重试"
  },
  "status": {
    "loading": "加载中...",
    "success": "成功",
    "failed": "失败",
    "empty": "暂无数据",
    "unknown": "未知"
  },
  "time": {
    "milliseconds": "{{value}} 毫秒",
    "seconds": "{{value}} 秒"
  }
}
```

### en-US

```json
{
  "appName": "SQL GUI",
  "actions": {
    "ok": "OK",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "refresh": "Refresh",
    "copy": "Copy",
    "clear": "Clear",
    "run": "Run",
    "stop": "Stop",
    "search": "Search",
    "install": "Install",
    "uninstall": "Uninstall",
    "enable": "Enable",
    "disable": "Disable",
    "retry": "Retry"
  },
  "status": {
    "loading": "Loading...",
    "success": "Success",
    "failed": "Failed",
    "empty": "No data",
    "unknown": "Unknown"
  },
  "time": {
    "milliseconds": "{{value}} ms",
    "seconds": "{{value}} s"
  }
}
```

---

## 8.2 workbench.json

### zh-CN

```json
{
  "activityBar": {
    "connections": "连接",
    "extensions": "插件",
    "history": "历史",
    "settings": "设置"
  },
  "panel": {
    "results": "结果",
    "messages": "消息",
    "problems": "问题",
    "history": "查询历史"
  },
  "commandPalette": {
    "placeholder": "输入命令...",
    "noCommands": "没有匹配的命令"
  },
  "statusBar": {
    "ready": "就绪",
    "noConnection": "未选择连接"
  }
}
```

### en-US

```json
{
  "activityBar": {
    "connections": "Connections",
    "extensions": "Extensions",
    "history": "History",
    "settings": "Settings"
  },
  "panel": {
    "results": "Results",
    "messages": "Messages",
    "problems": "Problems",
    "history": "Query History"
  },
  "commandPalette": {
    "placeholder": "Type a command...",
    "noCommands": "No matching commands"
  },
  "statusBar": {
    "ready": "Ready",
    "noConnection": "No connection selected"
  }
}
```

---

## 8.3 connection.json

### zh-CN

```json
{
  "title": "连接",
  "newConnection": "新建连接",
  "editConnection": "编辑连接",
  "deleteConnection": "删除连接",
  "testConnection": "测试连接",
  "openConnection": "打开连接",
  "closeConnection": "关闭连接",
  "empty": "暂无连接",
  "fields": {
    "name": "名称",
    "type": "数据库类型",
    "host": "主机",
    "port": "端口",
    "username": "用户名",
    "password": "密码",
    "database": "数据库",
    "filePath": "数据库文件",
    "ssl": "使用 SSL"
  },
  "dbKind": {
    "sqlite": "SQLite",
    "postgres": "PostgreSQL",
    "mysql": "MySQL"
  },
  "tree": {
    "tables": "表",
    "columns": "字段",
    "views": "视图"
  },
  "contextMenu": {
    "selectTop1000": "查询前 1000 行",
    "showColumns": "查看字段",
    "copyTableName": "复制表名",
    "copyFullName": "复制完整名称",
    "refresh": "刷新"
  },
  "status": {
    "connected": "已连接",
    "connecting": "连接中",
    "disconnected": "未连接",
    "error": "连接错误"
  },
  "message": {
    "testSuccess": "连接测试成功",
    "saveSuccess": "连接已保存",
    "deleteConfirm": "确定要删除连接「{{name}}」吗？",
    "passwordInsecure": "MVP 阶段密码暂时保存在本地，后续会接入系统密钥链。"
  }
}
```

### en-US

```json
{
  "title": "Connections",
  "newConnection": "New Connection",
  "editConnection": "Edit Connection",
  "deleteConnection": "Delete Connection",
  "testConnection": "Test Connection",
  "openConnection": "Open Connection",
  "closeConnection": "Close Connection",
  "empty": "No connections",
  "fields": {
    "name": "Name",
    "type": "Database Type",
    "host": "Host",
    "port": "Port",
    "username": "Username",
    "password": "Password",
    "database": "Database",
    "filePath": "Database File",
    "ssl": "Use SSL"
  },
  "dbKind": {
    "sqlite": "SQLite",
    "postgres": "PostgreSQL",
    "mysql": "MySQL"
  },
  "tree": {
    "tables": "Tables",
    "columns": "Columns",
    "views": "Views"
  },
  "contextMenu": {
    "selectTop1000": "Select Top 1000",
    "showColumns": "Show Columns",
    "copyTableName": "Copy Table Name",
    "copyFullName": "Copy Full Name",
    "refresh": "Refresh"
  },
  "status": {
    "connected": "Connected",
    "connecting": "Connecting",
    "disconnected": "Disconnected",
    "error": "Connection Error"
  },
  "message": {
    "testSuccess": "Connection test succeeded",
    "saveSuccess": "Connection saved",
    "deleteConfirm": "Delete connection \"{{name}}\"?",
    "passwordInsecure": "In MVP, passwords are stored locally. System keychain support will be added later."
  }
}
```

---

## 8.4 editor.json

### zh-CN

```json
{
  "newQuery": "新建查询",
  "untitled": "未命名.sql",
  "run": "运行 SQL",
  "runSelection": "运行选中 SQL",
  "saveDraft": "保存草稿",
  "closeEditor": "关闭编辑器",
  "selectConnection": "选择连接",
  "noConnection": "未选择连接",
  "empty": {
    "title": "暂无打开的 SQL 编辑器",
    "description": "新建查询或从连接树中选择一张表开始。"
  },
  "message": {
    "emptySql": "SQL 为空",
    "noActiveEditor": "没有活动编辑器",
    "noConnectionSelected": "未选择数据库连接",
    "dangerousSqlConfirm": "此 SQL 可能会修改数据，是否继续？",
    "unsavedConfirm": "「{{title}}」有未保存的修改，确定关闭吗？"
  }
}
```

### en-US

```json
{
  "newQuery": "New Query",
  "untitled": "Untitled.sql",
  "run": "Run SQL",
  "runSelection": "Run Selected SQL",
  "saveDraft": "Save Draft",
  "closeEditor": "Close Editor",
  "selectConnection": "Select Connection",
  "noConnection": "No connection",
  "empty": {
    "title": "No SQL editor open",
    "description": "Create a query or select a table from the connection tree."
  },
  "message": {
    "emptySql": "SQL is empty",
    "noActiveEditor": "No active editor",
    "noConnectionSelected": "No database connection selected",
    "dangerousSqlConfirm": "This SQL may modify data. Continue?",
    "unsavedConfirm": "\"{{title}}\" has unsaved changes. Close it?"
  }
}
```

---

## 8.5 result.json

### zh-CN

```json
{
  "title": "结果",
  "tabs": {
    "results": "结果",
    "messages": "消息",
    "problems": "问题",
    "history": "查询历史"
  },
  "toolbar": {
    "copyCell": "复制单元格",
    "copyRow": "复制行",
    "copyAll": "复制全部",
    "exportCsv": "导出 CSV",
    "exportJson": "导出 JSON",
    "clear": "清空"
  },
  "status": {
    "running": "查询执行中...",
    "success": "查询成功",
    "error": "查询失败",
    "cancelled": "已取消",
    "truncated": "结果已截断"
  },
  "summary": {
    "rowsColumns": "{{rows}} 行 × {{columns}} 列",
    "elapsed": "耗时 {{elapsed}}ms",
    "affectedRows": "影响 {{count}} 行"
  },
  "cell": {
    "null": "NULL",
    "binary": "<二进制 {{size}} 字节>"
  },
  "empty": {
    "title": "暂无查询结果",
    "description": "执行 SQL 后结果会显示在这里。"
  },
  "error": {
    "queryFailed": "查询失败",
    "sql": "SQL",
    "elapsed": "耗时"
  },
  "history": {
    "empty": "暂无查询历史",
    "clear": "清空历史"
  }
}
```

### en-US

```json
{
  "title": "Results",
  "tabs": {
    "results": "Results",
    "messages": "Messages",
    "problems": "Problems",
    "history": "Query History"
  },
  "toolbar": {
    "copyCell": "Copy Cell",
    "copyRow": "Copy Row",
    "copyAll": "Copy All",
    "exportCsv": "Export CSV",
    "exportJson": "Export JSON",
    "clear": "Clear"
  },
  "status": {
    "running": "Running query...",
    "success": "Query succeeded",
    "error": "Query failed",
    "cancelled": "Cancelled",
    "truncated": "Result truncated"
  },
  "summary": {
    "rowsColumns": "{{rows}} rows × {{columns}} columns",
    "elapsed": "{{elapsed}}ms",
    "affectedRows": "{{count}} affected"
  },
  "cell": {
    "null": "NULL",
    "binary": "<binary {{size}} bytes>"
  },
  "empty": {
    "title": "No results",
    "description": "Query results will appear here."
  },
  "error": {
    "queryFailed": "Query failed",
    "sql": "SQL",
    "elapsed": "Elapsed"
  },
  "history": {
    "empty": "No query history",
    "clear": "Clear History"
  }
}
```

---

## 8.6 extension.json

### zh-CN

```json
{
  "title": "插件",
  "installed": "已安装",
  "marketplace": "插件市场",
  "development": "开发者",
  "reloadHost": "重载插件宿主",
  "loadFromFolder": "从文件夹加载插件",
  "enable": "启用插件",
  "disable": "禁用插件",
  "uninstall": "卸载插件",
  "permissions": "权限",
  "contributions": "贡献点",
  "activationEvents": "激活事件",
  "logs": "插件日志",
  "message": {
    "installSuccess": "插件安装成功",
    "uninstallConfirm": "确定要卸载插件「{{name}}」吗？",
    "permissionRequired": "插件需要以下权限：",
    "hostReloaded": "插件宿主已重载"
  },
  "permission": {
    "editor.read": "读取编辑器内容",
    "editor.write": "修改编辑器内容",
    "storage.local": "使用本地插件存储",
    "ui.notification": "显示通知",
    "db.connection.read": "读取数据库连接信息",
    "db.schema.read": "读取数据库结构",
    "db.query.read": "执行只读查询",
    "db.query.write": "执行写入查询"
  }
}
```

### en-US

```json
{
  "title": "Extensions",
  "installed": "Installed",
  "marketplace": "Marketplace",
  "development": "Development",
  "reloadHost": "Reload Extension Host",
  "loadFromFolder": "Load from Folder",
  "enable": "Enable Extension",
  "disable": "Disable Extension",
  "uninstall": "Uninstall Extension",
  "permissions": "Permissions",
  "contributions": "Contributions",
  "activationEvents": "Activation Events",
  "logs": "Extension Logs",
  "message": {
    "installSuccess": "Extension installed",
    "uninstallConfirm": "Uninstall extension \"{{name}}\"?",
    "permissionRequired": "This extension requires the following permissions:",
    "hostReloaded": "Extension host reloaded"
  },
  "permission": {
    "editor.read": "Read editor content",
    "editor.write": "Modify editor content",
    "storage.local": "Use local extension storage",
    "ui.notification": "Show notifications",
    "db.connection.read": "Read database connection info",
    "db.schema.read": "Read database schema",
    "db.query.read": "Execute read-only queries",
    "db.query.write": "Execute write queries"
  }
}
```

---

## 8.7 settings.json

### zh-CN

```json
{
  "title": "设置",
  "language": {
    "title": "语言",
    "description": "选择应用显示语言",
    "system": "跟随系统",
    "restartHint": "语言切换会立即生效。"
  },
  "appearance": {
    "title": "外观",
    "theme": "主题",
    "dark": "深色",
    "light": "浅色",
    "system": "跟随系统"
  }
}
```

### en-US

```json
{
  "title": "Settings",
  "language": {
    "title": "Language",
    "description": "Choose the display language",
    "system": "System",
    "restartHint": "Language changes take effect immediately."
  },
  "appearance": {
    "title": "Appearance",
    "theme": "Theme",
    "dark": "Dark",
    "light": "Light",
    "system": "System"
  }
}
```

---

# 9. 初始化 i18n

```ts
// apps/desktop/src/i18n/initI18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, namespaces, type SupportedLanguage } from '@sqlgui/i18n';
import { detectInitialLanguage } from './detectLanguage';

export async function initI18n() {
  const lng = detectInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en-US',
    supportedLngs: ['zh-CN', 'en-US'],
    ns: namespaces,
    defaultNS: 'common',

    interpolation: {
      escapeValue: false,
    },

    returnNull: false,
    returnEmptyString: false,

    react: {
      useSuspense: false,
    },
  });

  return i18n;
}

export async function changeLanguage(language: SupportedLanguage) {
  await i18n.changeLanguage(language);
}
```

```ts
// apps/desktop/src/i18n/index.ts

export { initI18n, changeLanguage } from './initI18n';
export { useAppTranslation } from './useAppTranslation';
export { languageService } from './languageService';
```

---

# 10. 检测初始语言

优先级：

```txt
1. 用户手动设置
2. 系统语言
3. fallback en-US
```

```ts
// apps/desktop/src/i18n/detectLanguage.ts

import { supportedLanguages, type SupportedLanguage } from '@sqlgui/i18n';

const STORAGE_KEY = 'sqlgui.language';

export function detectInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (isSupportedLanguage(saved)) {
    return saved;
  }

  const browserLanguage = navigator.language;

  if (isSupportedLanguage(browserLanguage)) {
    return browserLanguage;
  }

  if (browserLanguage.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en-US';
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && supportedLanguages.includes(value as SupportedLanguage);
}

export function saveLanguage(language: SupportedLanguage) {
  localStorage.setItem(STORAGE_KEY, language);
}
```

---

# 11. languageStore

```ts
// apps/desktop/src/i18n/languageStore.ts

import { create } from 'zustand';
import type { SupportedLanguage } from '@sqlgui/i18n';
import { detectInitialLanguage } from './detectLanguage';

interface LanguageStore {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: detectInitialLanguage(),

  setLanguage: (language) =>
    set({
      language,
    }),
}));
```

---

# 12. languageService

```ts
// apps/desktop/src/i18n/languageService.ts

import type { SupportedLanguage } from '@sqlgui/i18n';
import { changeLanguage } from './initI18n';
import { saveLanguage } from './detectLanguage';
import { useLanguageStore } from './languageStore';

export const languageService = {
  getCurrentLanguage() {
    return useLanguageStore.getState().language;
  },

  async setLanguage(language: SupportedLanguage) {
    await changeLanguage(language);
    saveLanguage(language);
    useLanguageStore.getState().setLanguage(language);
  },
};
```

---

# 13. useAppTranslation

封一层 Hook，后面方便统一增强。

```ts
// apps/desktop/src/i18n/useAppTranslation.ts

import { useTranslation } from 'react-i18next';
import type { I18nNamespace } from '@sqlgui/i18n';

export function useAppTranslation(namespace?: I18nNamespace) {
  return useTranslation(namespace);
}
```

使用：

```tsx
import { useAppTranslation } from '@/i18n';

export function EmptyEditorState() {
  const { t } = useAppTranslation('editor');

  return (
    <div>
      <h2>{t('empty.title')}</h2>
      <p>{t('empty.description')}</p>
    </div>
  );
}
```

---

# 14. main.tsx 启动改造

```tsx
// apps/desktop/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initI18n } from './i18n';
import './styles.css';

async function bootstrap() {
  await initI18n();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
```

---

# 15. 设置页：语言切换 UI

## 15.1 LanguageSettings

```tsx
// apps/desktop/src/workbench/settings/components/LanguageSettings.tsx

import { languageOptions, type SupportedLanguage } from '@sqlgui/i18n';
import { useLanguageStore } from '@/i18n/languageStore';
import { languageService } from '@/i18n/languageService';
import { useAppTranslation } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSettings() {
  const { t } = useAppTranslation('settings');
  const language = useLanguageStore((state) => state.language);

  async function handleChange(value: string) {
    await languageService.setLanguage(value as SupportedLanguage);
  }

  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{t('language.title')}</div>
        <div className="text-xs text-muted-foreground">{t('language.description')}</div>
      </div>

      <Select value={language} onValueChange={handleChange}>
        <SelectTrigger className="w-64">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {languageOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="text-xs text-muted-foreground">{t('language.restartHint')}</div>
    </div>
  );
}
```

## 15.2 SettingsView

```tsx
// apps/desktop/src/workbench/settings/components/SettingsView.tsx

import { useAppTranslation } from '@/i18n';
import { LanguageSettings } from './LanguageSettings';

export function SettingsView() {
  const { t } = useAppTranslation('settings');

  return (
    <div className="h-full overflow-auto p-4">
      <h1 className="mb-4 text-lg font-semibold">{t('title')}</h1>

      <div className="space-y-6">
        <LanguageSettings />
      </div>
    </div>
  );
}
```

---

# 16. 改造现有组件

Phase 7 要把 Phase 1-6 的硬编码改掉。

## 16.1 ConnectionView 改造

改造前：

```tsx
<div>Connections</div>
<Button>Test Connection</Button>
```

改造后：

```tsx
import { useAppTranslation } from '@/i18n';

export function ConnectionView() {
  const { t } = useAppTranslation('connection');
  const { t: tc } = useAppTranslation('common');

  return (
    <div>
      <div>{t('title')}</div>
      <Button>{t('testConnection')}</Button>
      <Button>{tc('actions.refresh')}</Button>
    </div>
  );
}
```

## 16.2 ResultToolbar 改造

```tsx
export function ResultToolbar(props: ResultToolbarProps) {
  const { t } = useAppTranslation('result');
  const { t: tc } = useAppTranslation('common');

  return (
    <div>
      <Button>{t('toolbar.copyCell')}</Button>

      <Button>{t('toolbar.exportCsv')}</Button>

      <Button>{tc('actions.clear')}</Button>
    </div>
  );
}
```

## 16.3 Editor 空状态改造

```tsx
export function EmptyEditorState() {
  const { t } = useAppTranslation('editor');

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="font-medium">{t('empty.title')}</div>

      <div className="text-sm text-muted-foreground">{t('empty.description')}</div>
    </div>
  );
}
```

---

# 17. 错误码 i18n 设计

Rust 端不要直接返回给用户看的中文/英文文本。
更推荐：

```txt
Rust 返回 error code + default message
前端根据 code 翻译
```

## 17.1 Rust 错误类型

```rust
// crates/sqlgui-db/src/error.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbErrorPayload {
    pub code: String,
    pub message: String,
    pub detail: Option<String>,
}

impl DbErrorPayload {
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            detail: None,
        }
    }
}
```

Tauri command 先返回 JSON string 或结构化错误。
MVP 简化可以返回：

```rust
Result<T, DbErrorPayload>
```

但 Tauri command error 类型通常要能序列化，设计成：

```rust
#[tauri::command]
pub async fn db_test_connection(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> Result<(), DbErrorPayload> {
    state
        .db
        .test_connection(config)
        .await
        .map_err(map_db_error)
}
```

## 17.2 错误码设计

```txt
connection.refused
connection.timeout
connection.authFailed
connection.databaseNotFound
connection.fileNotFound
query.syntaxError
query.timeout
query.cancelled
query.permissionDenied
db.unsupported
unknown
```

## 17.3 error.json

### zh-CN

```json
{
  "connection": {
    "refused": "连接被拒绝，请检查主机和端口。",
    "timeout": "连接超时，请检查网络或数据库状态。",
    "authFailed": "认证失败，请检查用户名或密码。",
    "databaseNotFound": "数据库不存在。",
    "fileNotFound": "数据库文件不存在。",
    "notOpened": "连接尚未打开。"
  },
  "query": {
    "syntaxError": "SQL 语法错误。",
    "timeout": "查询超时。",
    "cancelled": "查询已取消。",
    "permissionDenied": "没有执行此查询的权限。"
  },
  "db": {
    "unsupported": "暂不支持该数据库类型。"
  },
  "unknown": "未知错误：{{message}}"
}
```

### en-US

```json
{
  "connection": {
    "refused": "Connection refused. Please check host and port.",
    "timeout": "Connection timed out. Please check your network or database status.",
    "authFailed": "Authentication failed. Please check username or password.",
    "databaseNotFound": "Database not found.",
    "fileNotFound": "Database file not found.",
    "notOpened": "Connection is not opened."
  },
  "query": {
    "syntaxError": "SQL syntax error.",
    "timeout": "Query timed out.",
    "cancelled": "Query cancelled.",
    "permissionDenied": "Permission denied for this query."
  },
  "db": {
    "unsupported": "Unsupported database type."
  },
  "unknown": "Unknown error: {{message}}"
}
```

## 17.4 前端错误翻译工具

```ts
// apps/desktop/src/i18n/errorTranslator.ts

import i18n from 'i18next';

export interface NativeErrorPayload {
  code?: string;
  message?: string;
  detail?: string;
}

export function translateError(error: unknown): string {
  const payload = normalizeErrorPayload(error);

  if (!payload.code) {
    return (
      payload.message ||
      i18n.t('error:unknown', {
        message: String(error),
      })
    );
  }

  const translated = i18n.t(`error:${payload.code}`, {
    defaultValue: '',
    message: payload.message,
    detail: payload.detail,
  });

  if (translated) {
    return translated;
  }

  return i18n.t('error:unknown', {
    message: payload.message || payload.code,
  });
}

function normalizeErrorPayload(error: unknown): NativeErrorPayload {
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (typeof error === 'string') {
    try {
      return JSON.parse(error);
    } catch {
      return {
        message: error,
      };
    }
  }

  if (typeof error === 'object' && error !== null) {
    return error as NativeErrorPayload;
  }

  return {
    message: String(error),
  };
}
```

使用：

```ts
try {
  await connectionService.testConnection(profile);
} catch (error) {
  setError(translateError(error));
}
```

---

# 18. 日期、数字格式化

i18n 不只是文案，也包括格式。

## 18.1 format 工具

```ts
// packages/i18n/src/utils/format.ts

import type { SupportedLanguage } from '../types';

export function formatDateTime(value: number | Date, language: SupportedLanguage) {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value);
}

export function formatNumber(value: number, language: SupportedLanguage) {
  return new Intl.NumberFormat(language).format(value);
}

export function formatDurationMs(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}
```

## 18.2 应用侧封装

```ts
// apps/desktop/src/i18n/formatService.ts

import { formatDateTime, formatNumber, type SupportedLanguage } from '@sqlgui/i18n';
import { languageService } from './languageService';

export const formatService = {
  dateTime(value: number | Date) {
    return formatDateTime(value, languageService.getCurrentLanguage());
  },

  number(value: number) {
    return formatNumber(value, languageService.getCurrentLanguage());
  },
};
```

用于查询历史：

```tsx
{
  formatService.dateTime(item.createdAt);
}
```

---

# 19. 命令系统的 i18n

CommandService 里的命令不要写死 title，而是保存 `titleKey`。

## 19.1 命令类型改造

```ts
// apps/desktop/src/services/commandService.ts

export interface Command {
  id: string;
  title?: string;
  titleKey?: string;
  category?: string;
  categoryKey?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}
```

注册命令：

```ts
commandService.register({
  id: 'editor.newQuery',
  titleKey: 'editor:newQuery',
  categoryKey: 'editor:title',
  source: 'core',
  handler: async () => {
    editorService.newQuery();
  },
});
```

Command Palette 展示：

```tsx
import i18n from 'i18next';

function getCommandTitle(command: Command) {
  if (command.titleKey) {
    return i18n.t(command.titleKey);
  }

  return command.title ?? command.id;
}
```

---

# 20. 菜单系统的 i18n

MenuItem 也不要写死文本。

```ts
export interface MenuItem {
  command: string;
  title?: string;
  titleKey?: string;
  when?: string;
  group?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}
```

插件贡献菜单时：

```json
{
  "command": "sql.format",
  "title": "Format SQL"
}
```

核心菜单用：

```ts
{
  command: 'connection.refresh',
  titleKey: 'connection:contextMenu.refresh'
}
```

插件菜单的多语言后面由插件自己的语言包解决。

---

# 21. 插件 i18n 预留设计

Phase 7 只预留，不完整实现。

插件 manifest 后续可以这样：

```json
{
  "name": "sql-formatter",
  "displayName": "%displayName%",
  "description": "%description%",
  "main": "dist/extension.js",
  "locales": {
    "zh-CN": "locales/zh-CN.json",
    "en-US": "locales/en-US.json"
  },
  "contributes": {
    "commands": [
      {
        "command": "sql.format",
        "title": "%commands.format.title%"
      }
    ]
  }
}
```

插件语言包：

```json
{
  "displayName": "SQL 格式化器",
  "description": "格式化 SQL 语句",
  "commands.format.title": "格式化 SQL"
}
```

## 21.1 pluginI18nRegistry

```ts
// apps/desktop/src/i18n/pluginI18nRegistry.ts

import i18n from 'i18next';
import type { SupportedLanguage } from '@sqlgui/i18n';

export const pluginI18nRegistry = {
  registerPluginResources(
    extensionId: string,
    language: SupportedLanguage,
    resources: Record<string, string>,
  ) {
    const namespace = createPluginNamespace(extensionId);

    i18n.addResourceBundle(language, namespace, resources, true, true);
  },

  translatePluginText(extensionId: string, text: string) {
    if (!isI18nPlaceholder(text)) {
      return text;
    }

    const key = text.slice(1, -1);
    const namespace = createPluginNamespace(extensionId);

    return i18n.t(`${namespace}:${key}`, {
      defaultValue: key,
    });
  },
};

function createPluginNamespace(extensionId: string) {
  return `plugin.${extensionId}`;
}

function isI18nPlaceholder(value: string) {
  return value.startsWith('%') && value.endsWith('%');
}
```

Phase 8/9 插件系统做 manifest loader 时再接入。

---

# 22. 插件 API 预留

后续插件可以通过 API 拿翻译：

```ts
export interface I18nApi {
  t(key: string, params?: Record<string, unknown>): string;
  language: string;
}
```

插件运行时：

```ts
api.i18n.t('commands.format.title');
```

不过 MVP 插件可以先不开放，先只处理 manifest 文案。

---

# 23. i18n Lint / Key 检查

i18n 最容易烂的地方是 key 不一致。
Phase 7 可以先做一个简单脚本：

```txt
scripts/check-i18n.ts
```

检查：

```txt
1. zh-CN 和 en-US namespace 文件是否一致
2. key 是否一致
3. 是否有空字符串
4. 是否有重复 namespace
```

## 23.1 check-i18n 脚本草案

```ts
// scripts/check-i18n.ts

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'packages/i18n/src/locales');

const languages = ['zh-CN', 'en-US'];
const namespaces = [
  'common',
  'workbench',
  'connection',
  'editor',
  'result',
  'extension',
  'marketplace',
  'settings',
  'error',
];

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, item] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (item && typeof item === 'object' && !Array.isArray(item)) {
      keys.push(...flatten(item as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function readJson(language: string, namespace: string) {
  const file = path.join(root, language, `${namespace}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

let hasError = false;

for (const namespace of namespaces) {
  const base = flatten(readJson('zh-CN', namespace)).sort();

  for (const language of languages) {
    const current = flatten(readJson(language, namespace)).sort();

    const missing = base.filter((key) => !current.includes(key));
    const extra = current.filter((key) => !base.includes(key));

    if (missing.length || extra.length) {
      hasError = true;

      console.error(`\n[${language}/${namespace}] mismatch`);

      if (missing.length) {
        console.error('Missing:', missing);
      }

      if (extra.length) {
        console.error('Extra:', extra);
      }
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log('i18n resources are valid.');
```

`package.json` 加脚本：

```json
{
  "scripts": {
    "check:i18n": "tsx scripts/check-i18n.ts"
  }
}
```

---

# 24. TypeScript 类型增强

想更进一步，可以给 key 做类型化，但 MVP 不强制。
先保留普通 `t('xxx')`。

如果后续想做类型安全 i18n，可以：

```txt
1. 从 zh-CN JSON 生成 key union
2. 封装 typedT
3. ESLint 检查不存在的 key
```

MVP 不建议做太重。

---

# 25. 现有 Phase 1-6 文案替换清单

## 25.1 Workbench

```txt
[ ] ActivityBar: Connections
[ ] ActivityBar: Extensions
[ ] ActivityBar: Settings
[ ] Panel: Results
[ ] Panel: Messages
[ ] Panel: Problems
[ ] CommandPalette placeholder
[ ] Empty State
```

## 25.2 Connection

```txt
[ ] ConnectionView 标题
[ ] New Connection
[ ] Test Connection
[ ] Save
[ ] Delete Confirm
[ ] ConnectionForm 字段
[ ] ConnectionTree Tables / Columns
[ ] ContextMenu Select Top 1000
[ ] 连接状态 connected / disconnected
[ ] 错误提示
```

## 25.3 Editor

```txt
[ ] New Query
[ ] Untitled.sql
[ ] Run
[ ] Save
[ ] No connection
[ ] Empty Editor
[ ] Dangerous SQL Confirm
[ ] Unsaved Close Confirm
```

## 25.4 Result

```txt
[ ] Result Tabs
[ ] Toolbar 文案
[ ] NULL 显示
[ ] Running query
[ ] Query failed
[ ] Rows summary
[ ] Export CSV / JSON
[ ] Query History
```

## 25.5 Extension / Marketplace

```txt
[ ] Installed Extensions
[ ] Marketplace
[ ] Install
[ ] Uninstall
[ ] Permissions
[ ] Activation Events
[ ] Load From Folder
[ ] Reload Extension Host
```

---

# 26. UI 示例改造

## 26.1 ResultToolbar 完整改造

```tsx
import { useAppTranslation } from '@/i18n';

export function ResultToolbar(props: ResultToolbarProps) {
  const { query } = props;
  const result = query.result;

  const { t } = useAppTranslation('result');

  if (!result) return null;

  return (
    <div className="flex h-9 items-center gap-1 border-b px-2 text-xs">
      <Button size="sm" variant="ghost" onClick={() => resultCopyService.copySelectedCell(query)}>
        {t('toolbar.copyCell')}
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultCopyService.copySelectedRow(query)}>
        {t('toolbar.copyRow')}
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultExportService.exportCsv(query)}>
        {t('toolbar.exportCsv')}
      </Button>

      <div className="ml-auto flex items-center gap-3 text-muted-foreground">
        {result.truncated ? <span className="text-yellow-600">{t('status.truncated')}</span> : null}

        <span>
          {t('summary.rowsColumns', {
            rows: result.rows.length,
            columns: result.columns.length,
          })}
        </span>

        <span>
          {t('summary.elapsed', {
            elapsed: query.elapsedMs ?? result.elapsedMs,
          })}
        </span>
      </div>
    </div>
  );
}
```

---

## 26.2 ConnectionDialog 改造

```tsx
export function ConnectionDialog(props: ConnectionDialogProps) {
  const { t } = useAppTranslation('connection');
  const { t: tc } = useAppTranslation('common');

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {props.mode === 'edit' ? t('editConnection') : t('newConnection')}
          </DialogTitle>
        </DialogHeader>

        <ConnectionForm value={value} onChange={setValue} />

        <DialogFooter>
          <Button variant="outline" onClick={handleTest}>
            {t('testConnection')}
          </Button>

          <Button onClick={handleSave}>{tc('actions.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 27. Command Palette 改造

```tsx
export function CommandPalette() {
  const { t } = useAppTranslation('workbench');

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('commandPalette.placeholder')} />

      <CommandEmpty>{t('commandPalette.noCommands')}</CommandEmpty>

      <CommandList>
        {commands.map((command) => (
          <CommandItem key={command.id}>{getCommandTitle(command)}</CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

---

# 28. 与 Rust 的边界

建议：

```txt
Rust 只返回稳定 error code
前端负责翻译和展示
```

Rust 不应该关心当前语言。
原因：

```txt
1. 前端语言可以实时切换
2. 插件语言也在前端加载
3. Rust 端只负责稳定语义
4. 错误码比文本更适合测试
```

但是某些系统级错误可能只能拿到英文 message，保留 `message` 作为 fallback。

---

# 29. Phase 7 开发顺序

推荐顺序：

```txt
1. 创建 packages/i18n
2. 定义 supportedLanguages / namespaces
3. 创建 zh-CN / en-US JSON
4. apps/desktop 接入 initI18n
5. 实现 detectInitialLanguage
6. 实现 languageStore / languageService
7. 实现 SettingsView / LanguageSettings
8. 改造 Workbench 文案
9. 改造 Connection 文案
10. 改造 Editor 文案
11. 改造 Result 文案
12. 改造 Extension / Marketplace 占位文案
13. 实现 errorTranslator
14. 改造 connectionService / sqlExecutionService 错误显示
15. 实现 i18n key 检查脚本
16. 为插件系统预留 pluginI18nRegistry
17. 手动切换语言验收
```

---

# 30. 测试用例

## 30.1 单元测试

```txt
[ ] detectInitialLanguage 能读取 localStorage
[ ] detectInitialLanguage 能识别 zh
[ ] detectInitialLanguage fallback 到 en-US
[ ] languageService.setLanguage 能切换语言
[ ] translateError 能根据 code 返回文案
[ ] translateError unknown 能 fallback
[ ] check-i18n 能发现缺失 key
```

## 30.2 手动测试

```txt
[ ] 首次打开跟随浏览器/系统语言
[ ] 设置页能切换到 English
[ ] 设置页能切换到 简体中文
[ ] 刷新应用后语言保持
[ ] ConnectionView 文案切换正常
[ ] Editor 文案切换正常
[ ] ResultPanel 文案切换正常
[ ] Command Palette 命令标题切换正常
[ ] 错误提示能切换语言
[ ] 查询历史日期格式正常
```

---

# 31. Phase 7 完成标准

做到下面这些就算完成：

```txt
[ ] packages/i18n 存在并导出 resources
[ ] apps/desktop 初始化 i18n
[ ] 支持 zh-CN / en-US
[ ] 支持设置页切换语言
[ ] 语言选择持久化
[ ] common/workbench/connection/editor/result/extension/marketplace/settings/error namespace 完成
[ ] Phase 1-6 核心 UI 文案已移除硬编码
[ ] CommandService 支持 titleKey
[ ] MenuService 支持 titleKey
[ ] 错误码可以映射为当前语言文案
[ ] i18n key 检查脚本可运行
[ ] 插件 i18n 注册接口预留
```

---

# 32. 最小闭环

Phase 7 的最小闭环是：

```txt
打开应用
  ↓
默认中文
  ↓
进入 Settings
  ↓
切换 English
  ↓
Connection / Editor / Result 文案变英文
  ↓
刷新应用
  ↓
仍然是 English
```

第二个闭环：

```txt
数据库连接失败
  ↓
Rust 返回 code: connection.refused
  ↓
前端显示：
中文：连接被拒绝，请检查主机和端口。
英文：Connection refused. Please check host and port.
```

第三个闭环：

```txt
Command Palette
  ↓
editor.newQuery 命令
  ↓
中文显示：新建查询
英文显示：New Query
```

---

# 33. 关键注意点

## 33.1 不要在组件里拼接硬编码

不要这样：

```tsx
<span>
  {rows} 行 × {columns} 列
</span>
```

应该：

```tsx
t('summary.rowsColumns', { rows, columns });
```

---

## 33.2 不要把 Rust 错误直接展示给用户

不要这样：

```ts
setError(String(error));
```

应该：

```ts
setError(translateError(error));
```

---

## 33.3 不要让插件文案污染核心 namespace

插件 namespace 应该独立：

```txt
plugin.publisher.name
```

不要把插件文案塞进核心 `extension.json`。

---

## 33.4 不要过早做复杂类型安全 i18n

第一版重点是结构清晰、key 完整。
类型安全 key 可以后面加。

---

# 34. Phase 7 最终定位

Phase 7 的核心价值是：

> **让 SQL GUI 从“个人玩具项目”变成“可产品化项目”。**

尤其你后面要做插件市场，i18n 很关键：

```txt
核心应用文案
插件 manifest 文案
插件权限文案
插件市场文案
数据库错误文案
查询结果文案
设置页文案
```

如果 Phase 7 做得好，后面 Phase 8/9 插件系统就可以自然支持：

```txt
插件贡献命令的多语言标题
插件市场多语言描述
权限说明多语言展示
错误提示统一翻译
```

所以这一阶段不要偷懒，目标不是“翻译几个按钮”，而是建立：

```txt
namespace 规范
语言包结构
错误码翻译
命令/菜单 titleKey
插件语言包注册边界
i18n key 检查机制
```

这套做完，后面整个 SQL GUI 的可维护性会高很多。
