下面是 **Phase 5：SQL 编辑器详细设计**。

这一阶段目标是：

> **做出一个真正可用的 SQL Editor：支持多 Tab、绑定连接、选中执行、快捷键执行、查询历史、草稿保存，并和 Phase 4 的连接树打通。**

Phase 5 做完以后，用户的主流程应该是：

```txt
左侧连接树选择表
  ↓
右键 Select Top 1000
  ↓
自动打开 SQL Editor
  ↓
编辑 SQL
  ↓
Cmd/Ctrl + Enter 执行
  ↓
Bottom Panel 展示结果
```

---

# 1. Phase 5 目标

## 1.1 必做

```txt
[ ] 接入 Monaco Editor
[ ] 支持 SQL 高亮
[ ] 支持多 Tab
[ ] 支持新建 Query Tab
[ ] 每个 Tab 绑定 connectionId
[ ] 支持当前 activeEditor
[ ] 支持选中 SQL 执行
[ ] 没有选中时执行全文
[ ] 支持 Cmd/Ctrl + Enter 执行
[ ] 支持 Cmd/Ctrl + S 保存草稿
[ ] 支持关闭 Tab
[ ] 支持未保存状态 *
[ ] 支持 SQL 草稿持久化
[ ] 支持从连接树打开 SQL
[ ] 支持查询结果和 Editor 关联
[ ] 支持基础错误展示
```

## 1.2 暂不做

```txt
[ ] 完整 SQL LSP
[ ] 高级智能补全
[ ] AI SQL 生成
[ ] 多光标复杂命令
[ ] SQL 格式化插件
[ ] Vim 模式
[ ] 代码片段市场
[ ] 复杂 explain 可视化
[ ] schema-aware 高级语义诊断
```

---

# 2. 技术选型

推荐：

```txt
Monaco Editor
```

原因：

```txt
1. 类 VS Code 体验
2. SQL 高亮现成
3. 支持快捷键、Command、Action
4. 支持多模型 Model
5. 后续容易接补全、诊断、hover
6. 和 VS Code 架构风格更统一
```

备选：

```txt
CodeMirror 6
```

如果你更追求轻量，可以换 CodeMirror。但你的目标是“仿 VS Code 架构”，所以 Phase 5 建议直接用 Monaco。

---

# 3. 目录设计

```txt
apps/desktop/src/workbench/editor/
├─ components/
│  ├─ SqlEditorArea.tsx
│  ├─ SqlEditor.tsx
│  ├─ EditorTabs.tsx
│  ├─ EditorTabItem.tsx
│  ├─ EditorToolbar.tsx
│  ├─ ConnectionSelector.tsx
│  └─ EmptyEditorState.tsx
│
├─ services/
│  ├─ editorService.ts
│  ├─ editorStorage.ts
│  ├─ sqlExecutionService.ts
│  ├─ sqlSelection.ts
│  ├─ sqlModelService.ts
│  └─ sqlGenerator.ts
│
├─ store/
│  └─ editorStore.ts
│
├─ monaco/
│  ├─ setupMonaco.ts
│  ├─ sqlCompletionProvider.ts
│  ├─ sqlTheme.ts
│  └─ sqlCommands.ts
│
├─ types.ts
└─ index.ts
```

---

# 4. Editor 数据模型

## 4.1 Editor Tab

```ts
// apps/desktop/src/workbench/editor/types.ts

export type SqlEditorKind = 'query' | 'readonly';

export interface SqlEditorTab {
  id: string;
  title: string;
  kind: SqlEditorKind;

  connectionId?: string;
  database?: string;
  schema?: string;

  content: string;
  language: 'sql';

  dirty: boolean;
  readonly?: boolean;

  createdAt: number;
  updatedAt: number;

  source?: {
    type: 'connection-tree' | 'history' | 'manual' | 'plugin';
    nodeId?: string;
  };
}
```

## 4.2 执行请求

```ts
export interface ExecuteSqlPayload {
  editorId: string;
  connectionId: string;
  sql: string;
  selected?: boolean;
}

export interface SqlExecutionResult {
  queryId: string;
  editorId: string;
  connectionId: string;
  sql: string;
  startedAt: number;
  finishedAt: number;
  elapsedMs: number;
  success: boolean;
  result?: QueryResult;
  error?: string;
}

export interface QueryResult {
  columns: Array<{
    name: string;
    databaseType: string;
    nullable?: boolean;
  }>;
  rows: unknown[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
}
```

