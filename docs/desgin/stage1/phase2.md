下面给你一版 **Phase 2：核心服务系统详细设计**。

Phase 1 做的是“壳”：Workbench、ActivityBar、SideBar、EditorArea、BottomPanel、StatusBar、临时 CommandPalette。

Phase 2 要做的是“内核服务层”：

> **把 Workbench 从一堆组件状态，升级成可扩展、可插件化、可命令驱动的应用架构。**

这一阶段很关键，因为后面的 **DB Core、SQL 编辑器、插件系统、插件市场** 都会依赖这些服务。

---

# Phase 2 总目标

Phase 2 要完成这些核心服务：

```txt
CommandService       命令系统
MenuService          菜单系统
KeybindingService    快捷键系统
NotificationService  通知系统
StorageService       存储系统
EditorService        编辑器服务
ConnectionService    连接状态服务，占位
LogService           日志服务
WorkbenchService     工作台服务
```

Phase 2 完成后，应该做到：

```txt
1. 所有核心操作都通过 CommandService 执行
2. Command Palette 不再读取临时 commandRegistry
3. 快捷键通过 KeybindingService 分发
4. 菜单项通过 MenuService 动态贡献
5. 插件未来可以注册 command/menu/keybinding
6. 状态栏、日志、通知都走统一服务
7. Workbench 组件尽量不直接写业务逻辑
```

---

# 1. Phase 2 架构定位

Phase 1：

```txt
组件直接操作 Zustand Store
组件自己处理快捷键
CommandPalette 读临时 commandRegistry
```

Phase 2：

```txt
UI Component
   ↓
CommandService / WorkbenchService / EditorService
   ↓
Store / Tauri invoke / Plugin Host
```

目标是把架构变成：

```txt
┌──────────────────────────────┐
│ React Workbench              │
│ ActivityBar / Editor / Panel │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│ Frontend Services            │
│ Command / Menu / Keybinding  │
│ Storage / Editor / Logs      │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│ Stores + Native Bridge       │
│ Zustand / Tauri invoke       │
└──────────────────────────────┘
```

这一层以后就是插件系统的“宿主 API 基础”。

---

# 2. 目录结构设计

Phase 2 后，前端目录建议变成这样：

```txt
apps/desktop/src/
├─ app/
│  ├─ bootstrap.ts
│  └─ serviceRegistry.ts
│
├─ services/
│  ├─ command/
│  │  ├─ CommandService.ts
│  │  ├─ types.ts
│  │  └─ registerCoreCommands.ts
│  │
│  ├─ menu/
│  │  ├─ MenuService.ts
│  │  ├─ types.ts
│  │  ├─ when.ts
│  │  └─ registerCoreMenus.ts
│  │
│  ├─ keybinding/
│  │  ├─ KeybindingService.ts
│  │  ├─ types.ts
│  │  └─ registerCoreKeybindings.ts
│  │
│  ├─ notification/
│  │  ├─ NotificationService.ts
│  │  ├─ notificationStore.ts
│  │  └─ types.ts
│  │
│  ├─ storage/
│  │  ├─ StorageService.ts
│  │  ├─ LocalStorageProvider.ts
│  │  └─ types.ts
│  │
│  ├─ editor/
│  │  ├─ EditorService.ts
│  │  └─ types.ts
│  │
│  ├─ connection/
│  │  ├─ ConnectionService.ts
│  │  └─ types.ts
│  │
│  ├─ log/
│  │  ├─ LogService.ts
│  │  ├─ logStore.ts
│  │  └─ types.ts
│  │
│  ├─ workbench/
│  │  └─ WorkbenchService.ts
│  │
│  └─ native/
│     └─ invoke.ts
│
├─ workbench/
│  ├─ Workbench.tsx
│  ├─ command/
│  │  └─ CommandPalette.tsx
│  ├─ layout/
│  ├─ views/
│  └─ store/
│
└─ lib/
   ├─ event.ts
   └─ disposable.ts
```

---

# 3. 基础工具：Disposable 和 EventEmitter

VS Code 架构里大量服务都用 Disposable 管生命周期。插件系统也会依赖这个。

## 3.1 `lib/disposable.ts`

```ts
export interface Disposable {
  dispose(): void;
}

export class DisposableStore implements Disposable {
  private readonly disposables = new Set<Disposable>();
  private disposed = false;

  add<T extends Disposable>(disposable: T): T {
    if (this.disposed) {
      disposable.dispose();
      return disposable;
    }

    this.disposables.add(disposable);
    return disposable;
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.clear();
  }
}

export function toDisposable(fn: () => void): Disposable {
  return {
    dispose: fn,
  };
}
```

---

## 3.2 `lib/event.ts`

```ts
import { toDisposable, type Disposable } from './disposable';

export type Listener<T> = (event: T) => void;

export class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  event(listener: Listener<T>): Disposable {
    this.listeners.add(listener);

    return toDisposable(() => {
      this.listeners.delete(listener);
    });
  }

  fire(event: T): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}
```

---

# 4. ServiceRegistry：服务注册中心

Phase 2 可以先用一个简单单例 registry，不急着做复杂 DI。

## 4.1 `app/serviceRegistry.ts`

