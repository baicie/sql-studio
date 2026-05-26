下面是 **Phase 8：插件 Manifest + Contribution Registry 详细设计与代码草案**。

这一阶段目标是：

> **先建立“插件声明系统”。插件暂时不需要真正运行 JS 代码，但宿主必须能读取插件 manifest、校验 manifest、注册插件贡献的命令/菜单/快捷键/视图占位，并在 UI 里展示已加载插件。**

也就是先做 VS Code 插件系统里最核心的第一层：

```txt
插件包
  ↓
sqlgui.extension.json
  ↓
Manifest Loader
  ↓
Contribution Registry
  ↓
CommandService / MenuService / KeybindingService
  ↓
Workbench UI 可感知插件贡献
```

---

# Phase 8 总目标

Phase 8 做完以后，你应该能做到：

```txt
[ ] 本地放一个插件目录
[ ] 插件目录里有 sqlgui.extension.json
[ ] 应用启动时扫描插件目录
[ ] 读取并校验 manifest
[ ] 注册插件贡献的 commands
[ ] 注册插件贡献的 menus
[ ] 注册插件贡献的 keybindings
[ ] 在插件页面看到已加载插件
[ ] 在 Command Palette 里看到插件贡献的命令
[ ] 菜单系统能读到插件贡献菜单
[ ] 插件可以被 enable / disable
[ ] disable 后贡献点被移除
```

暂时不做：

```txt
[ ] 不运行插件 extension.js
[ ] 不实现 Web Worker Plugin Host
[ ] 不实现插件 API
[ ] 不实现权限弹窗
[ ] 不实现真正插件市场
[ ] 不实现插件签名
[ ] 不实现 WASM / Native 插件
```

Phase 8 的定位是：

> **插件系统元数据层。**

---

# 1. 阶段边界

Phase 8 只处理“声明”，不处理“执行”。

插件 manifest 里可以声明：

```json
{
  "contributes": {
    "commands": [
      {
        "command": "sql.format",
        "title": "Format SQL"
      }
    ]
  }
}
```

Phase 8 做的是：

```txt
Command Palette 里出现 Format SQL
```

但点击后暂时可以：

```txt
提示：Extension host is not implemented yet.
```

真正执行插件逻辑放到后面的 Phase 10：Plugin Host。

---

# 2. 核心架构

```txt
extensions/
└─ sql-formatter-demo/
   ├─ sqlgui.extension.json
   └─ dist/extension.js

应用启动
  ↓
ExtensionScanner
  ↓
ManifestLoader
  ↓
ManifestValidator
  ↓
ExtensionRegistry
  ↓
ContributionRegistry
  ↓
CommandService / MenuService / KeybindingService
  ↓
Workbench
```

模块关系：

```txt
┌──────────────────────────────────────┐
│ ExtensionScanner                     │
│ 扫描本地插件目录                      │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│ ManifestLoader                       │
│ 读取 sqlgui.extension.json            │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│ ManifestValidator                    │
│ 校验字段、版本、贡献点、权限            │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│ ExtensionRegistry                    │
│ 保存插件元数据、状态、路径              │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│ ContributionRegistry                 │
│ 注册/卸载 commands、menus、keybindings │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│ Core Services                        │
│ Command/Menu/Keybinding/View          │
└──────────────────────────────────────┘
```

---

# 3. 目录设计

## 3.1 前端目录

```txt
apps/desktop/src/plugins/
├─ manifest/
│  ├─ types.ts
│  ├─ manifestLoader.ts
│  ├─ manifestValidator.ts
│  └─ manifestNormalize.ts
│
├─ registry/
│  ├─ extensionRegistry.ts
│  ├─ contributionRegistry.ts
│  ├─ commandContribution.ts
│  ├─ menuContribution.ts
│  ├─ keybindingContribution.ts
│  └─ viewContribution.ts
│
├─ services/
│  ├─ extensionService.ts
│  ├─ extensionScanner.ts
│  └─ extensionStorage.ts
│
├─ components/
│  ├─ InstalledExtensionsView.tsx
│  ├─ ExtensionListItem.tsx
│  ├─ ExtensionDetailView.tsx
│  └─ ExtensionContributionsView.tsx
│
└─ index.ts
```

## 3.2 共享包

```txt
packages/
├─ extension-schema/
│  ├─ package.json
│  ├─ src/
│  │  ├─ schema.ts
│  │  ├─ manifest.schema.json
│  │  └─ index.ts
│  └─ tsconfig.json
│
└─ sqlgui-api/
   └─ src/
      └─ extensionManifest.ts
```

## 3.3 Rust 目录

Phase 8 可以先不强依赖 Rust 扫描目录，但为了后续正式化，建议 Rust 提供本地扩展目录读写能力：

```txt
apps/desktop/src-tauri/src/commands/
└─ extension.rs

crates/sqlgui-extension/src/
├─ lib.rs
├─ types.rs
├─ scanner.rs
├─ manifest.rs
└─ storage.rs
```

---

# 4. 插件目录规范

本地开发阶段支持两种目录：

```txt
项目内置开发插件：
extensions/*

用户本地插件：
~/.sqlgui/extensions/*
```

示例：

```txt
extensions/
└─ sql-formatter-demo/
   ├─ sqlgui.extension.json
   ├─ package.json
   ├─ dist/
   │  └─ extension.js
   └─ README.md
```

---

# 5. Manifest 设计

## 5.1 最小插件 manifest

```json
{
  "name": "sql-formatter-demo",
  "displayName": "SQL Formatter Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "description": "Format SQL in editor.",
  "main": "dist/extension.js",
  "engines": {
    "sqlgui": "^0.1.0"
  },
  "activationEvents": ["onCommand:sql.format"],
  "permissions": ["editor.read", "editor.write"],
  "contributes": {
    "commands": [
      {
        "command": "sql.format",
        "title": "Format SQL",
        "category": "SQL"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "sql.format",
          "when": "editorLang == sql",
          "group": "navigation"
        }
      ]
    },
    "keybindings": [
      {
        "command": "sql.format",
        "key": "mod+shift+f",
        "when": "editorLang == sql"
      }
    ]
  }
}
```

---

# 6. Manifest 类型设计