---

# 5. Editor Store

用 Zustand 管理 editor 状态。

```ts
// apps/desktop/src/workbench/editor/store/editorStore.ts

import { create } from 'zustand';
import type { SqlEditorTab } from '../types';

interface EditorStore {
  tabs: SqlEditorTab[];
  activeEditorId?: string;

  openEditor: (tab: SqlEditorTab) => void;
  closeEditor: (editorId: string) => void;
  setActiveEditor: (editorId?: string) => void;

  updateEditorContent: (editorId: string, content: string) => void;
  updateEditor: (editorId: string, patch: Partial<SqlEditorTab>) => void;

  setEditorConnection: (editorId: string, connectionId?: string) => void;

  getActiveEditor: () => SqlEditorTab | undefined;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeEditorId: undefined,

  openEditor: (tab) =>
    set((state) => {
      const exists = state.tabs.some((item) => item.id === tab.id);

      return {
        tabs: exists
          ? state.tabs.map((item) => (item.id === tab.id ? tab : item))
          : [...state.tabs, tab],
        activeEditorId: tab.id,
      };
    }),

  closeEditor: (editorId) =>
    set((state) => {
      const nextTabs = state.tabs.filter((item) => item.id !== editorId);

      let nextActive = state.activeEditorId;

      if (state.activeEditorId === editorId) {
        nextActive = nextTabs.at(-1)?.id;
      }

      return {
        tabs: nextTabs,
        activeEditorId: nextActive,
      };
    }),

  setActiveEditor: (editorId) =>
    set({
      activeEditorId: editorId,
    }),

  updateEditorContent: (editorId, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === editorId
          ? {
              ...tab,
              content,
              dirty: true,
              updatedAt: Date.now(),
            }
          : tab,
      ),
    })),

  updateEditor: (editorId, patch) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === editorId
          ? {
              ...tab,
              ...patch,
              updatedAt: Date.now(),
            }
          : tab,
      ),
    })),

  setEditorConnection: (editorId, connectionId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === editorId
          ? {
              ...tab,
              connectionId,
              dirty: true,
              updatedAt: Date.now(),
            }
          : tab,
      ),
    })),

  getActiveEditor: () => {
    const state = get();
    return state.tabs.find((tab) => tab.id === state.activeEditorId);
  },
}));
```

---

# 6. Editor Service

`EditorService` 是外部模块操作编辑器的统一入口。
Phase 4 的连接树、Phase 8 的插件系统都应该通过它打开/修改 SQL。

```ts
// apps/desktop/src/workbench/editor/services/editorService.ts

import { useEditorStore } from '../store/editorStore';
import type { SqlEditorTab } from '../types';

export interface OpenSqlOptions {
  title?: string;
  content?: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  source?: SqlEditorTab['source'];
}

export const editorService = {
  newQuery(connectionId?: string) {
    const now = Date.now();

    const tab: SqlEditorTab = {
      id: crypto.randomUUID(),
      title: 'Untitled.sql',
      kind: 'query',
      language: 'sql',
      content: '',
      connectionId,
      dirty: false,
      createdAt: now,
      updatedAt: now,
      source: {
        type: 'manual',
      },
    };

    useEditorStore.getState().openEditor(tab);

    return tab.id;
  },

  openSql(options: OpenSqlOptions) {
    const now = Date.now();

    const tab: SqlEditorTab = {
      id: crypto.randomUUID(),
      title: options.title ?? 'Query.sql',
      kind: 'query',
      language: 'sql',
      content: options.content ?? '',
      connectionId: options.connectionId,
      database: options.database,
      schema: options.schema,
      dirty: false,
      createdAt: now,
      updatedAt: now,
      source: options.source ?? {
        type: 'manual',
      },
    };

    useEditorStore.getState().openEditor(tab);

    return tab.id;
  },

  closeEditor(editorId: string) {
    useEditorStore.getState().closeEditor(editorId);
  },

  setActiveEditor(editorId: string) {
    useEditorStore.getState().setActiveEditor(editorId);
  },

  getActiveEditor() {
    return useEditorStore.getState().getActiveEditor();
  },

  updateContent(editorId: string, content: string) {
    useEditorStore.getState().updateEditorContent(editorId, content);
  },

  setConnection(editorId: string, connectionId?: string) {
    useEditorStore.getState().setEditorConnection(editorId, connectionId);
  },
};
```