```ts
import { CommandService } from '@/services/command/CommandService';
import { MenuService } from '@/services/menu/MenuService';
import { KeybindingService } from '@/services/keybinding/KeybindingService';
import { NotificationService } from '@/services/notification/NotificationService';
import { StorageService } from '@/services/storage/StorageService';
import { LocalStorageProvider } from '@/services/storage/LocalStorageProvider';
import { EditorService } from '@/services/editor/EditorService';
import { ConnectionService } from '@/services/connection/ConnectionService';
import { LogService } from '@/services/log/LogService';
import { WorkbenchService } from '@/services/workbench/WorkbenchService';

export class ServiceRegistry {
  readonly storage = new StorageService(new LocalStorageProvider());
  readonly log = new LogService();
  readonly notification = new NotificationService();
  readonly command = new CommandService(this.log);
  readonly menu = new MenuService();
  readonly keybinding = new KeybindingService(this.command, this.log);
  readonly editor = new EditorService();
  readonly connection = new ConnectionService();
  readonly workbench = new WorkbenchService();
}

export const services = new ServiceRegistry();
```

后面插件系统会用：

```ts
services.command.registerCommand(...)
services.menu.contribute(...)
services.keybinding.registerKeybinding(...)
```

---

# 5. App Bootstrap

## 5.1 `app/bootstrap.ts`

```ts
import { services } from './serviceRegistry';
import { registerCoreCommands } from '@/services/command/registerCoreCommands';
import { registerCoreMenus } from '@/services/menu/registerCoreMenus';
import { registerCoreKeybindings } from '@/services/keybinding/registerCoreKeybindings';

let bootstrapped = false;

export function bootstrapApp() {
  if (bootstrapped) return;
  bootstrapped = true;

  registerCoreCommands(services);
  registerCoreMenus(services);
  registerCoreKeybindings(services);

  services.log.info('app', 'Application bootstrapped.');
}
```

## 5.2 App 中调用

```tsx
import { useEffect, useState } from 'react';
import { Workbench } from './workbench/Workbench';
import { callNative } from './services/native/invoke';
import { bootstrapApp } from './app/bootstrap';

interface HealthCheckResponse {
  appName: string;
  rustCoreReady: boolean;
}

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    bootstrapApp();

    callNative<HealthCheckResponse>('system_health_check').then(setHealth).catch(console.error);
  }, []);

  return <Workbench health={health} />;
}
```

---

# 6. CommandService 设计

CommandService 是整个系统的中枢。

后续所有操作都应该变成命令：

```txt
sql.execute
sql.format
editor.newQuery
workbench.toggleSideBar
connection.new
extensions.openMarketplace
```

插件系统也会注册命令。

---

## 6.1 Command 类型

`services/command/types.ts`

```ts
import type { Disposable } from '@/lib/disposable';

export type CommandSource = 'core' | 'plugin';

export interface CommandContext {
  source?: string;
}

export interface Command {
  id: string;
  title: string;
  category?: string;
  source: CommandSource;
  extensionId?: string;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}

export interface CommandServiceLike {
  registerCommand(command: Command): Disposable;
  executeCommand<T = unknown>(id: string, ...args: unknown[]): Promise<T>;
  getCommand(id: string): Command | undefined;
  getCommands(): Command[];
}
```

---

## 6.2 CommandService 实现

`services/command/CommandService.ts`

```ts
import { Emitter } from '@/lib/event';
import { toDisposable, type Disposable } from '@/lib/disposable';
import type { LogService } from '../log/LogService';
import type { Command } from './types';

export class CommandService {
  private readonly commands = new Map<string, Command>();

  private readonly onDidRegisterCommandEmitter = new Emitter<Command>();
  readonly onDidRegisterCommand = this.onDidRegisterCommandEmitter.event.bind(
    this.onDidRegisterCommandEmitter,
  );

  constructor(private readonly logService: LogService) {}

  registerCommand(command: Command): Disposable {
    if (this.commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }

    this.commands.set(command.id, command);
    this.onDidRegisterCommandEmitter.fire(command);

    this.logService.info('command', `Registered command: ${command.id}`);

    return toDisposable(() => {
      this.commands.delete(command.id);
      this.logService.info('command', `Disposed command: ${command.id}`);
    });
  }

  async executeCommand<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    const command = this.commands.get(id);

    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }

    this.logService.debug('command', `Execute command: ${id}`);

    try {
      return (await command.handler(...args)) as T;
    } catch (error) {
      this.logService.error('command', `Command failed: ${id}`, error);
      throw error;
    }
  }

  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values()).sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
  }
}
```

---

## 6.3 注册核心命令

`services/command/registerCoreCommands.ts`

```ts
import type { ServiceRegistry } from '@/app/serviceRegistry';

export function registerCoreCommands(services: ServiceRegistry) {
  services.command.registerCommand({
    id: 'workbench.toggleSideBar',
    title: 'Toggle Side Bar',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      services.workbench.toggleSideBar();
    },
  });

  services.command.registerCommand({
    id: 'workbench.toggleBottomPanel',
    title: 'Toggle Bottom Panel',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      services.workbench.toggleBottomPanel();
    },
  });

  services.command.registerCommand({
    id: 'workbench.showConnections',
    title: 'Show Connections',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      services.workbench.showActivity('connections');
    },
  });

  services.command.registerCommand({
    id: 'workbench.showExtensions',
    title: 'Show Extensions',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      services.workbench.showActivity('extensions');
    },
  });

  services.command.registerCommand({
    id: 'editor.newQuery',
    title: 'New Query',
    category: 'SQL',
    source: 'core',
    handler: () => {
      services.editor.newQuery();
    },
  });

  services.command.registerCommand({
    id: 'connection.new',
    title: 'New Connection',
    category: 'Connection',
    source: 'core',
    handler: () => {
      services.notification.info('New connection dialog coming soon.');
    },
  });

  services.command.registerCommand({
    id: 'extensions.openMarketplace',
    title: 'Open Extension Marketplace',
    category: 'Extensions',
    source: 'core',
    handler: () => {
      services.workbench.showActivity('extensions');
    },
  });
}
```