```ts
// packages/sqlgui-api/src/extensionManifest.ts

export type ExtensionActivationEvent =
  | '*'
  | 'onStartupFinished'
  | `onCommand:${string}`
  | `onView:${string}`
  | `onDbKind:${string}`
  | `onLanguage:${string}`;

export type ExtensionPermission =
  | 'editor.read'
  | 'editor.write'
  | 'storage.local'
  | 'ui.notification'
  | 'db.connection.read'
  | 'db.schema.read'
  | 'db.query.read'
  | 'db.query.write'
  | 'db.query.explain'
  | 'network.fetch'
  | 'clipboard.read'
  | 'clipboard.write';

export interface ExtensionManifest {
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  description?: string;

  main?: string;
  icon?: string;
  readme?: string;
  license?: string;

  engines?: {
    sqlgui?: string;
  };

  categories?: string[];

  activationEvents?: ExtensionActivationEvent[];

  permissions?: ExtensionPermission[];

  contributes?: ExtensionContributions;
}

export interface ExtensionContributions {
  commands?: CommandContribution[];
  menus?: Record<MenuLocation, MenuContribution[]>;
  keybindings?: KeybindingContribution[];
  views?: ViewContributionMap;
  snippets?: SnippetContribution[];
  themes?: ThemeContribution[];
  configuration?: ConfigurationContribution;
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export type MenuLocation =
  | 'commandPalette'
  | 'editor/title'
  | 'editor/context'
  | 'result/context'
  | 'connection/context'
  | 'connection/title'
  | 'view/title'
  | 'statusBar';

export interface MenuContribution {
  command: string;
  title?: string;
  when?: string;
  group?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  win?: string;
  linux?: string;
  when?: string;
}

export interface ViewContributionMap {
  activityBar?: ViewContribution[];
  sideBar?: ViewContribution[];
  panel?: ViewContribution[];
}

export interface ViewContribution {
  id: string;
  name: string;
  icon?: string;
  when?: string;
}

export interface SnippetContribution {
  language: 'sql';
  path: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  path: string;
  uiTheme?: 'dark' | 'light';
}

export interface ConfigurationContribution {
  title?: string;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  description?: string;
  enum?: unknown[];
}
```

---

# 7. Runtime Extension 类型

Manifest 是插件声明，加载进应用后需要转换成运行时结构。

```ts
// apps/desktop/src/plugins/manifest/types.ts

import type { ExtensionManifest } from '@sqlgui/api';

export type ExtensionState = 'enabled' | 'disabled' | 'error';

export interface LoadedExtension {
  id: string;
  name: string;
  publisher: string;
  displayName: string;
  version: string;
  description?: string;
  extensionPath: string;
  manifestPath: string;
  main?: string;
  icon?: string;
  manifest: ExtensionManifest;
  state: ExtensionState;
  error?: string;
  loadedAt: number;
}

export interface ExtensionLoadResult {
  extension?: LoadedExtension;
  error?: {
    path: string;
    message: string;
  };
}
```

插件 ID 规则：

```txt
publisher.name
```

例如：

```txt
baicie.sql-formatter-demo
```

---

# 8. Manifest 校验设计

校验分三层：

```txt
1. JSON 格式校验
2. 必填字段校验
3. 贡献点合法性校验
```

## 8.1 校验规则

```txt
[ ] name 必须存在
[ ] publisher 必须存在
[ ] version 必须存在
[ ] name 只能包含 a-z0-9-
[ ] publisher 只能包含 a-z0-9-
[ ] command ID 必须包含 namespace，例如 sql.format
[ ] menu command 必须在 contributes.commands 里声明
[ ] keybinding command 必须在 contributes.commands 里声明
[ ] permissions 必须属于允许列表
[ ] activationEvents 格式必须合法
[ ] main 文件可选，但如果存在必须是相对路径
```

---

## 8.2 Validator 代码草案