---

# 7. Monaco 接入设计

## 7.1 安装依赖

```bash
pnpm --filter sqlgui-desktop add @monaco-editor/react monaco-editor
```

## 7.2 Monaco Setup

```ts
// apps/desktop/src/workbench/editor/monaco/setupMonaco.ts

import type * as monaco from 'monaco-editor';

export function setupMonaco(monacoInstance: typeof monaco) {
  monacoInstance.editor.defineTheme('sqlgui-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.sql', foreground: 'C586C0' },
      { token: 'string.sql', foreground: 'CE9178' },
      { token: 'number.sql', foreground: 'B5CEA8' },
      { token: 'comment.sql', foreground: '6A9955' },
    ],
    colors: {
      'editor.background': '#0f1115',
      'editorLineNumber.foreground': '#6b7280',
      'editorCursor.foreground': '#ffffff',
    },
  });

  monacoInstance.editor.defineTheme('sqlgui-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    },
  });
}
```

---

# 8. SqlEditor 组件

```tsx
// apps/desktop/src/workbench/editor/components/SqlEditor.tsx

import Editor, { OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useRef } from 'react';
import type { SqlEditorTab } from '../types';
import { editorService } from '../services/editorService';
import { sqlExecutionService } from '../services/sqlExecutionService';
import { setupMonaco } from '../monaco/setupMonaco';

interface SqlEditorProps {
  tab: SqlEditorTab;
}

export function SqlEditor(props: SqlEditorProps) {
  const { tab } = props;

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    setupMonaco(monacoInstance);

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      sqlExecutionService.executeEditor(tab.id, editor);
    });

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      editorService.updateEditor(tab.id, {
        dirty: false,
      });
    });

    editor.focus();
  };

  return (
    <Editor
      height="100%"
      language="sql"
      theme="sqlgui-dark"
      value={tab.content}
      options={{
        minimap: {
          enabled: false,
        },
        fontSize: 13,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: false,
        formatOnType: false,
        readOnly: Boolean(tab.readonly),
      }}
      onMount={handleMount}
      onChange={(value) => {
        editorService.updateContent(tab.id, value ?? '');
      }}
    />
  );
}
```

---

# 9. Editor Area

```tsx
// apps/desktop/src/workbench/editor/components/SqlEditorArea.tsx

import { useEditorStore } from '../store/editorStore';
import { EditorTabs } from './EditorTabs';
import { SqlEditor } from './SqlEditor';
import { EmptyEditorState } from './EmptyEditorState';

export function SqlEditorArea() {
  const tabs = useEditorStore((state) => state.tabs);
  const activeEditorId = useEditorStore((state) => state.activeEditorId);

  const activeTab = tabs.find((tab) => tab.id === activeEditorId);

  if (!activeTab) {
    return <EmptyEditorState />;
  }

  return (
    <div className="flex h-full flex-col">
      <EditorTabs tabs={tabs} activeEditorId={activeEditorId} />

      <div className="border-b">
        <EditorToolbar tab={activeTab} />
      </div>

      <div className="min-h-0 flex-1">
        <SqlEditor tab={activeTab} />
      </div>
    </div>
  );
}
```

---

# 10. Editor Tabs

```tsx
// apps/desktop/src/workbench/editor/components/EditorTabs.tsx

import { X } from 'lucide-react';
import type { SqlEditorTab } from '../types';
import { editorService } from '../services/editorService';

interface EditorTabsProps {
  tabs: SqlEditorTab[];
  activeEditorId?: string;
}

export function EditorTabs(props: EditorTabsProps) {
  const { tabs, activeEditorId } = props;

  return (
    <div className="flex h-9 border-b bg-muted/30">
      {tabs.map((tab) => {
        const active = tab.id === activeEditorId;

        return (
          <div
            key={tab.id}
            className={[
              'flex min-w-36 max-w-56 items-center gap-2 border-r px-3 text-sm',
              active ? 'bg-background' : 'bg-muted/30 text-muted-foreground',
            ].join(' ')}
            onClick={() => editorService.setActiveEditor(tab.id)}
          >
            <span className="truncate">
              {tab.dirty ? '* ' : ''}
              {tab.title}
            </span>

            <button
              className="ml-auto rounded p-0.5 hover:bg-accent"
              onClick={(event) => {
                event.stopPropagation();
                editorService.closeEditor(tab.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

---

# 11. Editor Toolbar

Toolbar 负责：

```txt
当前连接选择
执行按钮
停止按钮，Phase 5 可占位
保存草稿
格式化，Phase 8 插件实现
```

```tsx
// apps/desktop/src/workbench/editor/components/EditorToolbar.tsx