---

# 7. WorkbenchService 设计

Phase 1 里组件直接操作 Zustand。Phase 2 做一个 WorkbenchService 包一层。

## 7.1 `services/workbench/WorkbenchService.ts`

```ts
import type { ActivityId, BottomPanelId } from '@/workbench/types';
import { useWorkbenchStore } from '@/workbench/store/workbenchStore';

export class WorkbenchService {
  showActivity(activity: ActivityId) {
    useWorkbenchStore.getState().setActiveActivity(activity);
  }

  toggleSideBar() {
    useWorkbenchStore.getState().toggleSideBar();
  }

  toggleBottomPanel() {
    useWorkbenchStore.getState().toggleBottomPanel();
  }

  showBottomPanel(panel: BottomPanelId) {
    useWorkbenchStore.getState().setActiveBottomPanel(panel);
  }

  openCommandPalette() {
    useWorkbenchStore.getState().openCommandPalette();
  }

  closeCommandPalette() {
    useWorkbenchStore.getState().closeCommandPalette();
  }
}
```

这样后续插件可以通过：

```ts
api.commands.executeCommand('workbench.showExtensions');
```

而不是直接改 store。

---

# 8. EditorService 设计

Phase 2 不接 Monaco，但先定义 EditorService 抽象。Phase 5 接 Monaco 时再把真实 editor model 挂进来。

## 8.1 类型

`services/editor/types.ts`

```ts
export type EditorKind = 'welcome' | 'query' | 'extension';

export interface EditorInput {
  id: string;
  title: string;
  kind: EditorKind;
  content?: string;
  dirty?: boolean;
}

export interface ActiveEditorSnapshot {
  id: string;
  title: string;
  kind: EditorKind;
  content: string;
}
```

## 8.2 实现

`services/editor/EditorService.ts`

```ts
import { Emitter } from '@/lib/event';
import { useWorkbenchStore } from '@/workbench/store/workbenchStore';
import type { ActiveEditorSnapshot, EditorInput } from './types';

export class EditorService {
  private readonly editorContents = new Map<string, string>();

  private readonly onDidChangeActiveEditorEmitter = new Emitter<string | null>();

  readonly onDidChangeActiveEditor = this.onDidChangeActiveEditorEmitter.event.bind(
    this.onDidChangeActiveEditorEmitter,
  );

  newQuery(initialSql = '') {
    const id = `query-${Date.now()}`;

    this.editorContents.set(id, initialSql);

    useWorkbenchStore.getState().openEditorTab({
      id,
      title: 'Untitled Query',
      kind: 'query',
      dirty: false,
    });

    this.onDidChangeActiveEditorEmitter.fire(id);
  }

  openEditor(input: EditorInput) {
    this.editorContents.set(input.id, input.content ?? '');

    useWorkbenchStore.getState().openEditorTab({
      id: input.id,
      title: input.title,
      kind: input.kind,
      dirty: input.dirty,
    });

    this.onDidChangeActiveEditorEmitter.fire(input.id);
  }

  closeEditor(id: string) {
    this.editorContents.delete(id);
    useWorkbenchStore.getState().closeEditorTab(id);
  }

  setActiveEditor(id: string) {
    useWorkbenchStore.getState().setActiveEditorTab(id);
    this.onDidChangeActiveEditorEmitter.fire(id);
  }

  getActiveEditor(): ActiveEditorSnapshot | undefined {
    const state = useWorkbenchStore.getState();
    const activeId = state.activeEditorTabId;

    if (!activeId) return undefined;

    const tab = state.editorTabs.find((item) => item.id === activeId);
    if (!tab) return undefined;

    return {
      id: tab.id,
      title: tab.title,
      kind: tab.kind,
      content: this.editorContents.get(tab.id) ?? '',
    };
  }

  getText(editorId: string): string {
    return this.editorContents.get(editorId) ?? '';
  }

  setText(editorId: string, text: string) {
    this.editorContents.set(editorId, text);

    const store = useWorkbenchStore.getState();
    const tab = store.editorTabs.find((item) => item.id === editorId);

    if (tab) {
      store.openEditorTab({
        ...tab,
        dirty: true,
      });
    }
  }

  getActiveText(): string {
    const active = this.getActiveEditor();
    return active?.content ?? '';
  }
}
```

Phase 5 接 Monaco 时，这里会被增强：

```txt
getSelectedText()
replaceSelection()
formatDocument()
getModel()
```

---

# 9. MenuService 设计

MenuService 用于支持：

```txt
editor/title
editor/context
connection/context
result/context
activity/title
```