```ts
// apps/desktop/src/plugins/manifest/manifestValidator.ts

import type { ExtensionManifest, ExtensionPermission, MenuLocation } from '@sqlgui/api';

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const allowedPermissions = new Set<ExtensionPermission>([
  'editor.read',
  'editor.write',
  'storage.local',
  'ui.notification',
  'db.connection.read',
  'db.schema.read',
  'db.query.read',
  'db.query.write',
  'db.query.explain',
  'network.fetch',
  'clipboard.read',
  'clipboard.write',
]);

const allowedMenuLocations = new Set<MenuLocation>([
  'commandPalette',
  'editor/title',
  'editor/context',
  'result/context',
  'connection/context',
  'connection/title',
  'view/title',
  'statusBar',
]);

export function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(manifest)) {
    return {
      valid: false,
      errors: ['Manifest must be an object.'],
      warnings,
    };
  }

  const item = manifest as ExtensionManifest;

  validateRequiredString(item, 'name', errors);
  validateRequiredString(item, 'publisher', errors);
  validateRequiredString(item, 'version', errors);

  if (item.name && !/^[a-z0-9][a-z0-9-]*$/.test(item.name)) {
    errors.push('name must contain only lowercase letters, numbers and hyphen.');
  }

  if (item.publisher && !/^[a-z0-9][a-z0-9-]*$/.test(item.publisher)) {
    errors.push('publisher must contain only lowercase letters, numbers and hyphen.');
  }

  validateActivationEvents(item, errors, warnings);
  validatePermissions(item, errors);
  validateContributes(item, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateRequiredString(item: Record<string, unknown>, key: string, errors: string[]) {
  if (typeof item[key] !== 'string' || !item[key]) {
    errors.push(`${key} is required.`);
  }
}

function validateActivationEvents(
  manifest: ExtensionManifest,
  errors: string[],
  warnings: string[],
) {
  const events = manifest.activationEvents ?? [];

  for (const event of events) {
    if (event === '*') continue;
    if (event === 'onStartupFinished') continue;
    if (event.startsWith('onCommand:')) continue;
    if (event.startsWith('onView:')) continue;
    if (event.startsWith('onDbKind:')) continue;
    if (event.startsWith('onLanguage:')) continue;

    errors.push(`Invalid activation event: ${event}`);
  }

  if (!events.length && manifest.main) {
    warnings.push('Extension has main entry but no activationEvents. It may never activate.');
  }
}

function validatePermissions(manifest: ExtensionManifest, errors: string[]) {
  const permissions = manifest.permissions ?? [];

  for (const permission of permissions) {
    if (!allowedPermissions.has(permission)) {
      errors.push(`Invalid permission: ${permission}`);
    }
  }
}

function validateContributes(manifest: ExtensionManifest, errors: string[], warnings: string[]) {
  const contributes = manifest.contributes;
  if (!contributes) return;

  const commandIds = new Set(contributes.commands?.map((item) => item.command) ?? []);

  for (const command of contributes.commands ?? []) {
    if (!command.command.includes('.')) {
      errors.push(`Command "${command.command}" should be namespaced, e.g. "sql.format".`);
    }

    if (!command.title) {
      errors.push(`Command "${command.command}" requires title.`);
    }
  }

  for (const [location, items] of Object.entries(contributes.menus ?? {})) {
    if (!allowedMenuLocations.has(location as MenuLocation)) {
      errors.push(`Invalid menu location: ${location}`);
    }

    for (const item of items) {
      if (!commandIds.has(item.command)) {
        errors.push(`Menu command "${item.command}" is not declared in contributes.commands.`);
      }
    }
  }

  for (const keybinding of contributes.keybindings ?? []) {
    if (!commandIds.has(keybinding.command)) {
      errors.push(
        `Keybinding command "${keybinding.command}" is not declared in contributes.commands.`,
      );
    }

    if (!keybinding.key) {
      errors.push(`Keybinding for "${keybinding.command}" requires key.`);
    }
  }

  if (!contributes.commands?.length) {
    warnings.push('Extension contributes no commands.');
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

---

# 9. Manifest Loader

## 9.1 读取逻辑

Phase 8 可以先从项目内 `extensions/*` 加载。
Tauri 前端不能随意读文件，所以有两种方案：

### 方案 A：开发期 Vite import

适合最小 MVP：

```ts
import manifest from '../../../../extensions/sql-formatter-demo/sqlgui.extension.json';
```

缺点是不能动态扫描。

### 方案 B：Rust 扫描目录并返回 manifest

更适合真实应用。

我建议 Phase 8 用 **Rust 扫描**，因为后面插件市场安装也要落地到本地目录。

---

# 10. Rust Extension Scanner

## 10.1 Rust 类型

```rust
// crates/sqlgui-extension/src/types.rs

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionManifestFile {
    pub extension_path: String,
    pub manifest_path: String,
    pub manifest: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionScanResult {
    pub extensions: Vec<ExtensionManifestFile>,
    pub errors: Vec<ExtensionScanError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionScanError {
    pub path: String,
    pub message: String,
}
```

## 10.2 Scanner

```rust
// crates/sqlgui-extension/src/scanner.rs

use crate::types::*;
use anyhow::Result;
use std::fs;
use std::path::{Path, PathBuf};

const MANIFEST_FILE: &str = "sqlgui.extension.json";

pub fn scan_extensions(dirs: Vec<PathBuf>) -> Result<ExtensionScanResult> {
    let mut extensions = Vec::new();
    let mut errors = Vec::new();

    for dir in dirs {
        if !dir.exists() {
            continue;
        }

        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(err) => {
                errors.push(ExtensionScanError {
                    path: dir.to_string_lossy().to_string(),
                    message: err.to_string(),
                });
                continue;
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();

            if !path.is_dir() {
                continue;
            }

            let manifest_path = path.join(MANIFEST_FILE);

            if !manifest_path.exists() {
                continue;
            }

            match read_manifest(&path, &manifest_path) {
                Ok(item) => extensions.push(item),
                Err(err) => errors.push(ExtensionScanError {
                    path: path.to_string_lossy().to_string(),
                    message: err.to_string(),
                }),
            }
        }
    }

    Ok(ExtensionScanResult { extensions, errors })
}

fn read_manifest(
    extension_path: &Path,
    manifest_path: &Path,
) -> Result<ExtensionManifestFile> {
    let content = fs::read_to_string(manifest_path)?;
    let manifest = serde_json::from_str::<serde_json::Value>(&content)?;

    Ok(ExtensionManifestFile {
        extension_path: extension_path.to_string_lossy().to_string(),
        manifest_path: manifest_path.to_string_lossy().to_string(),
        manifest,
    })
}
```

## 10.3 Tauri Command

```rust
// apps/desktop/src-tauri/src/commands/extension.rs

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use sqlgui_extension::scanner::scan_extensions;
use sqlgui_extension::types::ExtensionScanResult;

#[tauri::command]
pub async fn extension_scan(app: AppHandle) -> Result<ExtensionScanResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?;

    let user_extensions_dir = app_data_dir.join("extensions");

    // 开发期项目内 extensions 目录可以通过环境变量传入
    let mut dirs = vec![user_extensions_dir];

    if let Ok(dev_extensions_dir) = std::env::var("SQLGUI_DEV_EXTENSIONS_DIR") {
        dirs.push(PathBuf::from(dev_extensions_dir));
    }

    scan_extensions(dirs).map_err(|err| err.to_string())
}
```

注册：

```rust
// apps/desktop/src-tauri/src/lib.rs

.invoke_handler(tauri::generate_handler![
    commands::extension::extension_scan,
])
```

---

# 11. 前端 Extension Scanner

```ts
// apps/desktop/src/plugins/services/extensionScanner.ts

import { callNative } from '@/services/native/invoke';

export interface NativeExtensionManifestFile {
  extensionPath: string;
  manifestPath: string;
  manifest: unknown;
}

export interface NativeExtensionScanResult {
  extensions: NativeExtensionManifestFile[];
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export const extensionScanner = {
  scan() {
    return callNative<NativeExtensionScanResult>('extension_scan');
  },
};
```

---

# 12. Manifest Normalize

```ts
// apps/desktop/src/plugins/manifest/manifestNormalize.ts

import type { ExtensionManifest } from '@sqlgui/api';
import type { LoadedExtension } from './types';

export function normalizeLoadedExtension(input: {
  extensionPath: string;
  manifestPath: string;
  manifest: ExtensionManifest;
}): LoadedExtension {
  const { manifest } = input;

  const id = `${manifest.publisher}.${manifest.name}`;

  return {
    id,
    name: manifest.name,
    publisher: manifest.publisher,
    displayName: manifest.displayName ?? manifest.name,
    version: manifest.version,
    description: manifest.description,
    extensionPath: input.extensionPath,
    manifestPath: input.manifestPath,
    main: manifest.main,
    icon: manifest.icon,
    manifest,
    state: 'enabled',
    loadedAt: Date.now(),
  };
}
```

---

# 13. Extension Registry

`ExtensionRegistry` 管理插件元数据和启用状态。

```ts
// apps/desktop/src/plugins/registry/extensionRegistry.ts

import type { LoadedExtension } from '../manifest/types';

type ExtensionListener = () => void;

class ExtensionRegistry {
  private extensions = new Map<string, LoadedExtension>();
  private listeners = new Set<ExtensionListener>();

  getAll() {
    return Array.from(this.extensions.values());
  }

  get(extensionId: string) {
    return this.extensions.get(extensionId);
  }

  has(extensionId: string) {
    return this.extensions.has(extensionId);
  }

  register(extension: LoadedExtension) {
    this.extensions.set(extension.id, extension);
    this.emit();
  }

  unregister(extensionId: string) {
    this.extensions.delete(extensionId);
    this.emit();
  }

  enable(extensionId: string) {
    const extension = this.extensions.get(extensionId);
    if (!extension) return;

    this.extensions.set(extensionId, {
      ...extension,
      state: 'enabled',
      error: undefined,
    });

    this.emit();
  }

  disable(extensionId: string) {
    const extension = this.extensions.get(extensionId);
    if (!extension) return;

    this.extensions.set(extensionId, {
      ...extension,
      state: 'disabled',
    });

    this.emit();
  }

  markError(extensionId: string, error: string) {
    const extension = this.extensions.get(extensionId);
    if (!extension) return;

    this.extensions.set(extensionId, {
      ...extension,
      state: 'error',
      error,
    });

    this.emit();
  }

  subscribe(listener: ExtensionListener) {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const extensionRegistry = new ExtensionRegistry();
```

---

# 14. Extension Store

Workbench UI 用 Zustand。

```ts
// apps/desktop/src/plugins/services/extensionStorage.ts

const STORAGE_KEY = 'sqlgui.extensions.state';

export interface ExtensionStateRecord {
  id: string;
  enabled: boolean;
}

export const extensionStorage = {
  load(): Record<string, ExtensionStateRecord> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  save(records: Record<string, ExtensionStateRecord>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  },

  isEnabled(extensionId: string) {
    const records = this.load();
    const record = records[extensionId];

    return record?.enabled ?? true;
  },

  setEnabled(extensionId: string, enabled: boolean) {
    const records = this.load();

    records[extensionId] = {
      id: extensionId,
      enabled,
    };

    this.save(records);
  },
};
```

```ts
// apps/desktop/src/plugins/services/extensionService.ts

import type { ExtensionManifest } from '@sqlgui/api';
import { extensionScanner } from './extensionScanner';
import { validateManifest } from '../manifest/manifestValidator';
import { normalizeLoadedExtension } from '../manifest/manifestNormalize';
import { extensionRegistry } from '../registry/extensionRegistry';
import { contributionRegistry } from '../registry/contributionRegistry';
import { extensionStorage } from './extensionStorage';

export const extensionService = {
  async initialize() {
    const result = await extensionScanner.scan();

    for (const item of result.extensions) {
      const validation = validateManifest(item.manifest);

      if (!validation.valid) {
        console.error(`[Extension] Invalid manifest at ${item.manifestPath}`, validation.errors);
        continue;
      }

      const extension = normalizeLoadedExtension({
        extensionPath: item.extensionPath,
        manifestPath: item.manifestPath,
        manifest: item.manifest as ExtensionManifest,
      });

      const enabled = extensionStorage.isEnabled(extension.id);

      extensionRegistry.register({
        ...extension,
        state: enabled ? 'enabled' : 'disabled',
      });

      if (enabled) {
        contributionRegistry.registerExtension(extension);
      }
    }

    for (const error of result.errors) {
      console.error('[Extension scan error]', error);
    }
  },

  getInstalledExtensions() {
    return extensionRegistry.getAll();
  },

  enable(extensionId: string) {
    const extension = extensionRegistry.get(extensionId);
    if (!extension) return;

    extensionStorage.setEnabled(extensionId, true);
    extensionRegistry.enable(extensionId);
    contributionRegistry.registerExtension({
      ...extension,
      state: 'enabled',
    });
  },

  disable(extensionId: string) {
    extensionStorage.setEnabled(extensionId, false);
    contributionRegistry.unregisterExtension(extensionId);
    extensionRegistry.disable(extensionId);
  },
};
```

---

# 15. Contribution Registry

Contribution Registry 负责统一注册和卸载插件贡献点。

```ts
// apps/desktop/src/plugins/registry/contributionRegistry.ts

import type { LoadedExtension } from '../manifest/types';
import { registerCommandContributions } from './commandContribution';
import { registerMenuContributions } from './menuContribution';
import { registerKeybindingContributions } from './keybindingContribution';
import { registerViewContributions } from './viewContribution';

export interface ContributionDisposable {
  dispose(): void;
}

class ContributionRegistry {
  private disposables = new Map<string, ContributionDisposable[]>();

  registerExtension(extension: LoadedExtension) {
    this.unregisterExtension(extension.id);

    if (extension.state !== 'enabled') return;

    const list: ContributionDisposable[] = [];

    list.push(...registerCommandContributions(extension));
    list.push(...registerMenuContributions(extension));
    list.push(...registerKeybindingContributions(extension));
    list.push(...registerViewContributions(extension));

    this.disposables.set(extension.id, list);
  }

  unregisterExtension(extensionId: string) {
    const list = this.disposables.get(extensionId);

    if (list) {
      for (const disposable of list) {
        disposable.dispose();
      }
    }

    this.disposables.delete(extensionId);
  }
}

export const contributionRegistry = new ContributionRegistry();
```

---

# 16. Command Contribution

插件贡献命令先注册到 `CommandService`。

Phase 8 中，命令 handler 暂时是占位：

```txt
点击插件命令
  ↓
如果 Extension Host 未实现
  ↓
显示提示：Extension command is not available yet.
```

后续 Phase 10 替换为真正调用插件 Worker handler。

```ts
// apps/desktop/src/plugins/registry/commandContribution.ts

import { commandService } from '@/services/commandService';
import type { LoadedExtension } from '../manifest/types';
import type { ContributionDisposable } from './contributionRegistry';

export function registerCommandContributions(extension: LoadedExtension): ContributionDisposable[] {
  const commands = extension.manifest.contributes?.commands ?? [];

  return commands.map((item) => {
    return commandService.register({
      id: item.command,
      title: item.title,
      category: item.category,
      source: 'plugin',
      extensionId: extension.id,
      handler: async () => {
        // Phase 8 只注册命令，暂不真正执行插件代码
        console.warn(
          `[Extension] Command "${item.command}" from "${extension.id}" is not executable yet.`,
        );

        // 后续 Phase 10：
        // return pluginHostManager.executeCommand(extension.id, item.command, args)
      },
    });
  });
}
```

要求 `CommandService.register` 返回 disposable：

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

class CommandService {
  private commands = new Map<string, Command>();

  register(command: Command) {
    if (this.commands.has(command.id)) {
      console.warn(`Command already registered: ${command.id}`);
    }

    this.commands.set(command.id, command);

    return {
      dispose: () => {
        const current = this.commands.get(command.id);

        if (current?.extensionId === command.extensionId) {
          this.commands.delete(command.id);
        }
      },
    };
  }

  async execute<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    const command = this.commands.get(id);

    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }

    return (await command.handler(...args)) as T;
  }

  getAll() {
    return Array.from(this.commands.values());
  }
}

export const commandService = new CommandService();
```

---

# 17. Menu Contribution

插件可以声明菜单：

```json
{
  "menus": {
    "editor/context": [
      {
        "command": "sql.format",
        "when": "editorLang == sql",
        "group": "navigation"
      }
    ]
  }
}
```

注册：

```ts
// apps/desktop/src/plugins/registry/menuContribution.ts

import { menuService } from '@/services/menuService';
import type { LoadedExtension } from '../manifest/types';
import type { ContributionDisposable } from './contributionRegistry';
import type { MenuItem } from '@/services/menuService';

export function registerMenuContributions(extension: LoadedExtension): ContributionDisposable[] {
  const menus = extension.manifest.contributes?.menus ?? {};
  const disposables: ContributionDisposable[] = [];

  for (const [location, items] of Object.entries(menus)) {
    const menuItems: MenuItem[] = items.map((item) => ({
      command: item.command,
      title: item.title,
      when: item.when,
      group: item.group,
      source: 'plugin',
      extensionId: extension.id,
    }));

    disposables.push(menuService.contribute(location, menuItems));
  }

  return disposables;
}
```

`MenuService` 需要支持 dispose：

```ts
// apps/desktop/src/services/menuService.ts

export interface MenuItem {
  command: string;
  title?: string;
  titleKey?: string;
  when?: string;
  group?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}

class MenuService {
  private menus = new Map<string, MenuItem[]>();

  contribute(location: string, items: MenuItem[]) {
    const current = this.menus.get(location) ?? [];
    this.menus.set(location, [...current, ...items]);

    return {
      dispose: () => {
        const next = (this.menus.get(location) ?? []).filter((item) => !items.includes(item));

        this.menus.set(location, next);
      },
    };
  }

  getMenu(location: string, context: Record<string, unknown>) {
    const items = this.menus.get(location) ?? [];

    return items.filter((item) => {
      if (!item.when) return true;
      return evaluateWhenClause(item.when, context);
    });
  }
}

function evaluateWhenClause(expression: string, context: Record<string, unknown>) {
  const [key, op, value] = expression.split(/\s+/);

  if (op === '==') {
    return String(context[key]) === value;
  }

  if (op === '!=') {
    return String(context[key]) !== value;
  }

  return false;
}

export const menuService = new MenuService();
```

---

# 18. Keybinding Contribution

插件可以贡献快捷键：

```json
{
  "keybindings": [
    {
      "command": "sql.format",
      "key": "mod+shift+f",
      "when": "editorLang == sql"
    }
  ]
}
```

注册：

```ts
// apps/desktop/src/plugins/registry/keybindingContribution.ts

import { keybindingService } from '@/services/keybindingService';
import type { LoadedExtension } from '../manifest/types';
import type { ContributionDisposable } from './contributionRegistry';

export function registerKeybindingContributions(
  extension: LoadedExtension,
): ContributionDisposable[] {
  const keybindings = extension.manifest.contributes?.keybindings ?? [];

  return keybindings.map((item) => {
    return keybindingService.register({
      key: item.key,
      mac: item.mac,
      win: item.win,
      linux: item.linux,
      command: item.command,
      when: item.when,
      source: 'plugin',
      extensionId: extension.id,
    });
  });
}
```

`KeybindingService`：

```ts
// apps/desktop/src/services/keybindingService.ts

import { commandService } from './commandService';

export interface Keybinding {
  key: string;
  mac?: string;
  win?: string;
  linux?: string;
  command: string;
  when?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}

class KeybindingService {
  private keybindings: Keybinding[] = [];
  private context: Record<string, unknown> = {};

  setup() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  setContext(key: string, value: unknown) {
    this.context[key] = value;
  }

  register(keybinding: Keybinding) {
    this.keybindings.push(keybinding);

    return {
      dispose: () => {
        this.keybindings = this.keybindings.filter((item) => item !== keybinding);
      },
    };
  }

  private handleKeyDown = async (event: KeyboardEvent) => {
    const key = normalizeKey(event);

    const matched = this.keybindings.find((item) => {
      const expected = getPlatformKey(item);

      if (expected !== key) return false;
      if (!item.when) return true;

      return evaluateWhenClause(item.when, this.context);
    });

    if (!matched) return;

    event.preventDefault();

    await commandService.execute(matched.command);
  };
}

function getPlatformKey(item: Keybinding) {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('mac') && item.mac) {
    return item.mac;
  }

  if (platform.includes('win') && item.win) {
    return item.win;
  }

  if (item.linux) {
    return item.linux;
  }

  return item.key;
}

function normalizeKey(event: KeyboardEvent) {
  const parts: string[] = [];

  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.shiftKey) parts.push('shift');
  if (event.altKey) parts.push('alt');

  parts.push(event.key.toLowerCase());

  return parts.join('+');
}

function evaluateWhenClause(expression: string, context: Record<string, unknown>) {
  const [key, op, value] = expression.split(/\s+/);

  if (op === '==') {
    return String(context[key]) === value;
  }

  if (op === '!=') {
    return String(context[key]) !== value;
  }

  return false;
}

export const keybindingService = new KeybindingService();
```

---

# 19. View Contribution 占位

Phase 8 不真正渲染插件视图，但先把 view contribution 注册到 registry。

```ts
// apps/desktop/src/plugins/registry/viewContribution.ts

import type { LoadedExtension } from '../manifest/types';
import type { ContributionDisposable } from './contributionRegistry';

export interface RegisteredViewContribution {
  extensionId: string;
  location: 'activityBar' | 'sideBar' | 'panel';
  id: string;
  name: string;
  icon?: string;
  when?: string;
}

class ViewContributionRegistry {
  private views: RegisteredViewContribution[] = [];

  register(view: RegisteredViewContribution) {
    this.views.push(view);

    return {
      dispose: () => {
        this.views = this.views.filter((item) => item !== view);
      },
    };
  }

  getViews(location?: RegisteredViewContribution['location']) {
    if (!location) return this.views;
    return this.views.filter((item) => item.location === location);
  }
}

export const viewContributionRegistry = new ViewContributionRegistry();

export function registerViewContributions(extension: LoadedExtension): ContributionDisposable[] {
  const views = extension.manifest.contributes?.views;
  if (!views) return [];

  const disposables: ContributionDisposable[] = [];

  for (const location of ['activityBar', 'sideBar', 'panel'] as const) {
    for (const view of views[location] ?? []) {
      disposables.push(
        viewContributionRegistry.register({
          extensionId: extension.id,
          location,
          id: view.id,
          name: view.name,
          icon: view.icon,
          when: view.when,
        }),
      );
    }
  }

  return disposables;
}
```

---

# 20. 初始化流程

应用启动时：

```txt
main.tsx
  ↓
initI18n
  ↓
setupGlobalServices
  ↓
extensionService.initialize
  ↓
render App
```

```ts
// apps/desktop/src/app/bootstrap.ts

import { extensionService } from '@/plugins/services/extensionService';
import { keybindingService } from '@/services/keybindingService';

export async function bootstrapApp() {
  keybindingService.setup();

  await extensionService.initialize();
}
```

```tsx
// apps/desktop/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initI18n } from './i18n';
import { bootstrapApp } from './app/bootstrap';
import './styles.css';

async function bootstrap() {
  await initI18n();
  await bootstrapApp();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
```

---

# 21. Installed Extensions UI

Phase 8 要能看到已扫描插件、启用/禁用状态、贡献点。

## 21.1 Hook

```ts
// apps/desktop/src/plugins/hooks/useInstalledExtensions.ts

import { useEffect, useState } from 'react';
import { extensionRegistry } from '../registry/extensionRegistry';
import type { LoadedExtension } from '../manifest/types';

export function useInstalledExtensions() {
  const [extensions, setExtensions] = useState<LoadedExtension[]>(extensionRegistry.getAll());

  useEffect(() => {
    const disposable = extensionRegistry.subscribe(() => {
      setExtensions(extensionRegistry.getAll());
    });

    return () => disposable.dispose();
  }, []);

  return extensions;
}
```

## 21.2 InstalledExtensionsView

```tsx
// apps/desktop/src/plugins/components/InstalledExtensionsView.tsx

import { useInstalledExtensions } from '../hooks/useInstalledExtensions';
import { ExtensionListItem } from './ExtensionListItem';

export function InstalledExtensionsView() {
  const extensions = useInstalledExtensions();

  if (!extensions.length) {
    return <div className="p-4 text-sm text-muted-foreground">No extensions installed.</div>;
  }

  return (
    <div className="h-full overflow-auto p-2">
      {extensions.map((extension) => (
        <ExtensionListItem key={extension.id} extension={extension} />
      ))}
    </div>
  );
}
```

## 21.3 ExtensionListItem

```tsx
// apps/desktop/src/plugins/components/ExtensionListItem.tsx

import { Button } from '@/components/ui/button';
import type { LoadedExtension } from '../manifest/types';
import { extensionService } from '../services/extensionService';

interface ExtensionListItemProps {
  extension: LoadedExtension;
}

export function ExtensionListItem(props: ExtensionListItemProps) {
  const { extension } = props;

  const enabled = extension.state === 'enabled';

  return (
    <div className="mb-2 rounded-md border p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm">
          {extension.displayName.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium">{extension.displayName}</div>

            <div className="text-xs text-muted-foreground">v{extension.version}</div>
          </div>

          <div className="text-xs text-muted-foreground">
            {extension.publisher}.{extension.name}
          </div>

          {extension.description ? (
            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {extension.description}
            </div>
          ) : null}

          {extension.error ? (
            <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
              {extension.error}
            </div>
          ) : null}

          <div className="mt-2 text-xs text-muted-foreground">
            Commands: {extension.manifest.contributes?.commands?.length ?? 0}
            {' · '}
            Permissions: {extension.manifest.permissions?.length ?? 0}
          </div>
        </div>

        <Button
          size="sm"
          variant={enabled ? 'outline' : 'default'}
          onClick={() => {
            if (enabled) {
              extensionService.disable(extension.id);
            } else {
              extensionService.enable(extension.id);
            }
          }}
        >
          {enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  );
}
```

---

# 22. Extension Detail View

显示贡献点详情：

```tsx
// apps/desktop/src/plugins/components/ExtensionContributionsView.tsx

import type { LoadedExtension } from '../manifest/types';

export function ExtensionContributionsView(props: { extension: LoadedExtension }) {
  const { extension } = props;
  const contributes = extension.manifest.contributes;

  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="mb-2 font-medium">Commands</h3>

        <div className="space-y-1">
          {(contributes?.commands ?? []).map((command) => (
            <div key={command.command} className="rounded border p-2">
              <div className="font-mono text-xs">{command.command}</div>
              <div>{command.title}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-medium">Menus</h3>

        <pre className="rounded border bg-muted p-2 text-xs">
          {JSON.stringify(contributes?.menus ?? {}, null, 2)}
        </pre>
      </section>

      <section>
        <h3 className="mb-2 font-medium">Keybindings</h3>

        <pre className="rounded border bg-muted p-2 text-xs">
          {JSON.stringify(contributes?.keybindings ?? [], null, 2)}
        </pre>
      </section>
    </div>
  );
}
```

---

# 23. Demo 插件

创建：

```txt
extensions/sql-formatter-demo/
├─ sqlgui.extension.json
├─ package.json
└─ dist/
   └─ extension.js
```

## 23.1 sqlgui.extension.json

```json
{
  "name": "sql-formatter-demo",
  "displayName": "SQL Formatter Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "description": "A demo extension that contributes a SQL format command.",
  "main": "dist/extension.js",
  "engines": {
    "sqlgui": "^0.1.0"
  },
  "categories": ["Formatter"],
  "activationEvents": ["onCommand:sql.format"],
  "permissions": ["editor.read", "editor.write"],
  "contributes": {
    "commands": [
      {
        "command": "sql.format",
        "title": "Format SQL",
        "category": "SQL"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "sql.format",
          "when": "editorLang == sql",
          "group": "navigation"
        }
      ]
    },
    "keybindings": [
      {
        "command": "sql.format",
        "key": "mod+shift+f",
        "when": "editorLang == sql"
      }
    ]
  }
}
```

## 23.2 extension.js 占位

Phase 8 不执行它，但先放着：

```js
// extensions/sql-formatter-demo/dist/extension.js

export async function activate(api, context) {
  api.commands.registerCommand('sql.format', async () => {
    const editor = api.window.activeSqlEditor;
    if (!editor) return;

    const sql = await editor.getSelectedTextOrDocumentText();
    const formatted = sql
      .replace(/\bselect\b/gi, 'SELECT')
      .replace(/\bfrom\b/gi, 'FROM')
      .replace(/\bwhere\b/gi, 'WHERE');

    await editor.replaceSelection(formatted);
  });
}

export function deactivate() {}
```

---

# 24. 插件状态和贡献点的关系

状态流转：

```txt
扫描到插件
  ↓
validate manifest
  ↓
register extension metadata
  ↓
如果 enabled
    register contributions
  ↓
如果 disabled
    只显示，不注册 contributions
```

启用：

```txt
enable extension
  ↓
extensionRegistry.enable
  ↓
contributionRegistry.registerExtension
  ↓
Command Palette 出现命令
```

禁用：

```txt
disable extension
  ↓
contributionRegistry.unregisterExtension
  ↓
extensionRegistry.disable
  ↓
Command Palette 移除命令
```

---

# 25. Command Palette 验证

Command Palette 应该能显示插件命令。

```ts
// CommandPalette 内部获取命令

const commands = commandService.getAll();

// plugin command example:
// {
//   id: 'sql.format',
//   title: 'Format SQL',
//   category: 'SQL',
//   source: 'plugin',
//   extensionId: 'baicie.sql-formatter-demo'
// }
```

展示时可以加来源：

```tsx
<div>
  <span>{command.title}</span>
  {command.source === 'plugin' ? (
    <span className="ml-2 text-xs text-muted-foreground">{command.extensionId}</span>
  ) : null}
</div>
```

---

# 26. 与 i18n 的衔接

Phase 8 先支持普通 title。
后面支持插件多语言时，manifest 可以这样：

```json
{
  "displayName": "%displayName%",
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

Phase 8 先预留：

```ts
export function resolveExtensionText(extensionId: string, text?: string) {
  if (!text) return '';
  if (text.startsWith('%') && text.endsWith('%')) {
    return text.slice(1, -1);
  }
  return text;
}
```

真正多语言在后续接 `pluginI18nRegistry`。

---

# 27. 与权限系统的衔接

Phase 8 只读取权限，不做权限拦截。
但是 UI 要展示权限。

```tsx
function ExtensionPermissions(props: { extension: LoadedExtension }) {
  const permissions = props.extension.manifest.permissions ?? [];

  if (!permissions.length) {
    return <div>No permissions required.</div>;
  }

  return (
    <div className="space-y-1">
      {permissions.map((permission) => (
        <div key={permission} className="rounded border p-2 text-xs">
          {permission}
        </div>
      ))}
    </div>
  );
}
```

后面 Phase 11 做 `PermissionBroker`。

---

# 28. 与 Activation System 的衔接

Phase 8 只保存 activationEvents，不真正激活插件。

但是需要建立索引：

```ts
// apps/desktop/src/plugins/registry/activationRegistry.ts

import type { LoadedExtension } from '../manifest/types';

class ActivationRegistry {
  private eventToExtensions = new Map<string, Set<string>>();

  register(extension: LoadedExtension) {
    for (const event of extension.manifest.activationEvents ?? []) {
      const set = this.eventToExtensions.get(event) ?? new Set<string>();
      set.add(extension.id);
      this.eventToExtensions.set(event, set);
    }

    return {
      dispose: () => {
        this.unregister(extension.id);
      },
    };
  }

  unregister(extensionId: string) {
    for (const set of this.eventToExtensions.values()) {
      set.delete(extensionId);
    }
  }

  getExtensionsForEvent(event: string) {
    return Array.from(this.eventToExtensions.get(event) ?? []);
  }
}

export const activationRegistry = new ActivationRegistry();
```

ContributionRegistry 里也注册 activation：

```ts
list.push(activationRegistry.register(extension));
```

Phase 10 点击命令时：

```txt
executeCommand sql.format
  ↓
触发 activation onCommand:sql.format
  ↓
启动插件 worker
  ↓
执行 handler
```

---

# 29. package extension-schema

用于共享 manifest schema。

## 29.1 package.json

```json
{
  "name": "@sqlgui/extension-schema",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "src/manifest.schema.json"],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

## 29.2 index.ts

```ts
// packages/extension-schema/src/index.ts

import manifestSchema from './manifest.schema.json';

export { manifestSchema };
```

## 29.3 schema 草案

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://sqlgui.dev/schemas/sqlgui.extension.schema.json",
  "title": "SQL GUI Extension Manifest",
  "type": "object",
  "required": ["name", "publisher", "version"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*$"
    },
    "publisher": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*$"
    },
    "displayName": {
      "type": "string"
    },
    "version": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "main": {
      "type": "string"
    },
    "activationEvents": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "contributes": {
      "type": "object",
      "properties": {
        "commands": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["command", "title"],
            "properties": {
              "command": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "category": {
                "type": "string"
              },
              "icon": {
                "type": "string"
              }
            }
          }
        },
        "menus": {
          "type": "object"
        },
        "keybindings": {
          "type": "array"
        }
      }
    }
  }
}
```

MVP 可以手写 validator，不急着引入 `ajv`。
后面如果插件市场要对外发布，再引入 JSON Schema 校验。

---

# 30. Commands / Menus / Keybindings 的冲突策略

## 30.1 Command 冲突

如果两个插件注册同一个 command：

```txt
baicie.sql-format -> sql.format
foo.sql-format -> sql.format
```

MVP 策略：

```txt
后注册覆盖前注册，并 warning
```

更稳策略：

```txt
禁止覆盖，第二个注册失败
```

我建议：

> **核心命令不可覆盖，插件命令冲突则拒绝注册。**

实现：

```ts
register(command: Command) {
  const exists = this.commands.get(command.id)

  if (exists) {
    if (exists.source === 'core') {
      throw new Error(`Cannot override core command: ${command.id}`)
    }

    throw new Error(`Command already registered: ${command.id}`)
  }

  this.commands.set(command.id, command)

  return {
    dispose: () => {
      this.commands.delete(command.id)
    },
  }
}
```

## 30.2 Keybinding 冲突

MVP 策略：

```txt
后注册优先
```

但 UI 里要能看到冲突。后续做 Keybindings 设置页再解决。

## 30.3 Menu 冲突

菜单可以重复，但排序依赖 `group`：

```txt
navigation
1_modification
2_copy
z_more
```

MVP 先按注册顺序。

---

# 31. Phase 8 开发顺序

推荐顺序：

```txt
1. 定义 ExtensionManifest 类型
2. 创建 demo 插件 sql-formatter-demo
3. Rust 实现 extension_scan
4. 前端 extensionScanner 调用 Rust
5. 实现 validateManifest
6. 实现 normalizeLoadedExtension
7. 实现 extensionRegistry
8. 实现 contributionRegistry
9. 改造 CommandService 支持 disposable / plugin command
10. 实现 commandContribution
11. 改造 MenuService 支持 disposable
12. 实现 menuContribution
13. 实现 KeybindingService register/dispose
14. 实现 keybindingContribution
15. 实现 viewContribution 占位
16. 实现 extensionService.initialize
17. main.tsx 启动时 initialize
18. 实现 InstalledExtensionsView
19. 实现 enable / disable
20. 验证 Command Palette 能看到 sql.format
```

---

# 32. Phase 8 测试用例

## 32.1 Manifest Validator

```txt
[ ] 缺少 name 应失败
[ ] 缺少 publisher 应失败
[ ] 缺少 version 应失败
[ ] 非法 name 应失败
[ ] 非法 permission 应失败
[ ] 非法 activationEvent 应失败
[ ] menu command 未声明应失败
[ ] keybinding command 未声明应失败
[ ] 正确 manifest 应通过
```

## 32.2 Extension Registry

```txt
[ ] register 后 getAll 能返回插件
[ ] disable 后 state 是 disabled
[ ] enable 后 state 是 enabled
[ ] unregister 后插件消失
```

## 32.3 Contribution Registry

```txt
[ ] 插件 command 注册到 CommandService
[ ] disable 插件后 command 被移除
[ ] 插件 menu 注册到 MenuService
[ ] disable 插件后 menu 被移除
[ ] 插件 keybinding 注册到 KeybindingService
[ ] disable 插件后 keybinding 被移除
```

## 32.4 手动验收

```txt
[ ] extensions/sql-formatter-demo 被扫描到
[ ] Installed Extensions 页面展示 SQL Formatter Demo
[ ] Command Palette 出现 Format SQL
[ ] 禁用插件后 Format SQL 消失
[ ] 启用插件后 Format SQL 恢复
[ ] editor/context 菜单可以读到 sql.format
[ ] 快捷键 mod+shift+f 能触发 sql.format 占位 handler
```

---

# 33. Phase 8 完成标准

做到下面这些就算完成：

```txt
[ ] 插件 manifest 类型定义完成
[ ] 插件 demo 目录完成
[ ] Rust 能扫描本地插件目录
[ ] 前端能加载 manifest
[ ] manifest validator 可用
[ ] extensionRegistry 可用
[ ] contributionRegistry 可用
[ ] command contribution 可用
[ ] menu contribution 可用
[ ] keybinding contribution 可用
[ ] view contribution 占位可用
[ ] Installed Extensions UI 可用
[ ] enable / disable 可用
[ ] Command Palette 可展示插件命令
[ ] disable 后贡献点能完整卸载
```

---

# 34. 最小闭环

最小闭环是：

```txt
创建 extensions/sql-formatter-demo/sqlgui.extension.json
  ↓
启动 SQL GUI
  ↓
extension_scan 扫描插件
  ↓
validate manifest 成功
  ↓
extensionRegistry 注册插件
  ↓
contributionRegistry 注册 sql.format 命令
  ↓
Command Palette 出现 Format SQL
  ↓
禁用插件
  ↓
Format SQL 从 Command Palette 消失
```

这条链路跑通后，Phase 8 就达标。

---

# 35. Phase 8 的关键取舍

这一阶段千万不要急着运行插件代码。
否则你会同时面对：

```txt
插件加载
插件隔离
Worker RPC
权限系统
插件 API
命令回调
错误隔离
日志转发
```

复杂度会爆。

Phase 8 应该只解决：

```txt
插件是什么？
插件声明了什么？
插件能贡献什么？
宿主如何识别和注册这些贡献？
禁用插件如何卸载贡献？
```

也就是：

> **Manifest + Contribution Registry。**

后续 Phase 9 / 10 再继续：

```txt
Phase 9: @sqlgui/api / @sqlgui/sdk
Phase 10: Web Worker Plugin Host
Phase 11: Permission Broker
Phase 12: Local Install / Package
Phase 13: Mock Marketplace
```

Phase 8 做稳，你后面的插件系统才不会乱。