import { Play, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SqlEditorTab } from '../types';
import { ConnectionSelector } from './ConnectionSelector';
import { sqlExecutionService } from '../services/sqlExecutionService';
import { editorService } from '../services/editorService';

interface EditorToolbarProps {
  tab: SqlEditorTab;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { tab } = props;

  return (
    <div className="flex h-9 items-center gap-2 px-2">
      <ConnectionSelector
        value={tab.connectionId}
        onChange={(connectionId) => {
          editorService.setConnection(tab.id, connectionId);
        }}
      />

      <Button size="sm" variant="default" onClick={() => sqlExecutionService.executeEditor(tab.id)}>
        <Play className="mr-1 h-3 w-3" />
        Run
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          editorService.updateEditor(tab.id, {
            dirty: false,
          });
        }}
      >
        <Save className="mr-1 h-3 w-3" />
        Save
      </Button>

      <div className="ml-auto text-xs text-muted-foreground">
        {tab.connectionId ? 'Connected query' : 'No connection'}
      </div>
    </div>
  );
}
```

---

# 12. ConnectionSelector

```tsx
// apps/desktop/src/workbench/editor/components/ConnectionSelector.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConnectionStore } from '@/workbench/connections/store/connectionStore';

interface ConnectionSelectorProps {
  value?: string;
  onChange: (connectionId?: string) => void;
}