未来插件通过 manifest contributes.menus 注册菜单。

---

## 9.1 类型

`services/menu/types.ts`

```ts
import type { Disposable } from '@/lib/disposable';

export type MenuLocation =
  | 'commandPalette'
  | 'activity/title'
  | 'editor/title'
  | 'editor/context'
  | 'connection/context'
  | 'result/context'
  | 'statusBar/context';

export interface MenuContext {
  [key: string]: unknown;
}

export interface MenuItem {
  command: string;
  title?: string;
  when?: string;
  group?: string;
  order?: number;
  source: 'core' | 'plugin';
  extensionId?: string;
}

export interface MenuServiceLike {
  contribute(location: MenuLocation, items: MenuItem[]): Disposable;
  getMenuItems(location: MenuLocation, context?: MenuContext): MenuItem[];
}
```

---

## 9.2 when 表达式

Phase 2 只做极简表达式：

```txt
editorLang == sql
dbKind == postgres
activeActivity == connections
```

`services/menu/when.ts`

```ts
import type { MenuContext } from './types';

export function evaluateWhen(expression: string | undefined, context: MenuContext): boolean {
  if (!expression) return true;

  const trimmed = expression.trim();

  if (trimmed.includes('==')) {
    const [key, value] = trimmed.split('==').map((item) => item.trim());
    return String(context[key]) === value;
  }

  if (trimmed.includes('!=')) {
    const [key, value] = trimmed.split('!=').map((item) => item.trim());
    return String(context[key]) !== value;
  }

  return Boolean(context[trimmed]);
}
```

后续再扩展：

```txt
&&
||
!
括号
正则
in
```

---

## 9.3 MenuService 实现

`services/menu/MenuService.ts`

```ts
import { toDisposable, type Disposable } from '@/lib/disposable';
import { evaluateWhen } from './when';
import type { MenuContext, MenuItem, MenuLocation } from './types';

export class MenuService {
  private readonly menus = new Map<MenuLocation, MenuItem[]>();

  contribute(location: MenuLocation, items: MenuItem[]): Disposable {
    const current = this.menus.get(location) ?? [];
    this.menus.set(location, [...current, ...items]);

    return toDisposable(() => {
      const next = (this.menus.get(location) ?? []).filter((item) => !items.includes(item));

      this.menus.set(location, next);
    });
  }

  getMenuItems(location: MenuLocation, context: MenuContext = {}): MenuItem[] {
    const items = this.menus.get(location) ?? [];

    return items
      .filter((item) => evaluateWhen(item.when, context))
      .sort((a, b) => {
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }
}
```

---

## 9.4 注册核心菜单

`services/menu/registerCoreMenus.ts`

```ts
import type { ServiceRegistry } from '@/app/serviceRegistry';

export function registerCoreMenus(services: ServiceRegistry) {
  services.menu.contribute('editor/title', [
    {
      command: 'editor.newQuery',
      title: 'New Query',
      source: 'core',
      group: 'navigation',
      order: 10,
    },
  ]);

  services.menu.contribute('activity/title', [
    {
      command: 'connection.new',
      title: 'New Connection',
      source: 'core',
      when: 'activeActivity == connections',
      order: 10,
    },
    {
      command: 'extensions.openMarketplace',
      title: 'Open Marketplace',
      source: 'core',
      when: 'activeActivity == extensions',
      order: 10,
    },
  ]);

  services.menu.contribute('editor/context', [
    {
      command: 'editor.newQuery',
      title: 'New Query',
      source: 'core',
      when: 'editorLang == sql',
      order: 10,
    },
  ]);
}
```

---

# 10. KeybindingService 设计

KeybindingService 负责把快捷键映射到 command。

---

## 10.1 类型

`services/keybinding/types.ts`

```ts
import type { Disposable } from '@/lib/disposable';

export interface Keybinding {
  command: string;
  key: string;
  when?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}

export interface KeybindingContext {
  [key: string]: unknown;
}

export interface NormalizedKeybinding {
  key: string;
  command: string;
}
```

---

## 10.2 快捷键规范

统一用字符串：

```txt
mod+shift+p
mod+b
mod+j
mod+n
f5
escape
```

其中 `mod` 表示：

```txt
macOS: Meta
Windows/Linux: Ctrl
```

---

## 10.3 实现

`services/keybinding/KeybindingService.ts`

```ts
import { toDisposable, type Disposable } from '@/lib/disposable';
import type { CommandService } from '../command/CommandService';
import type { LogService } from '../log/LogService';
import { evaluateWhen } from '../menu/when';
import type { Keybinding, KeybindingContext } from './types';

export class KeybindingService {
  private readonly keybindings: Keybinding[] = [];
  private context: KeybindingContext = {};

  constructor(
    private readonly commandService: CommandService,
    private readonly logService: LogService,
  ) {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  registerKeybinding(keybinding: Keybinding): Disposable {
    this.keybindings.push(keybinding);

    return toDisposable(() => {
      const index = this.keybindings.indexOf(keybinding);
      if (index >= 0) {
        this.keybindings.splice(index, 1);
      }
    });
  }

  setContext(key: string, value: unknown) {
    this.context[key] = value;
  }

  getContext() {
    return { ...this.context };
  }

  private readonly handleKeyDown = async (event: KeyboardEvent) => {
    const key = normalizeKeyboardEvent(event);
    const matched = [...this.keybindings].reverse().find((item) => {
      return item.key === key && evaluateWhen(item.when, this.context);
    });

    if (!matched) return;

    event.preventDefault();
    event.stopPropagation();

    try {
      await this.commandService.executeCommand(matched.command);
    } catch (error) {
      this.logService.error(
        'keybinding',
        `Failed to execute keybinding command: ${matched.command}`,
        error,
      );
    }
  };

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

function normalizeKeyboardEvent(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.metaKey || event.ctrlKey) {
    parts.push('mod');
  }

  if (event.shiftKey) {
    parts.push('shift');
  }

  if (event.altKey) {
    parts.push('alt');
  }

  const key = event.key.toLowerCase();

  if (!['control', 'meta', 'shift', 'alt'].includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}
```

---

## 10.4 注册核心快捷键

`services/keybinding/registerCoreKeybindings.ts`

```ts
import type { ServiceRegistry } from '@/app/serviceRegistry';

export function registerCoreKeybindings(services: ServiceRegistry) {
  services.keybinding.registerKeybinding({
    command: 'workbench.openCommandPalette',
    key: 'mod+shift+p',
    source: 'core',
  });

  services.keybinding.registerKeybinding({
    command: 'workbench.toggleSideBar',
    key: 'mod+b',
    source: 'core',
  });

  services.keybinding.registerKeybinding({
    command: 'workbench.toggleBottomPanel',
    key: 'mod+j',
    source: 'core',
  });

  services.keybinding.registerKeybinding({
    command: 'editor.newQuery',
    key: 'mod+n',
    source: 'core',
  });
}
```

这里需要补一个命令：

```ts
services.command.registerCommand({
  id: 'workbench.openCommandPalette',
  title: 'Open Command Palette',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    services.workbench.openCommandPalette();
  },
});
```

---

# 11. CommandPalette 改造

Phase 1 的 CommandPalette 读 `commandRegistry`。Phase 2 改成读 `services.command`。

`workbench/command/CommandPalette.tsx`

```tsx
import { useMemo, useState } from 'react';
import { services } from '@/app/serviceRegistry';
import { useWorkbenchStore } from '../store/workbenchStore';

export function CommandPalette() {
  const open = useWorkbenchStore((state) => state.commandPaletteOpen);
  const closeCommandPalette = useWorkbenchStore((state) => state.closeCommandPalette);

  const [keyword, setKeyword] = useState('');

  const commands = useMemo(() => {
    if (!open) return [];

    const lowerKeyword = keyword.toLowerCase();

    return services.command.getCommands().filter((command) => {
      return (
        command.title.toLowerCase().includes(lowerKeyword) ||
        command.id.toLowerCase().includes(lowerKeyword) ||
        command.category?.toLowerCase().includes(lowerKeyword)
      );
    });
  }, [keyword, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-background/40 pt-24 backdrop-blur-sm">
      <div className="h-fit w-[640px] overflow-hidden rounded-lg border bg-popover shadow-xl">
        <input
          autoFocus
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Type a command..."
          className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none"
        />

        <div className="max-h-80 overflow-auto p-1">
          {commands.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            commands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={async () => {
                  await services.command.executeCommand(command.id);
                  closeCommandPalette();
                  setKeyword('');
                }}
              >
                <span>{command.title}</span>
                <span className="text-xs text-muted-foreground">{command.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

Phase 2 后可以删除 Phase 1 的 `commandRegistry.ts`。

---

# 12. NotificationService 设计

通知分两类：

```txt
Toast 通知：操作成功、失败、警告
Message 通知：未来可做弹窗确认
```

Phase 2 先做 Toast。

---

## 12.1 类型

`services/notification/types.ts`

```ts
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: number;
  timeoutMs?: number;
}
```

---

## 12.2 Store

`services/notification/notificationStore.ts`

```ts
import { create } from 'zustand';
import type { NotificationItem } from './types';

interface NotificationStore {
  items: NotificationItem[];
  push: (item: NotificationItem) => void;
  remove: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],

  push: (item) => {
    set((state) => ({
      items: [...state.items, item],
    }));
  },

  remove: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
}));
```

---

## 12.3 Service

`services/notification/NotificationService.ts`

```ts
import { useNotificationStore } from './notificationStore';
import type { NotificationType } from './types';

export class NotificationService {
  info(message: string) {
    this.notify('info', message);
  }

  success(message: string) {
    this.notify('success', message);
  }

  warning(message: string) {
    this.notify('warning', message);
  }

  error(message: string) {
    this.notify('error', message);
  }

  notify(type: NotificationType, message: string) {
    const id = crypto.randomUUID();

    useNotificationStore.getState().push({
      id,
      type,
      message,
      createdAt: Date.now(),
      timeoutMs: 3000,
    });

    window.setTimeout(() => {
      useNotificationStore.getState().remove(id);
    }, 3000);
  }
}
```

---

## 12.4 Notification UI

`workbench/notification/NotificationCenter.tsx`

```tsx
import { useNotificationStore } from '@/services/notification/notificationStore';
import { cn } from '@/lib/cn';