export function ConnectionSelector(props: ConnectionSelectorProps) {
  const { value, onChange } = props;

  const profiles = useConnectionStore((state) => state.profiles);
  const runtime = useConnectionStore((state) => state.runtime);

  return (
    <Select value={value ?? ''} onValueChange={(next) => onChange(next || undefined)}>
      <SelectTrigger className="h-7 w-56">
        <SelectValue placeholder="Select connection" />
      </SelectTrigger>

      <SelectContent>
        {profiles.map((profile) => {
          const status = runtime[profile.id]?.status ?? 'disconnected';

          return (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.name} · {status}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

---

# 13. SQL 选择逻辑

执行时规则：

```txt
如果用户选中了 SQL：
  执行选中内容

否则：
  执行当前光标所在语句，Phase 5 可选

再否则：
  执行全文
```

MVP 可以先做：

```txt
选中内容 > 全文
```

后续再做“当前语句识别”。

```ts
// apps/desktop/src/workbench/editor/services/sqlSelection.ts

import type * as monaco from 'monaco-editor';

export function getSelectedSqlOrFullText(editor: monaco.editor.IStandaloneCodeEditor) {
  const model = editor.getModel();
  if (!model) return '';

  const selection = editor.getSelection();

  if (selection && !selection.isEmpty()) {
    return model.getValueInRange(selection).trim();
  }

  return model.getValue().trim();
}
```

后续可以加当前语句解析：

```ts
export function getCurrentStatement(sql: string, offset: number) {
  // MVP 先不做复杂 SQL parser
  // 后续用 ; 分割 + 光标位置判断
}
```

---

# 14. SQL 执行服务

```ts
// apps/desktop/src/workbench/editor/services/sqlExecutionService.ts

import type * as monaco from 'monaco-editor';
import { dbService } from '@/services/db/dbService';
import { editorService } from './editorService';
import { getSelectedSqlOrFullText } from './sqlSelection';
import { resultService } from '@/workbench/results/services/resultService';

export const sqlExecutionService = {
  async executeEditor(editorId: string, monacoEditor?: monaco.editor.IStandaloneCodeEditor | null) {
    const tab = editorService.getEditorById?.(editorId) ?? editorService.getActiveEditor();

    if (!tab) {
      throw new Error('No active editor.');
    }

    if (!tab.connectionId) {
      throw new Error('No connection selected.');
    }

    let sql = tab.content.trim();

    if (monacoEditor) {
      sql = getSelectedSqlOrFullText(monacoEditor);
    }

    if (!sql) {
      throw new Error('SQL is empty.');
    }

    const queryId = crypto.randomUUID();
    const startedAt = Date.now();

    resultService.startQuery({
      queryId,
      editorId: tab.id,
      connectionId: tab.connectionId,
      sql,
      startedAt,
    });

    try {
      const result = await dbService.executeQuery({
        connectionId: tab.connectionId,
        sql,
        limit: 1000,
        timeoutMs: 30_000,
      });

      resultService.finishQuery({
        queryId,
        editorId: tab.id,
        connectionId: tab.connectionId,
        sql,
        startedAt,
        finishedAt: Date.now(),
        elapsedMs: result.elapsedMs,
        success: true,
        result,
      });
    } catch (err) {
      resultService.finishQuery({
        queryId,
        editorId: tab.id,
        connectionId: tab.connectionId,
        sql,
        startedAt,
        finishedAt: Date.now(),
        elapsedMs: Date.now() - startedAt,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
```

上面用了 `getEditorById`，补到 `editorService`：

```ts
getEditorById(editorId: string) {
  return useEditorStore.getState().tabs.find((tab) => tab.id === editorId)
}
```

---

# 15. ResultService 联动

Phase 5 要和 Phase 6/结果面板打通。
如果 ResultGrid 已经在 Phase 6 做，那 Phase 5 可以先只实现结果状态接口。

```ts
// apps/desktop/src/workbench/results/services/resultService.ts

import { useResultStore } from '../store/resultStore';
import type { SqlExecutionResult } from '@/workbench/editor/types';

export const resultService = {
  startQuery(payload: {
    queryId: string;
    editorId: string;
    connectionId: string;
    sql: string;
    startedAt: number;
  }) {
    useResultStore.getState().startQuery(payload);
  },

  finishQuery(result: SqlExecutionResult) {
    useResultStore.getState().finishQuery(result);
  },
};
```

---

# 16. 从连接树打开 SQL

Phase 4 表右键生成 SQL，Phase 5 接收。

```ts
// apps/desktop/src/workbench/connections/services/sqlGenerator.ts

import type { ConnectionTreeNode } from '../types';

export function generateSelectTopSql(node: ConnectionTreeNode) {
  const table = quoteFullTableName(node);

  return `SELECT *\nFROM ${table}\nLIMIT 1000;`;
}

export function quoteFullTableName(node: ConnectionTreeNode) {
  const parts = [node.schema, node.table].filter(Boolean);

  if (node.meta?.kind === 'mysql') {
    return parts.map((item) => `\`${item}\``).join('.');
  }

  return parts.map((item) => `"${item}"`).join('.');
}
```

```ts
// 连接树右键命令 handler

import { editorService } from '@/workbench/editor/services/editorService';
import { generateSelectTopSql } from './sqlGenerator';

async function openSelectTop1000(node: ConnectionTreeNode) {
  const sql = generateSelectTopSql(node);

  editorService.openSql({
    title: `${node.table}.sql`,
    content: sql,
    connectionId: node.connectionId,
    database: node.database,
    schema: node.schema,
    source: {
      type: 'connection-tree',
      nodeId: node.id,
    },
  });
}
```

---

# 17. CommandService 集成

Phase 5 要注册这些命令：

```txt
editor.newQuery
editor.close
editor.save
editor.run
editor.runSelection
editor.setConnection
editor.copySql
editor.clear
```

```ts
// apps/desktop/src/workbench/editor/registerEditorCommands.ts

import { commandService } from '@/services/commandService';
import { editorService } from './services/editorService';
import { sqlExecutionService } from './services/sqlExecutionService';
import { useConnectionStore } from '@/workbench/connections/store/connectionStore';

export function registerEditorCommands() {
  commandService.register({
    id: 'editor.newQuery',
    title: 'New Query',
    category: 'Editor',
    source: 'core',
    handler: async () => {
      const activeConnectionId = useConnectionStore.getState().activeConnectionId;

      editorService.newQuery(activeConnectionId);
    },
  });

  commandService.register({
    id: 'editor.run',
    title: 'Run SQL',
    category: 'SQL',
    source: 'core',
    handler: async () => {
      const active = editorService.getActiveEditor();
      if (!active) return;

      await sqlExecutionService.executeEditor(active.id);
    },
  });

  commandService.register({
    id: 'editor.save',
    title: 'Save SQL Draft',
    category: 'Editor',
    source: 'core',
    handler: async () => {
      const active = editorService.getActiveEditor();
      if (!active) return;

      editorService.updateEditor(active.id, {
        dirty: false,
      });
    },
  });

  commandService.register({
    id: 'editor.close',
    title: 'Close Editor',
    category: 'Editor',
    source: 'core',
    handler: async () => {
      const active = editorService.getActiveEditor();
      if (!active) return;

      editorService.closeEditor(active.id);
    },
  });
}
```

---

# 18. 快捷键设计

MVP 快捷键：

```txt
Cmd/Ctrl + N          新建 Query
Cmd/Ctrl + Enter      执行 SQL
Cmd/Ctrl + S          保存草稿
Cmd/Ctrl + W          关闭当前 Tab
Cmd/Ctrl + P          命令面板，或者文件快速打开
Cmd/Ctrl + Shift + P  命令面板
```

```ts
// apps/desktop/src/workbench/editor/monaco/sqlCommands.ts

export function registerEditorKeybindings() {
  // 全局快捷键可以走 KeybindingService
  // Monaco 内部快捷键在 SqlEditor onMount 注册
}
```

全局 KeybindingService 草案：

```ts
// apps/desktop/src/services/keybindingService.ts

import { commandService } from './commandService';

interface Keybinding {
  key: string;
  command: string;
}

const keybindings: Keybinding[] = [
  {
    key: 'mod+n',
    command: 'editor.newQuery',
  },
  {
    key: 'mod+s',
    command: 'editor.save',
  },
  {
    key: 'mod+w',
    command: 'editor.close',
  },
  {
    key: 'mod+shift+p',
    command: 'commandPalette.open',
  },
];

export function setupGlobalKeybindings() {
  window.addEventListener('keydown', async (event) => {
    const key = normalizeKey(event);
    const matched = keybindings.find((item) => item.key === key);

    if (!matched) return;

    event.preventDefault();
    await commandService.execute(matched.command);
  });
}

function normalizeKey(event: KeyboardEvent) {
  const parts: string[] = [];

  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.shiftKey) parts.push('shift');
  if (event.altKey) parts.push('alt');

  parts.push(event.key.toLowerCase());

  return parts.join('+');
}
```

---

# 19. SQL 草稿持久化

## 19.1 存什么

```txt
tabs
activeEditorId
每个 tab 的：
- id
- title
- content
- connectionId
- database
- schema
- dirty
- createdAt
- updatedAt
```

## 19.2 Storage

```ts
// apps/desktop/src/workbench/editor/services/editorStorage.ts

import type { SqlEditorTab } from '../types';

const STORAGE_KEY = 'sqlgui.editor.tabs';

export interface EditorSnapshot {
  tabs: SqlEditorTab[];
  activeEditorId?: string;
}

export const editorStorage = {
  load(): EditorSnapshot {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        tabs: [],
      };
    }

    try {
      return JSON.parse(raw) as EditorSnapshot;
    } catch {
      return {
        tabs: [],
      };
    }
  },

  save(snapshot: EditorSnapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  },
};
```

## 19.3 自动保存

```ts
// apps/desktop/src/workbench/editor/hooks/useEditorAutoSave.ts