export function NotificationCenter() {
  const items = useNotificationStore((state) => state.items);
  const remove = useNotificationStore((state) => state.remove);

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            'rounded-md border bg-popover px-3 py-2 text-left text-sm shadow-lg',
            item.type === 'error' && 'border-red-500',
            item.type === 'warning' && 'border-yellow-500',
            item.type === 'success' && 'border-green-500',
          )}
          onClick={() => remove(item.id)}
        >
          <div className="font-medium capitalize">{item.type}</div>
          <div className="mt-1 text-muted-foreground">{item.message}</div>
        </button>
      ))}
    </div>
  );
}
```

在 Workbench 加：

```tsx
<NotificationCenter />
```

---

# 13. LogService 设计

日志服务用于：

```txt
系统日志
命令执行日志
DB 查询日志
插件日志
错误日志
```

Phase 2 先前端内存日志，后续 Rust 文件日志。

---

## 13.1 类型

`services/log/types.ts`

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogItem {
  id: string;
  level: LogLevel;
  scope: string;
  message: string;
  timestamp: number;
  data?: unknown;
}
```

---

## 13.2 Store

`services/log/logStore.ts`

```ts
import { create } from 'zustand';
import type { LogItem } from './types';

interface LogStore {
  items: LogItem[];
  push: (item: LogItem) => void;
  clear: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  items: [],

  push: (item) => {
    set((state) => ({
      items: [...state.items, item].slice(-1000),
    }));
  },

  clear: () => {
    set({ items: [] });
  },
}));
```

---

## 13.3 Service

`services/log/LogService.ts`

```ts
import { useLogStore } from './logStore';
import type { LogLevel } from './types';

export class LogService {
  debug(scope: string, message: string, data?: unknown) {
    this.log('debug', scope, message, data);
  }

  info(scope: string, message: string, data?: unknown) {
    this.log('info', scope, message, data);
  }

  warn(scope: string, message: string, data?: unknown) {
    this.log('warn', scope, message, data);
  }

  error(scope: string, message: string, data?: unknown) {
    this.log('error', scope, message, data);
  }

  private log(level: LogLevel, scope: string, message: string, data?: unknown) {
    const item = {
      id: crypto.randomUUID(),
      level,
      scope,
      message,
      timestamp: Date.now(),
      data,
    };

    useLogStore.getState().push(item);

    const text = `[${scope}] ${message}`;

    if (level === 'error') {
      console.error(text, data);
    } else if (level === 'warn') {
      console.warn(text, data);
    } else if (level === 'debug') {
      console.debug(text, data);
    } else {
      console.info(text, data);
    }
  }
}
```

---

## 13.4 BottomPanel Logs 接入

Phase 1 的 `LogsPanel` 替换为：

```tsx
import { useLogStore } from '@/services/log/logStore';

function LogsPanel() {
  const items = useLogStore((state) => state.items);

  return (
    <div className="h-full overflow-auto p-2 font-mono text-xs">
      {items.length === 0 ? (
        <div className="text-muted-foreground">No logs.</div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="whitespace-pre-wrap py-0.5">
            <span className="text-muted-foreground">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>{' '}
            <span>[{item.level}]</span> <span>[{item.scope}]</span> <span>{item.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
```

---

# 14. StorageService 设计

StorageService 用于保存：

```txt
Workbench 布局
连接配置，不含密码
插件状态
用户配置
查询历史
```

Phase 2 先用 localStorage，后续可以替换成 Tauri 文件存储。

---

## 14.1 类型

`services/storage/types.ts`

```ts
export interface StorageProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}
```

---

## 14.2 LocalStorageProvider

`services/storage/LocalStorageProvider.ts`

```ts
import type { StorageProvider } from './types';

export class LocalStorageProvider implements StorageProvider {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key) continue;

      if (!prefix || key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }
}
```

---

## 14.3 StorageService

`services/storage/StorageService.ts`

```ts
import type { StorageProvider } from './types';

export class StorageService {
  constructor(private readonly provider: StorageProvider) {}

  get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    return this.provider.get<T>(key).then((value) => {
      return value === undefined ? defaultValue : value;
    });
  }

  set<T>(key: string, value: T): Promise<void> {
    return this.provider.set(key, value);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  keys(prefix?: string): Promise<string[]> {
    return this.provider.keys(prefix);
  }

  scoped(scope: string): ScopedStorage {
    return new ScopedStorage(this, scope);
  }
}

export class ScopedStorage {
  constructor(
    private readonly storage: StorageService,
    private readonly scope: string,
  ) {}

  get<T>(key: string, defaultValue?: T) {
    return this.storage.get<T>(this.key(key), defaultValue);
  }

  set<T>(key: string, value: T) {
    return this.storage.set(this.key(key), value);
  }

  delete(key: string) {
    return this.storage.delete(this.key(key));
  }

  private key(key: string) {
    return `${this.scope}.${key}`;
  }
}
```

插件系统后面会用：

```ts
services.storage.scoped(`extension.${extensionId}`);
```

---

# 15. ConnectionService 设计，占位版

Phase 2 不做真实 DB，只做连接状态模型，为 Phase 3 铺路。

## 15.1 类型

`services/connection/types.ts`

```ts
export type DbKind = 'sqlite' | 'postgres' | 'mysql';

export interface ConnectionProfile {
  id: string;
  name: string;
  kind: DbKind;
  database?: string;
  host?: string;
  port?: number;
  username?: string;
}

export interface ActiveConnection {
  id: string;
  name: string;
  kind: DbKind;
}
```