import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { editorStorage } from '../services/editorStorage';

export function useEditorAutoSave() {
  const tabs = useEditorStore((state) => state.tabs);
  const activeEditorId = useEditorStore((state) => state.activeEditorId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      editorStorage.save({
        tabs,
        activeEditorId,
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [tabs, activeEditorId]);
}
```

## 19.4 启动恢复

```ts
// apps/desktop/src/workbench/editor/hooks/useRestoreEditors.ts

import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { editorStorage } from '../services/editorStorage';

export function useRestoreEditors() {
  const setActiveEditor = useEditorStore((state) => state.setActiveEditor);

  useEffect(() => {
    const snapshot = editorStorage.load();

    for (const tab of snapshot.tabs) {
      useEditorStore.getState().openEditor(tab);
    }

    setActiveEditor(snapshot.activeEditorId);
  }, [setActiveEditor]);
}
```

---

# 20. SQL 补全 MVP

Phase 5 只做非常基础的补全：

```txt
SELECT
FROM
WHERE
JOIN
GROUP BY
ORDER BY
LIMIT
INSERT
UPDATE
DELETE
CREATE TABLE
ALTER TABLE
DROP TABLE
```

后续再从 schema 获取表名/字段名。

```ts
// apps/desktop/src/workbench/editor/monaco/sqlCompletionProvider.ts

import type * as monaco from 'monaco-editor';

const keywords = [
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'INSERT INTO',
  'UPDATE',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
];

export function registerSqlCompletionProvider(monacoInstance: typeof monaco) {
  monacoInstance.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems(model, position) {
      const suggestions = keywords.map((keyword) => ({
        label: keyword,
        kind: monacoInstance.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range: getWordRange(monacoInstance, model, position),
      }));

      return {
        suggestions,
      };
    },
  });
}

function getWordRange(
  monacoInstance: typeof monaco,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
) {
  const word = model.getWordUntilPosition(position);

  return new monacoInstance.Range(
    position.lineNumber,
    word.startColumn,
    position.lineNumber,
    word.endColumn,
  );
}
```

在 `setupMonaco` 里调用：

```ts
registerSqlCompletionProvider(monacoInstance);
```

---

# 21. 编辑器状态和 StatusBar 联动

StatusBar 显示：

```txt
连接名 | SQL | Line 12, Column 5 | UTF-8 | LF
```

MVP 可以先做：

```txt
当前连接名
当前编辑器是否 dirty
当前行列
```

```ts
export interface EditorCursorState {
  editorId: string;
  lineNumber: number;
  column: number;
}
```

在 Monaco 里监听：

```ts
editor.onDidChangeCursorPosition((event) => {
  statusBarService.setItem('editor.cursor', {
    text: `Ln ${event.position.lineNumber}, Col ${event.position.column}`,
  });
});
```

---

# 22. 和插件系统的边界

虽然插件系统在后续阶段，但 Phase 5 要提前留 API：

```ts
export interface EditorApi {
  getActiveEditor(): SqlEditorTab | undefined;
  getText(editorId: string): Promise<string>;
  getSelectedText(editorId: string): Promise<string>;
  getSelectedTextOrDocumentText(editorId: string): Promise<string>;
  replaceSelection(editorId: string, text: string): Promise<void>;
  insertText(editorId: string, text: string): Promise<void>;
  openSql(options: OpenSqlOptions): Promise<string>;
}
```

插件以后不能直接操作 Monaco 实例，只能走 `EditorService`。

这个边界很重要：

```txt
插件 API
  ↓
EditorService
  ↓
EditorStore + Monaco Adapter
```

不要让插件拿到真实 `monaco.editor.IStandaloneCodeEditor`。

---

# 23. Editor Adapter 设计

为了后续插件能替换选区内容，需要保留 Monaco 实例注册表。

```ts
// apps/desktop/src/workbench/editor/services/sqlModelService.ts

import type * as monaco from 'monaco-editor';

class SqlModelService {
  private editors = new Map<string, monaco.editor.IStandaloneCodeEditor>();

  registerEditor(editorId: string, editor: monaco.editor.IStandaloneCodeEditor) {
    this.editors.set(editorId, editor);

    return {
      dispose: () => {
        this.editors.delete(editorId);
      },
    };
  }

  getEditor(editorId: string) {
    return this.editors.get(editorId);
  }

  getSelectedText(editorId: string) {
    const editor = this.getEditor(editorId);
    const model = editor?.getModel();
    const selection = editor?.getSelection();

    if (!editor || !model || !selection) return '';

    return model.getValueInRange(selection);
  }

  replaceSelection(editorId: string, text: string) {
    const editor = this.getEditor(editorId);
    const selection = editor?.getSelection();

    if (!editor || !selection) return;

    editor.executeEdits('sqlgui', [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
  }

  insertText(editorId: string, text: string) {
    const editor = this.getEditor(editorId);
    const position = editor?.getPosition();

    if (!editor || !position) return;

    editor.executeEdits('sqlgui', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text,
        forceMoveMarkers: true,
      },
    ]);
  }
}

export const sqlModelService = new SqlModelService();
```

在 `SqlEditor` mount 时注册：

```ts
const disposable = sqlModelService.registerEditor(tab.id, editor);