---

## 15.2 Service

`services/connection/ConnectionService.ts`

```ts
import { Emitter } from '@/lib/event';
import type { ActiveConnection, ConnectionProfile } from './types';

export class ConnectionService {
  private profiles: ConnectionProfile[] = [];
  private activeConnection: ActiveConnection | undefined;

  private readonly onDidChangeActiveConnectionEmitter = new Emitter<ActiveConnection | undefined>();

  readonly onDidChangeActiveConnection = this.onDidChangeActiveConnectionEmitter.event.bind(
    this.onDidChangeActiveConnectionEmitter,
  );

  getProfiles() {
    return [...this.profiles];
  }

  addProfile(profile: ConnectionProfile) {
    this.profiles.push(profile);
  }

  setActiveConnection(connection: ActiveConnection | undefined) {
    this.activeConnection = connection;
    this.onDidChangeActiveConnectionEmitter.fire(connection);
  }

  getActiveConnection() {
    return this.activeConnection;
  }
}
```

Phase 3 会改成：

```txt
testConnection()
openConnection()
closeConnection()
listTables()
```

---

# 16. 组件改造点

## 16.1 ActivityBar 不直接操作 store

改成：

```tsx
import { services } from '@/app/serviceRegistry';
```

点击时：

```ts
services.command.executeCommand('workbench.showConnections');
```

或者：

```ts
services.workbench.showActivity(id);
```

更推荐执行 command，因为插件和快捷键都可以复用。

---

## 16.2 ConnectionsView 新建按钮

```tsx
<button
  type="button"
  onClick={() => {
    services.command.executeCommand('connection.new');
  }}
>
  <Plus className="h-4 w-4" />
</button>
```

---

## 16.3 WelcomeEditor 按钮

```tsx
<button
  onClick={() => services.command.executeCommand('connection.new')}
>
  New Connection
</button>

<button
  onClick={() => services.command.executeCommand('editor.newQuery')}
>
  New Query
</button>

<button
  onClick={() =>
    services.command.executeCommand('extensions.openMarketplace')
  }
>
  Open Extensions
</button>
```

---

# 17. 菜单 UI MVP

Phase 2 可以先做一个简单的 `MenuButton`，读取 MenuService。

## 17.1 `workbench/menu/MenuButton.tsx`

```tsx
import { services } from '@/app/serviceRegistry';
import type { MenuContext, MenuLocation } from '@/services/menu/types';

interface MenuButtonProps {
  location: MenuLocation;
  context?: MenuContext;
  label?: string;
}

export function MenuButton({ location, context = {}, label = '...' }: MenuButtonProps) {
  const items = services.menu.getMenuItems(location, context);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button className="rounded px-2 py-1 text-xs hover:bg-accent">{label}</button>

      <div className="absolute right-0 top-full z-40 mt-1 min-w-40 rounded-md border bg-popover p-1 shadow">
        {items.map((item) => (
          <button
            key={`${location}-${item.command}`}
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={() => {
              services.command.executeCommand(item.command);
            }}
          >
            {item.title ?? item.command}
          </button>
        ))}
      </div>
    </div>
  );
}
```

第一版缺点是没有点击外部关闭，可以后续替换成 shadcn dropdown-menu。

---

# 18. StatusBar 接入服务

StatusBar 后续从 ConnectionService 读状态。Phase 2 先用事件同步到本地 state。

```tsx
import { useEffect, useState } from 'react';
import { services } from '@/app/serviceRegistry';
import type { ActiveConnection } from '@/services/connection/types';

interface StatusBarProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function StatusBar({ health }: StatusBarProps) {
  const [connection, setConnection] = useState<ActiveConnection | undefined>(
    services.connection.getActiveConnection(),
  );

  useEffect(() => {
    const disposable = services.connection.onDidChangeActiveConnection(setConnection);

    return () => disposable.dispose();
  }, []);

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t bg-primary px-3 text-xs text-primary-foreground">
      <div className="flex items-center gap-4">
        <span>SQL GUI</span>
        <span>{connection ? connection.name : 'No Connection'}</span>
        <span>Dialect: {connection?.kind ?? 'SQL'}</span>
      </div>

      <div className="flex items-center gap-4">
        <span>Plugins: Idle</span>
        <span>Rust Core: {health?.rustCoreReady ? 'Ready' : 'Checking'}</span>
      </div>
    </footer>
  );
}
```

---

# 19. Phase 2 验收命令

执行：

```bash
pnpm --filter @sqlgui/desktop check
pnpm --filter @sqlgui/desktop tauri:dev
```

验证：

```txt
1. Cmd/Ctrl + Shift + P 打开命令面板
2. 命令面板来自 CommandService
3. New Query 命令可创建 Tab
4. Toggle Side Bar 命令可隐藏侧边栏
5. Cmd/Ctrl + B 由 KeybindingService 触发
6. Cmd/Ctrl + J 由 KeybindingService 触发
7. ConnectionsView 的 + 按钮走 connection.new 命令
8. Notification 能显示
9. Logs 面板能看到 command/app 日志
10. MenuService 能贡献菜单项
```

---

# 20. Phase 2 Todo 清单