return () => disposable.dispose();
```

---

# 24. 未保存关闭确认

Phase 5 可以先做简单 confirm：

```ts
closeEditor(editorId: string) {
  const tab = useEditorStore
    .getState()
    .tabs.find((item) => item.id === editorId)

  if (tab?.dirty) {
    const confirmed = window.confirm(
      `${tab.title} has unsaved changes. Close it?`,
    )

    if (!confirmed) return
  }

  useEditorStore.getState().closeEditor(editorId)
}
```

后面替换成 shadcn AlertDialog。

---

# 25. 危险 SQL 提醒

Phase 5 可以在前端做一层简单提醒，但真正安全判断应在 Rust DB Core。

```ts
export function isDangerousSql(sql: string) {
  const normalized = sql.trim().toLowerCase();

  return (
    normalized.startsWith('drop ') ||
    normalized.startsWith('truncate ') ||
    normalized.startsWith('alter ') ||
    normalized.startsWith('delete ') ||
    normalized.startsWith('update ') ||
    normalized.startsWith('insert ')
  );
}
```

执行前：

```ts
if (isDangerousSql(sql)) {
  const confirmed = window.confirm('This SQL may modify data. Continue?');

  if (!confirmed) return;
}
```

MVP 先这样。后续做成更好的 Confirm Dialog。

---

# 26. 错误处理

## 26.1 执行错误分类

```txt
SQL 语法错误
连接未打开
连接超时
权限错误
查询取消
未知错误
```

## 26.2 错误展示位置

```txt
1. Bottom Panel / Messages
2. Toast
3. Editor Decorations，后续做
```

MVP 先展示在 Bottom Panel。

---

# 27. Phase 5 验收标准

完成后应该满足：

```txt
[ ] 可以新建 Query Tab
[ ] 可以关闭 Query Tab
[ ] 可以切换 Query Tab
[ ] Tab 能显示 dirty 状态
[ ] 可以绑定数据库连接
[ ] 可以输入 SQL
[ ] SQL 有基础高亮
[ ] Cmd/Ctrl + Enter 可以执行
[ ] 选中 SQL 时只执行选中内容
[ ] 未选中时执行全文
[ ] 执行结果进入 Bottom Panel
[ ] 执行错误进入 Messages
[ ] 连接树右键 Select Top 1000 能打开 SQL Editor
[ ] 重启应用后草稿能恢复
[ ] Command Palette 能执行 editor.newQuery/editor.run/editor.save
```

---

# 28. 推荐开发顺序

```txt
1. 安装 Monaco
2. 实现 SqlEditorTab 类型
3. 实现 editorStore
4. 实现 editorService
5. 实现 EditorTabs
6. 实现 SqlEditorArea
7. 实现 SqlEditor
8. 实现 ConnectionSelector
9. 实现 Toolbar Run
10. 实现 Ctrl/Cmd + Enter
11. 实现 sqlSelection
12. 实现 sqlExecutionService
13. 打通 dbService.executeQuery
14. 打通 resultService
15. 打通连接树 Select Top 1000
16. 实现草稿保存/恢复
17. 注册 editor commands
18. 做基础补全
19. 做错误展示
20. 做验收测试
```

---

# 29. Phase 5 最小闭环

最小闭环不要贪多，就做这条线：

```txt
点击 New Query
  ↓
打开 Monaco Editor
  ↓
选择连接
  ↓
输入 SELECT 1
  ↓
Cmd/Ctrl + Enter
  ↓
Rust 执行 SQL
  ↓
Bottom Panel 显示结果
```

然后再做：

```txt
连接树右键表
  ↓
Select Top 1000
  ↓
自动打开 SQL Tab
  ↓
执行并显示结果
```

---

# 30. Phase 5 最终定位

Phase 5 的重点不是“把编辑器做得特别强”，而是建立好这个核心抽象：

```txt
Editor Tab
Editor Store
Editor Service
Monaco Adapter
SQL Execution Service
Command Integration
Connection Binding
Result Binding
```

后续插件系统会大量依赖这些能力：

```txt
SQL formatter 插件 -> editor.read/editor.write
SQL snippet 插件 -> editor.insertText
Explain 插件 -> editor.getSelectedText + db.explain
AI SQL 插件 -> editor.replaceSelection
Theme 插件 -> monaco theme contribution
```

所以这一阶段要把边界设计好：**插件、连接树、命令系统都只能通过 EditorService 操作编辑器，不直接碰 Monaco 实例。**