```txt
基础设施
[ ] 新增 lib/disposable.ts
[ ] 新增 lib/event.ts
[ ] 新增 app/serviceRegistry.ts
[ ] 新增 app/bootstrap.ts
[ ] App.tsx 调用 bootstrapApp

CommandService
[ ] 定义 Command 类型
[ ] 实现 registerCommand
[ ] 实现 executeCommand
[ ] 实现 getCommands
[ ] 实现 command 注册事件
[ ] 注册 workbench.toggleSideBar
[ ] 注册 workbench.toggleBottomPanel
[ ] 注册 workbench.openCommandPalette
[ ] 注册 workbench.showConnections
[ ] 注册 workbench.showExtensions
[ ] 注册 editor.newQuery
[ ] 注册 connection.new
[ ] 注册 extensions.openMarketplace

WorkbenchService
[ ] 封装 showActivity
[ ] 封装 toggleSideBar
[ ] 封装 toggleBottomPanel
[ ] 封装 showBottomPanel
[ ] 封装 openCommandPalette
[ ] 封装 closeCommandPalette

EditorService
[ ] 定义 EditorInput
[ ] 定义 ActiveEditorSnapshot
[ ] 实现 newQuery
[ ] 实现 openEditor
[ ] 实现 closeEditor
[ ] 实现 setActiveEditor
[ ] 实现 getActiveEditor
[ ] 实现 getText / setText
[ ] New Query 改走 EditorService

MenuService
[ ] 定义 MenuLocation
[ ] 定义 MenuItem
[ ] 实现 contribute
[ ] 实现 getMenuItems
[ ] 实现 evaluateWhen
[ ] 注册 editor/title 菜单
[ ] 注册 activity/title 菜单
[ ] 注册 editor/context 菜单

KeybindingService
[ ] 定义 Keybinding 类型
[ ] 实现 normalizeKeyboardEvent
[ ] 实现 registerKeybinding
[ ] 实现 setContext
[ ] 注册 mod+shift+p
[ ] 注册 mod+b
[ ] 注册 mod+j
[ ] 注册 mod+n
[ ] 删除 Phase 1 直接监听快捷键逻辑

NotificationService
[ ] 定义 NotificationItem
[ ] 实现 notificationStore
[ ] 实现 info/success/warning/error
[ ] 实现 NotificationCenter
[ ] Workbench 挂载 NotificationCenter

LogService
[ ] 定义 LogItem
[ ] 实现 logStore
[ ] 实现 debug/info/warn/error
[ ] BottomPanel Logs 接入 logStore
[ ] CommandService 执行命令时写日志

StorageService
[ ] 定义 StorageProvider
[ ] 实现 LocalStorageProvider
[ ] 实现 StorageService
[ ] 实现 ScopedStorage
[ ] 预留 extension scoped storage

ConnectionService
[ ] 定义 ConnectionProfile
[ ] 定义 ActiveConnection
[ ] 实现 getProfiles
[ ] 实现 addProfile
[ ] 实现 setActiveConnection
[ ] StatusBar 监听 active connection

UI 改造
[ ] CommandPalette 改为读取 services.command
[ ] ActivityBar 点击改走 command/service
[ ] WelcomeEditor 按钮改走 command
[ ] ConnectionsView 新建按钮改走 connection.new
[ ] SettingsView 后续可接配置服务

验证
[ ] pnpm check 通过
[ ] tauri:dev 通过
[ ] 快捷键正常
[ ] 命令面板正常
[ ] 通知正常
[ ] 日志正常
```

---

# 21. Phase 2 完成标准

Phase 2 完成后，项目应该具备这几个能力：

```txt
[ ] 命令系统成为所有操作入口
[ ] 快捷键通过 KeybindingService 绑定命令
[ ] 菜单系统可以根据 when 条件动态显示
[ ] 通知系统可用
[ ] 日志系统可用
[ ] EditorService 可以打开/关闭 Query Tab
[ ] ConnectionService 有基础连接状态
[ ] Workbench 组件不再直接散落业务逻辑
[ ] 后续插件可以复用 Command/Menu/Keybinding/Storage 能力
```

---

# 22. Phase 2 最重要的设计原则

这一阶段最关键的是：

> **不要把逻辑写死在组件里。**

错误做法：

```tsx
<button onClick={() => setActiveActivity('extensions')}>Extensions</button>
```

推荐做法：

```tsx
<button onClick={() => services.command.executeCommand('workbench.showExtensions')}>
  Extensions
</button>
```

因为未来插件、菜单、快捷键、命令面板都可以复用同一个命令。

---

# 23. Phase 2 后的架构收益

完成 Phase 2 后，后续阶段会简单很多：

## Phase 3 DB Core

```txt
注册 sql.execute 命令
CommandService 执行
DB Service 调 Rust
LogService 记录查询
NotificationService 显示错误
ResultPanel 展示结果
```

## Phase 5 SQL Editor

```txt
EditorService 接 Monaco
插件通过 EditorService 读写文本
快捷键执行 editor.format
菜单执行 editor.newQuery
```

## Phase 8 插件系统

```txt
插件 manifest contributes.commands
        ↓
ExtensionService 注册到 CommandService
        ↓
contributes.menus 注册到 MenuService
        ↓
contributes.keybindings 注册到 KeybindingService
```

所以 Phase 2 是整个 SQL GUI 后续插件化的地基。
