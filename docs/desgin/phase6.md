下面是 **Phase 6：查询结果表格 / Result Panel 详细设计**。

这一阶段目标是：

> **把 Phase 5 执行 SQL 后返回的结果，稳定、高性能、清晰地展示出来。**

Phase 6 做完后，你的 SQL GUI 就具备了数据库工具最核心的能力：

```txt
写 SQL
  ↓
执行 SQL
  ↓
展示结果表格
  ↓
复制 / 导出 / 查看错误 / 查看耗时
```

---

# Phase 6：查询结果表格设计

## 1. 阶段目标

Phase 6 主要做 6 件事：

```txt
1. 查询结果状态管理
2. Bottom Panel 结果面板
3. ResultGrid 表格渲染
4. 大数据虚拟滚动
5. 复制 / 导出 CSV / JSON
6. 错误与执行信息展示
```

MVP 必须做到：

```txt
[ ] 展示 columns
[ ] 展示 rows
[ ] 支持 NULL / bool / number / string / json / bytes
[ ] 支持多查询结果 Tab
[ ] 支持查询耗时
[ ] 支持 affected rows
[ ] 支持错误展示
[ ] 支持复制单元格
[ ] 支持复制行
[ ] 支持复制全部
[ ] 支持导出 CSV
[ ] 支持导出 JSON
[ ] 支持大数据虚拟滚动
[ ] 支持 truncated 提示
```

暂不做：

```txt
[ ] 单元格编辑
[ ] 行内更新数据库
[ ] 图表可视化
[ ] Explain 可视化
[ ] Pivot Table
[ ] 分页查询
[ ] 流式查询
[ ] 多 Result Set
[ ] 查询取消
[ ] 二进制大字段预览
```

---

# 2. Phase 6 完成后的 UI

Bottom Panel 大概这样：

```txt
┌─────────────────────────────────────────────────────────────┐
│ Results | Messages | Problems | Query History               │
├─────────────────────────────────────────────────────────────┤
│ Result Tabs:                                                │
│ [users.sql - 1000 rows] [SELECT 1] [Error]                  │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: Copy | Export CSV | Export JSON | Rows: 1000 | 23ms │
├─────────────────────────────────────────────────────────────┤
│ # │ id │ name     │ email              │ created_at          │
│ 1 │ 1  │ bai      │ bai@example.com    │ 2026-05-26          │
│ 2 │ 2  │ test     │ test@example.com   │ 2026-05-26          │
└─────────────────────────────────────────────────────────────┘
```

如果 SQL 报错：

```txt
Results | Messages | Problems | Query History

Error: relation "userss" does not exist

SQL:
SELECT * FROM userss LIMIT 1000;

Elapsed: 12ms
Connection: PostgreSQL Dev
```

---

# 3. 目录设计

```txt
apps/desktop/src/workbench/results/
├─ components/
│  ├─ ResultPanel.tsx
│  ├─ ResultTabs.tsx
│  ├─ ResultToolbar.tsx
│  ├─ ResultGrid.tsx
│  ├─ ResultCell.tsx
│  ├─ ResultErrorView.tsx
│  ├─ ResultEmptyState.tsx
│  ├─ ResultStatusBar.tsx
│  ├─ MessagesView.tsx
│  ├─ ProblemsView.tsx
│  └─ QueryHistoryView.tsx
│
├─ services/
│  ├─ resultService.ts
│  ├─ resultExportService.ts
│  ├─ resultCopyService.ts
│  ├─ resultFormatService.ts
│  └─ queryHistoryService.ts
│
├─ store/
│  └─ resultStore.ts
│
├─ utils/
│  ├─ csv.ts
│  ├─ cell.ts
│  └─ clipboard.ts
│
├─ types.ts
└─ index.ts
```

---

# 4. 数据模型设计

## 4.1 查询状态

```ts
// apps/desktop/src/workbench/results/types.ts

export type QueryStatus = 'running' | 'success' | 'error' | 'cancelled';

export interface ResultColumn {
  name: string;
  databaseType: string;
  nullable?: boolean;
}

export type CellValue =
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | Record<string, unknown>
  | unknown[];

export interface QueryResult {
  columns: ResultColumn[];
  rows: CellValue[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
}

export interface QueryRecord {
  queryId: string;
  editorId: string;
  connectionId: string;

  title: string;
  sql: string;

  status: QueryStatus;

  startedAt: number;
  finishedAt?: number;
  elapsedMs?: number;

  result?: QueryResult;
  error?: string;

  selectedCell?: {
    rowIndex: number;
    columnIndex: number;
  };
}
```

---

## 4.2 Result Panel 状态

```ts
export type ResultPanelTab = 'results' | 'messages' | 'problems' | 'history';

export interface ResultPanelState {
  activePanelTab: ResultPanelTab;
  activeQueryId?: string;
  queries: QueryRecord[];
}
```

---

# 5. Result Store

```ts
// apps/desktop/src/workbench/results/store/resultStore.ts

import { create } from 'zustand';
import type { QueryRecord, QueryResult, ResultPanelTab } from '../types';

interface StartQueryPayload {
  queryId: string;
  editorId: string;
  connectionId: string;
  sql: string;
  startedAt: number;
  title?: string;
}

interface FinishQueryPayload {
  queryId: string;
  result?: QueryResult;
  error?: string;
  success: boolean;
  finishedAt: number;
  elapsedMs: number;
}

interface ResultStore {
  activePanelTab: ResultPanelTab;
  activeQueryId?: string;
  queries: QueryRecord[];

  setActivePanelTab: (tab: ResultPanelTab) => void;
  setActiveQuery: (queryId?: string) => void;

  startQuery: (payload: StartQueryPayload) => void;
  finishQuery: (payload: FinishQueryPayload) => void;

  closeQuery: (queryId: string) => void;
  clearQueries: () => void;

  setSelectedCell: (
    queryId: string,
    cell?: {
      rowIndex: number;
      columnIndex: number;
    },
  ) => void;

  getActiveQuery: () => QueryRecord | undefined;
}

export const useResultStore = create<ResultStore>((set, get) => ({
  activePanelTab: 'results',
  activeQueryId: undefined,
  queries: [],

  setActivePanelTab: (tab) =>
    set({
      activePanelTab: tab,
    }),

  setActiveQuery: (queryId) =>
    set({
      activeQueryId: queryId,
      activePanelTab: 'results',
    }),

  startQuery: (payload) =>
    set((state) => {
      const record: QueryRecord = {
        queryId: payload.queryId,
        editorId: payload.editorId,
        connectionId: payload.connectionId,
        title: payload.title ?? createQueryTitle(payload.sql),
        sql: payload.sql,
        status: 'running',
        startedAt: payload.startedAt,
      };

      return {
        queries: [...state.queries, record],
        activeQueryId: payload.queryId,
        activePanelTab: 'results',
      };
    }),

  finishQuery: (payload) =>
    set((state) => ({
      queries: state.queries.map((item) =>
        item.queryId === payload.queryId
          ? {
              ...item,
              status: payload.success ? 'success' : 'error',
              result: payload.result,
              error: payload.error,
              finishedAt: payload.finishedAt,
              elapsedMs: payload.elapsedMs,
            }
          : item,
      ),
      activeQueryId: payload.queryId,
      activePanelTab: payload.success ? 'results' : 'messages',
    })),

  closeQuery: (queryId) =>
    set((state) => {
      const queries = state.queries.filter((item) => item.queryId !== queryId);

      const activeQueryId =
        state.activeQueryId === queryId ? queries.at(-1)?.queryId : state.activeQueryId;

      return {
        queries,
        activeQueryId,
      };
    }),

  clearQueries: () =>
    set({
      queries: [],
      activeQueryId: undefined,
    }),

  setSelectedCell: (queryId, cell) =>
    set((state) => ({
      queries: state.queries.map((item) =>
        item.queryId === queryId
          ? {
              ...item,
              selectedCell: cell,
            }
          : item,
      ),
    })),

  getActiveQuery: () => {
    const state = get();

    return state.queries.find((item) => item.queryId === state.activeQueryId);
  },
}));

function createQueryTitle(sql: string) {
  const firstLine = sql.trim().split('\n').find(Boolean);

  if (!firstLine) return 'Query';

  return firstLine.length > 32 ? `${firstLine.slice(0, 32)}...` : firstLine;
}
```

---

# 6. Result Service

`ResultService` 是 SQL 执行服务写入结果的入口。

```ts
// apps/desktop/src/workbench/results/services/resultService.ts

import { useResultStore } from '../store/resultStore';
import type { QueryResult } from '../types';

export const resultService = {
  startQuery(payload: {
    queryId: string;
    editorId: string;
    connectionId: string;
    sql: string;
    startedAt: number;
    title?: string;
  }) {
    useResultStore.getState().startQuery(payload);
  },

  finishQuery(payload: {
    queryId: string;
    result?: QueryResult;
    error?: string;
    success: boolean;
    finishedAt: number;
    elapsedMs: number;
  }) {
    useResultStore.getState().finishQuery(payload);

    // 后续可以写入查询历史
    // queryHistoryService.record(payload)
  },

  closeQuery(queryId: string) {
    useResultStore.getState().closeQuery(queryId);
  },

  clearQueries() {
    useResultStore.getState().clearQueries();
  },
};
```

---

# 7. Result Panel 组件

```tsx
// apps/desktop/src/workbench/results/components/ResultPanel.tsx

import { useResultStore } from '../store/resultStore';
import { ResultTabs } from './ResultTabs';
import { ResultGrid } from './ResultGrid';
import { ResultToolbar } from './ResultToolbar';
import { ResultErrorView } from './ResultErrorView';
import { ResultEmptyState } from './ResultEmptyState';
import { MessagesView } from './MessagesView';
import { ProblemsView } from './ProblemsView';
import { QueryHistoryView } from './QueryHistoryView';

export function ResultPanel() {
  const activePanelTab = useResultStore((state) => state.activePanelTab);
  const setActivePanelTab = useResultStore((state) => state.setActivePanelTab);
  const activeQuery = useResultStore((state) => state.getActiveQuery());

  return (
    <div className="flex h-full flex-col border-t bg-background">
      <div className="flex h-9 border-b text-sm">
        <PanelTab
          active={activePanelTab === 'results'}
          onClick={() => setActivePanelTab('results')}
        >
          Results
        </PanelTab>

        <PanelTab
          active={activePanelTab === 'messages'}
          onClick={() => setActivePanelTab('messages')}
        >
          Messages
        </PanelTab>

        <PanelTab
          active={activePanelTab === 'problems'}
          onClick={() => setActivePanelTab('problems')}
        >
          Problems
        </PanelTab>

        <PanelTab
          active={activePanelTab === 'history'}
          onClick={() => setActivePanelTab('history')}
        >
          Query History
        </PanelTab>
      </div>

      {activePanelTab === 'results' ? <ResultsContent activeQuery={activeQuery} /> : null}

      {activePanelTab === 'messages' ? <MessagesView /> : null}
      {activePanelTab === 'problems' ? <ProblemsView /> : null}
      {activePanelTab === 'history' ? <QueryHistoryView /> : null}
    </div>
  );
}

function ResultsContent(props: { activeQuery?: any }) {
  const { activeQuery } = props;

  if (!activeQuery) {
    return <ResultEmptyState />;
  }

  if (activeQuery.status === 'running') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Running query...
      </div>
    );
  }

  if (activeQuery.status === 'error') {
    return <ResultErrorView query={activeQuery} />;
  }

  if (!activeQuery.result) {
    return <ResultEmptyState />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ResultTabs />

      <ResultToolbar query={activeQuery} />

      <div className="min-h-0 flex-1">
        <ResultGrid query={activeQuery} />
      </div>
    </div>
  );
}

function PanelTab(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={[
        'border-r px-3 text-xs',
        props.active
          ? 'bg-background text-foreground'
          : 'bg-muted/40 text-muted-foreground hover:text-foreground',
      ].join(' ')}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
```

---

# 8. Result Tabs

查询结果可能有多个：

```txt
SELECT users
SELECT orders
Error
UPDATE result
```

```tsx
// apps/desktop/src/workbench/results/components/ResultTabs.tsx

import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useResultStore } from '../store/resultStore';
import { resultService } from '../services/resultService';

export function ResultTabs() {
  const queries = useResultStore((state) => state.queries);
  const activeQueryId = useResultStore((state) => state.activeQueryId);
  const setActiveQuery = useResultStore((state) => state.setActiveQuery);

  if (!queries.length) return null;

  return (
    <div className="flex h-8 border-b bg-muted/30 text-xs">
      {queries.map((query) => {
        const active = query.queryId === activeQueryId;

        return (
          <div
            key={query.queryId}
            className={[
              'flex max-w-56 items-center gap-1 border-r px-2',
              active ? 'bg-background' : 'text-muted-foreground',
            ].join(' ')}
            onClick={() => setActiveQuery(query.queryId)}
          >
            <QueryStatusIcon status={query.status} />

            <span className="truncate">{query.title}</span>

            <button
              className="ml-1 rounded p-0.5 hover:bg-accent"
              onClick={(event) => {
                event.stopPropagation();
                resultService.closeQuery(query.queryId);
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

function QueryStatusIcon(props: { status: string }) {
  if (props.status === 'running') {
    return <Loader2 className="h-3 w-3 animate-spin" />;
  }

  if (props.status === 'error') {
    return <XCircle className="h-3 w-3 text-destructive" />;
  }

  if (props.status === 'success') {
    return <CheckCircle2 className="h-3 w-3 text-green-500" />;
  }

  return null;
}
```

---

# 9. Result Toolbar

Toolbar 功能：

```txt
Copy Cell
Copy Row
Copy All
Export CSV
Export JSON
Clear
Rows count
Elapsed time
Truncated warning
```

```tsx
// apps/desktop/src/workbench/results/components/ResultToolbar.tsx

import { Copy, Download, FileJson, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QueryRecord } from '../types';
import { resultCopyService } from '../services/resultCopyService';
import { resultExportService } from '../services/resultExportService';
import { resultService } from '../services/resultService';

interface ResultToolbarProps {
  query: QueryRecord;
}

export function ResultToolbar(props: ResultToolbarProps) {
  const { query } = props;
  const result = query.result;

  if (!result) return null;

  const rowCount = result.rows.length;
  const columnCount = result.columns.length;

  return (
    <div className="flex h-9 items-center gap-1 border-b px-2 text-xs">
      <Button size="sm" variant="ghost" onClick={() => resultCopyService.copySelectedCell(query)}>
        <Copy className="mr-1 h-3 w-3" />
        Cell
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultCopyService.copySelectedRow(query)}>
        <Copy className="mr-1 h-3 w-3" />
        Row
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultCopyService.copyAll(query)}>
        <Copy className="mr-1 h-3 w-3" />
        All
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultExportService.exportCsv(query)}>
        <Download className="mr-1 h-3 w-3" />
        CSV
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultExportService.exportJson(query)}>
        <FileJson className="mr-1 h-3 w-3" />
        JSON
      </Button>

      <Button size="sm" variant="ghost" onClick={() => resultService.clearQueries()}>
        <Trash2 className="mr-1 h-3 w-3" />
        Clear
      </Button>

      <div className="ml-auto flex items-center gap-3 text-muted-foreground">
        {result.truncated ? <span className="text-yellow-600">Truncated</span> : null}

        <span>
          {rowCount} rows × {columnCount} columns
        </span>

        <span>{query.elapsedMs ?? result.elapsedMs}ms</span>

        {typeof result.affectedRows === 'number' ? (
          <span>affected {result.affectedRows}</span>
        ) : null}
      </div>
    </div>
  );
}
```

---

# 10. ResultGrid 设计

## 10.1 为什么要虚拟滚动

SQL 查询结果可能有：

```txt
1000 行
10000 行
100000 行
```

如果直接渲染所有 DOM，会卡爆。

MVP 目标：

```txt
默认 limit 1000
前端仍使用虚拟滚动
后续支持分页/流式
```

推荐：

```bash
pnpm --filter sqlgui-desktop add @tanstack/react-table @tanstack/react-virtual
```

---

## 10.2 ResultGrid 代码草案

```tsx
// apps/desktop/src/workbench/results/components/ResultGrid.tsx

import { useMemo, useRef } from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { QueryRecord } from '../types';
import { useResultStore } from '../store/resultStore';
import { formatCellValue } from '../services/resultFormatService';

interface ResultGridProps {
  query: QueryRecord;
}

interface RowData {
  __rowIndex: number;
  [key: string]: unknown;
}

export function ResultGrid(props: ResultGridProps) {
  const { query } = props;
  const result = query.result!;

  const setSelectedCell = useResultStore((state) => state.setSelectedCell);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo<RowData[]>(() => {
    return result.rows.map((row, rowIndex) => {
      const record: RowData = {
        __rowIndex: rowIndex,
      };

      result.columns.forEach((column, columnIndex) => {
        record[column.name || `column_${columnIndex}`] = row[columnIndex];
      });

      return record;
    });
  }, [result.rows, result.columns]);

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    const rowNumberColumn: ColumnDef<RowData> = {
      id: '__rowNumber',
      header: '#',
      size: 56,
      cell: ({ row }) => <div className="text-right text-muted-foreground">{row.index + 1}</div>,
    };

    const dataColumns = result.columns.map(
      (column, columnIndex) =>
        ({
          id: column.name || `column_${columnIndex}`,
          accessorKey: column.name || `column_${columnIndex}`,
          header: () => (
            <div className="flex flex-col">
              <span className="truncate font-medium">
                {column.name || `(column ${columnIndex + 1})`}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {column.databaseType}
              </span>
            </div>
          ),
          cell: ({ row }: any) => {
            const value = result.rows[row.index]?.[columnIndex];
            const selected =
              query.selectedCell?.rowIndex === row.index &&
              query.selectedCell?.columnIndex === columnIndex;

            return (
              <button
                className={[
                  'block h-full w-full truncate px-2 py-1 text-left',
                  selected ? 'bg-primary/20' : '',
                ].join(' ')}
                title={formatCellValue(value)}
                onClick={() => {
                  setSelectedCell(query.queryId, {
                    rowIndex: row.index,
                    columnIndex,
                  });
                }}
              >
                {renderCell(value)}
              </button>
            );
          },
          size: 180,
        }) satisfies ColumnDef<RowData>,
    );

    return [rowNumberColumn, ...dataColumns];
  }, [result.columns, result.rows, query, setSelectedCell]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-full overflow-auto text-xs">
      <div className="sticky top-0 z-10 flex border-b bg-muted">
        {table.getHeaderGroups()[0].headers.map((header) => (
          <div
            key={header.id}
            className="shrink-0 border-r px-2 py-1"
            style={{
              width: header.getSize(),
            }}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
      </div>

      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];

          return (
            <div
              key={row.id}
              className="absolute left-0 flex border-b hover:bg-accent/50"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <div
                  key={cell.id}
                  className="shrink-0 border-r"
                  style={{
                    width: cell.column.getSize(),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderCell(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">NULL</span>;
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
```

---

# 11. Cell 格式化

```ts
// apps/desktop/src/workbench/results/services/resultFormatService.ts

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (value instanceof Uint8Array) {
    return `<binary ${value.byteLength} bytes>`;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export function formatCellForCopy(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
```

---

# 12. 复制功能

## 12.1 支持范围

```txt
复制单元格
复制整行
复制全部结果
复制列名
复制为 CSV
复制为 JSON
```

MVP 先做：

```txt
copySelectedCell
copySelectedRow
copyAll
```

---

## 12.2 Clipboard 工具

```ts
// apps/desktop/src/workbench/results/utils/clipboard.ts

export async function writeClipboardText(text: string) {
  await navigator.clipboard.writeText(text);
}
```

后续可以换成 Tauri clipboard plugin。

---

## 12.3 Copy Service

```ts
// apps/desktop/src/workbench/results/services/resultCopyService.ts

import type { QueryRecord } from '../types';
import { formatCellForCopy } from './resultFormatService';
import { writeClipboardText } from '../utils/clipboard';
import { toCsv } from '../utils/csv';

export const resultCopyService = {
  async copySelectedCell(query: QueryRecord) {
    const cell = query.selectedCell;

    if (!cell || !query.result) {
      return;
    }

    const value = query.result.rows[cell.rowIndex]?.[cell.columnIndex];

    await writeClipboardText(formatCellForCopy(value));
  },

  async copySelectedRow(query: QueryRecord) {
    const cell = query.selectedCell;

    if (!cell || !query.result) {
      return;
    }

    const row = query.result.rows[cell.rowIndex];

    if (!row) return;

    const text = row.map(formatCellForCopy).join('\t');

    await writeClipboardText(text);
  },

  async copyAll(query: QueryRecord) {
    if (!query.result) return;

    const csv = toCsv(
      query.result.columns.map((item) => item.name),
      query.result.rows,
    );

    await writeClipboardText(csv);
  },
};
```

---

# 13. CSV 工具

```ts
// apps/desktop/src/workbench/results/utils/csv.ts

import { formatCellForCopy } from '../services/resultFormatService';

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [];

  lines.push(headers.map(escapeCsvCell).join(','));

  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvCell(formatCellForCopy(cell))).join(','));
  }

  return lines.join('\n');
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');

  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
```

---

# 14. 导出功能

## 14.1 MVP 导出策略

先用浏览器下载 Blob：

```txt
Export CSV
Export JSON
```

后续再用 Tauri save dialog：

```txt
选择保存路径
写入本地文件
支持大文件流式写入
```

---

## 14.2 Export Service

```ts
// apps/desktop/src/workbench/results/services/resultExportService.ts

import type { QueryRecord } from '../types';
import { toCsv } from '../utils/csv';

export const resultExportService = {
  exportCsv(query: QueryRecord) {
    if (!query.result) return;

    const csv = toCsv(
      query.result.columns.map((item) => item.name),
      query.result.rows,
    );

    downloadText(csv, createFileName(query, 'csv'), 'text/csv;charset=utf-8');
  },

  exportJson(query: QueryRecord) {
    if (!query.result) return;

    const columns = query.result.columns;

    const rows = query.result.rows.map((row) => {
      const record: Record<string, unknown> = {};

      columns.forEach((column, index) => {
        record[column.name || `column_${index}`] = row[index];
      });

      return record;
    });

    downloadText(
      JSON.stringify(rows, null, 2),
      createFileName(query, 'json'),
      'application/json;charset=utf-8',
    );
  },
};

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function createFileName(query: QueryRecord, ext: string) {
  const date = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');

  return `sqlgui-result-${date}.${ext}`;
}
```

---

# 15. 错误展示

```tsx
// apps/desktop/src/workbench/results/components/ResultErrorView.tsx

import type { QueryRecord } from '../types';

interface ResultErrorViewProps {
  query: QueryRecord;
}

export function ResultErrorView(props: ResultErrorViewProps) {
  const { query } = props;

  return (
    <div className="h-full overflow-auto p-3 text-sm">
      <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
        <div className="mb-1 font-medium">Query failed</div>

        <pre className="whitespace-pre-wrap text-xs">{query.error}</pre>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">SQL</div>

        <pre className="rounded-md border bg-muted/40 p-3 text-xs">{query.sql}</pre>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">Elapsed: {query.elapsedMs ?? '-'}ms</div>
    </div>
  );
}
```

---

# 16. Messages View

Messages 用来展示最近一次查询的执行信息、错误、affected rows。

```tsx
// apps/desktop/src/workbench/results/components/MessagesView.tsx

import { useResultStore } from '../store/resultStore';

export function MessagesView() {
  const queries = useResultStore((state) => state.queries);

  if (!queries.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No messages.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2 text-xs">
      {queries
        .slice()
        .reverse()
        .map((query) => (
          <div key={query.queryId} className="mb-2 rounded-md border p-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium">{query.status.toUpperCase()}</span>

              <span className="text-muted-foreground">{query.elapsedMs ?? '-'}ms</span>
            </div>

            {query.error ? (
              <pre className="whitespace-pre-wrap text-destructive">{query.error}</pre>
            ) : (
              <div className="text-muted-foreground">
                {query.result?.rows.length ?? 0} rows returned.
                {typeof query.result?.affectedRows === 'number'
                  ? ` ${query.result.affectedRows} affected.`
                  : ''}
              </div>
            )}

            <pre className="mt-2 line-clamp-3 whitespace-pre-wrap text-muted-foreground">
              {query.sql}
            </pre>
          </div>
        ))}
    </div>
  );
}
```

---

# 17. Query History

Phase 6 可以顺手做一个轻量查询历史。

## 17.1 存储内容

```ts
export interface QueryHistoryItem {
  id: string;
  connectionId: string;
  sql: string;
  success: boolean;
  elapsedMs: number;
  rowCount?: number;
  error?: string;
  createdAt: number;
}
```

## 17.2 History Service

```ts
// apps/desktop/src/workbench/results/services/queryHistoryService.ts

const STORAGE_KEY = 'sqlgui.query.history';
const MAX_HISTORY = 200;

export interface QueryHistoryItem {
  id: string;
  connectionId: string;
  sql: string;
  success: boolean;
  elapsedMs: number;
  rowCount?: number;
  error?: string;
  createdAt: number;
}

export const queryHistoryService = {
  load(): QueryHistoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  append(item: QueryHistoryItem) {
    const history = this.load();

    const next = [item, ...history].slice(0, MAX_HISTORY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
```

在 `finishQuery` 里记录：

```ts
queryHistoryService.append({
  id: payload.queryId,
  connectionId: query.connectionId,
  sql: query.sql,
  success: payload.success,
  elapsedMs: payload.elapsedMs,
  rowCount: payload.result?.rows.length,
  error: payload.error,
  createdAt: Date.now(),
});
```

---

## 17.3 History View

```tsx
// apps/desktop/src/workbench/results/components/QueryHistoryView.tsx

import { useEffect, useState } from 'react';
import { queryHistoryService, type QueryHistoryItem } from '../services/queryHistoryService';
import { editorService } from '@/workbench/editor/services/editorService';
import { Button } from '@/components/ui/button';

export function QueryHistoryView() {
  const [items, setItems] = useState<QueryHistoryItem[]>([]);

  useEffect(() => {
    setItems(queryHistoryService.load());
  }, []);

  function clear() {
    queryHistoryService.clear();
    setItems([]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center border-b px-2">
        <Button size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 text-xs">
        {items.map((item) => (
          <div
            key={item.id}
            className="mb-2 cursor-default rounded-md border p-2 hover:bg-accent"
            onDoubleClick={() => {
              editorService.openSql({
                title: 'History.sql',
                content: item.sql,
                connectionId: item.connectionId,
                source: {
                  type: 'history',
                },
              });
            }}
          >
            <div className="mb-1 flex gap-2">
              <span className={item.success ? 'text-green-600' : 'text-destructive'}>
                {item.success ? 'SUCCESS' : 'ERROR'}
              </span>

              <span className="text-muted-foreground">{item.elapsedMs}ms</span>

              <span className="text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>

            <pre className="line-clamp-3 whitespace-pre-wrap text-muted-foreground">{item.sql}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

# 18. Problems View

Phase 6 的 Problems 可以先占位。
后续用于：

```txt
SQL 语法诊断
连接问题
插件错误
执行警告
```

```tsx
// apps/desktop/src/workbench/results/components/ProblemsView.tsx

export function ProblemsView() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      No problems.
    </div>
  );
}
```

---

# 19. 查询执行和 Result Panel 打通

Phase 5 的 `sqlExecutionService` 应该这样写入结果：

```ts
const queryId = crypto.randomUUID();
const startedAt = Date.now();

resultService.startQuery({
  queryId,
  editorId: tab.id,
  connectionId: tab.connectionId,
  sql,
  startedAt,
  title: tab.title,
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
    result,
    success: true,
    finishedAt: Date.now(),
    elapsedMs: result.elapsedMs,
  });
} catch (err) {
  resultService.finishQuery({
    queryId,
    error: err instanceof Error ? err.message : String(err),
    success: false,
    finishedAt: Date.now(),
    elapsedMs: Date.now() - startedAt,
  });
}
```

---

# 20. Rust 返回结果约束

Phase 6 要倒逼 Rust DB 层把结果格式统一。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<CellValue>>,
    pub affected_rows: Option<u64>,
    pub elapsed_ms: u64,
    pub truncated: bool,
}
```

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CellValue {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Bytes(String),
    Json(serde_json::Value),
}
```

前端收到 Rust enum 时，最好统一 normalize。

---

# 21. CellValue Normalize

如果 Rust enum 序列化成：

```json
{ "String": "hello" }
```

前端不好用。

建议 Rust `CellValue` 改成 tagged 或直接 value-like。
MVP 更推荐：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "camelCase")]
pub enum CellValue {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Bytes(String),
    Json(serde_json::Value),
}
```

前端类型：

```ts
export type NativeCellValue =
  | { type: 'null' }
  | { type: 'bool'; value: boolean }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'bytes'; value: string }
  | { type: 'json'; value: unknown };
```

normalize：

```ts
export function normalizeCellValue(cell: NativeCellValue): unknown {
  switch (cell.type) {
    case 'null':
      return null;
    case 'bool':
    case 'number':
    case 'string':
    case 'bytes':
    case 'json':
      return cell.value;
    default:
      return null;
  }
}
```

也可以直接让 Rust 返回 `serde_json::Value`，MVP 更省事，但类型精度差一点。

---

# 22. 大结果集策略

Phase 6 先做：

```txt
Rust 默认 LIMIT 1000
前端虚拟滚动
超过 limit 标记 truncated
```

不要一开始做分页和流式。

后续演进：

```txt
Phase 7/8：
- 查询取消
- 流式返回
- 分页加载
- 服务端 cursor
- 大结果导出走 Rust 文件流
```

MVP 约束：

```txt
单次最多 1000 或 5000 行
每行最多 200 列
单元格字符串超过 2000 字符截断展示
复制/导出使用完整值
```

---

# 23. 单元格展示策略

```txt
NULL        -> 灰色 italic NULL
String      -> 普通文本
Number      -> 右对齐，可后续做
Bool        -> true / false
JSON        -> 单行 JSON，title 显示完整
Bytes       -> <binary N bytes>
Long Text   -> 截断 + tooltip
Date        -> 字符串展示，后续格式化
```

`ResultCell` 可以单独抽：

```tsx
// apps/desktop/src/workbench/results/components/ResultCell.tsx

import { formatCellValue } from '../services/resultFormatService';

interface ResultCellProps {
  value: unknown;
  selected?: boolean;
  onClick?: () => void;
}

export function ResultCell(props: ResultCellProps) {
  const { value, selected, onClick } = props;

  if (value === null || value === undefined) {
    return (
      <button
        className={[
          'block h-full w-full truncate px-2 py-1 text-left italic text-muted-foreground',
          selected ? 'bg-primary/20' : '',
        ].join(' ')}
        onClick={onClick}
      >
        NULL
      </button>
    );
  }

  return (
    <button
      className={[
        'block h-full w-full truncate px-2 py-1 text-left',
        selected ? 'bg-primary/20' : '',
      ].join(' ')}
      title={formatCellValue(value)}
      onClick={onClick}
    >
      {formatCellValue(value)}
    </button>
  );
}
```

---

# 24. 右键菜单设计

ResultGrid 单元格右键：

```txt
Copy Cell
Copy Row
Copy Column Name
Copy All
View Cell
Export CSV
Export JSON
```

MVP 可以先不做真正 ContextMenu，只做 Toolbar。
如果要做，可以用 shadcn `ContextMenu`。

---

# 25. 查看大字段 / JSON 预览

MVP 可以做一个简单 Cell Viewer Dialog：

```txt
双击单元格
  ↓
打开弹窗
  ↓
显示完整内容
  ↓
支持复制
```

先不强制做，但非常有用。

```tsx
// components/CellViewerDialog.tsx

export function CellViewerDialog(props: {
  open: boolean;
  value: unknown;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cell Value</DialogTitle>
        </DialogHeader>

        <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">
          {formatCellValue(props.value)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 26. 插件扩展点预留

Phase 6 要给插件系统留口子。

后续插件可能要做：

```txt
结果渲染器
JSON viewer
Chart renderer
Explain renderer
Geo data renderer
Image/blob preview
Export provider
```

预留接口：

```ts
export interface ResultRendererContribution {
  id: string;
  name: string;
  when?: string;
  render: (context: ResultRendererContext) => React.ReactNode;
}

export interface ResultRendererContext {
  queryId: string;
  columns: ResultColumn[];
  rows: unknown[][];
  sql: string;
  connectionId: string;
}
```

MVP 先不开放插件 API，但内部结构不要写死只有表格。

建议 `ResultsContent` 设计成：

```txt
ResultViewHost
  ├─ table renderer
  ├─ json renderer
  ├─ plugin renderer
```

---

# 27. ResultViewHost 草案

```tsx
// components/ResultViewHost.tsx

import type { QueryRecord } from '../types';
import { ResultGrid } from './ResultGrid';

interface ResultViewHostProps {
  query: QueryRecord;
}

export function ResultViewHost(props: ResultViewHostProps) {
  const { query } = props;

  // MVP 只有 table
  return <ResultGrid query={query} />;
}
```

后续插件系统进来：

```ts
const renderer = resultRendererRegistry.match(query)
return renderer ? renderer.render(context) : <ResultGrid query={query} />
```

---

# 28. 性能注意点

Phase 6 容易卡的地方：

```txt
1. rows 转 object 过大
2. columns useMemo 依赖 rows 导致重算
3. 每个 cell 都创建复杂组件
4. JSON.stringify 过多
5. title tooltip 生成大字符串
6. 复制全部大量字符串卡 UI
```

MVP 优化建议：

```txt
[ ] 默认 limit 1000
[ ] ResultGrid 使用虚拟滚动
[ ] columns 只依赖 result.columns
[ ] cell 内容按需格式化
[ ] 大字段只展示前 300 字符
[ ] 导出大数据后续交给 Rust
```

更好的 `formatPreview`：

```ts
export function formatCellPreview(value: unknown, maxLength = 300) {
  const text = formatCellValue(value);

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
```

---

# 29. 和 BottomPanel 布局联动

Workbench 的 BottomPanel 应该接入 ResultPanel：

```tsx
// workbench/layout/BottomPanel.tsx

import { ResultPanel } from '@/workbench/results/components/ResultPanel';

export function BottomPanel() {
  return (
    <div className="h-full">
      <ResultPanel />
    </div>
  );
}
```

BottomPanel 需要可调整高度：

```txt
默认 280px
最小 160px
最大 70vh
支持拖拽改变高度
```

可以后续用 `react-resizable-panels`。

---

# 30. 命令系统集成

Phase 6 注册这些命令：

```txt
result.copyCell
result.copyRow
result.copyAll
result.exportCsv
result.exportJson
result.clear
result.closeActive
result.openHistory
```

```ts
// apps/desktop/src/workbench/results/registerResultCommands.ts

import { commandService } from '@/services/commandService';
import { useResultStore } from './store/resultStore';
import { resultCopyService } from './services/resultCopyService';
import { resultExportService } from './services/resultExportService';
import { resultService } from './services/resultService';

export function registerResultCommands() {
  commandService.register({
    id: 'result.copyCell',
    title: 'Copy Cell',
    category: 'Result',
    source: 'core',
    handler: async () => {
      const query = useResultStore.getState().getActiveQuery();
      if (query) await resultCopyService.copySelectedCell(query);
    },
  });

  commandService.register({
    id: 'result.copyRow',
    title: 'Copy Row',
    category: 'Result',
    source: 'core',
    handler: async () => {
      const query = useResultStore.getState().getActiveQuery();
      if (query) await resultCopyService.copySelectedRow(query);
    },
  });

  commandService.register({
    id: 'result.copyAll',
    title: 'Copy All Results',
    category: 'Result',
    source: 'core',
    handler: async () => {
      const query = useResultStore.getState().getActiveQuery();
      if (query) await resultCopyService.copyAll(query);
    },
  });

  commandService.register({
    id: 'result.exportCsv',
    title: 'Export Result as CSV',
    category: 'Result',
    source: 'core',
    handler: async () => {
      const query = useResultStore.getState().getActiveQuery();
      if (query) resultExportService.exportCsv(query);
    },
  });

  commandService.register({
    id: 'result.exportJson',
    title: 'Export Result as JSON',
    category: 'Result',
    source: 'core',
    handler: async () => {
      const query = useResultStore.getState().getActiveQuery();
      if (query) resultExportService.exportJson(query);
    },
  });

  commandService.register({
    id: 'result.clear',
    title: 'Clear Results',
    category: 'Result',
    source: 'core',
    handler: async () => {
      resultService.clearQueries();
    },
  });
}
```

---

# 31. 快捷键设计

```txt
Cmd/Ctrl + C       复制选中单元格，焦点在 ResultGrid 时
Cmd/Ctrl + Shift+C 复制整行
Cmd/Ctrl + E       导出 CSV，可后续
Delete             关闭当前 Result Tab，可选
```

MVP 可以先不做 ResultGrid 内快捷键，只做 Toolbar + 命令面板。

---

# 32. Rust DB 层需要配合的点

Phase 6 对 Rust 的要求：

```txt
[ ] 查询返回 columns
[ ] 查询返回 rows
[ ] 查询返回 elapsedMs
[ ] 查询返回 affectedRows
[ ] 查询返回 truncated
[ ] 错误信息尽量结构化
[ ] 默认 limit 生效
[ ] timeout 生效
```

建议错误类型：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbErrorPayload {
    pub code: String,
    pub message: String,
    pub detail: Option<String>,
}
```

前端可以更好展示：

```txt
code: "syntax_error"
message: "syntax error at or near ..."
detail: "line 1 column 15"
```

MVP 先返回 string 也行，但后面最好结构化。

---

# 33. 查询结果内存策略

MVP 不要让用户一次性查太多：

```txt
默认 1000 行
上限 5000 行
超出显示 truncated
```

Rust 查询时可以：

```txt
用户 SQL 外层包装 limit，或者只对 SELECT 自动追加 LIMIT
```

更保守做法：

```txt
不改用户 SQL
但 DB Core 内部最多读取 maxRows + 1
如果超过 maxRows，truncated = true
```

这个比自动改 SQL 更安全。

---

# 34. Phase 6 开发顺序

推荐顺序：

```txt
1. 定义 results/types.ts
2. 实现 resultStore
3. 实现 resultService
4. BottomPanel 接入 ResultPanel
5. 实现 ResultTabs
6. 实现 ResultToolbar
7. 实现 ResultErrorView
8. 实现 ResultGrid 静态表格
9. 接入 @tanstack/react-table
10. 接入 @tanstack/react-virtual
11. 打通 sqlExecutionService -> resultService
12. 实现单元格选择
13. 实现复制 Cell / Row / All
14. 实现 CSV / JSON 导出
15. 实现 MessagesView
16. 实现 QueryHistory
17. 注册 result commands
18. 优化大字段展示
19. 做验收测试
```

---

# 35. 测试用例

## 35.1 单元测试

```txt
[ ] formatCellValue(null) -> "NULL"
[ ] formatCellValue(object) -> JSON string
[ ] toCsv 正确转义逗号
[ ] toCsv 正确转义双引号
[ ] toCsv 正确转义换行
[ ] resultStore.startQuery 正确新增
[ ] resultStore.finishQuery 成功状态正确
[ ] resultStore.finishQuery 错误状态正确
[ ] copySelectedCell 复制正确
[ ] exportJson 结构正确
```

## 35.2 手动测试

```txt
[ ] SELECT 1 能展示 1 行 1 列
[ ] SELECT 多列能展示 columns
[ ] SELECT 1000 行不卡
[ ] 查询报错能展示错误
[ ] UPDATE 能展示 affectedRows
[ ] 选中单元格能复制
[ ] 选中行能复制
[ ] Copy All 能复制 CSV
[ ] Export CSV 下载文件
[ ] Export JSON 下载文件
[ ] 多次执行 SQL 生成多个 result tab
[ ] 关闭 result tab 正常
[ ] Clear 清空结果
[ ] 查询历史能看到记录
[ ] 双击历史能重新打开 SQL
```

---

# 36. Phase 6 完成标准

做到下面这些，就算 Phase 6 完成：

```txt
[ ] SQL 执行成功后展示表格
[ ] SQL 执行失败后展示错误
[ ] 支持多个查询结果 Tab
[ ] 支持行列数量展示
[ ] 支持查询耗时展示
[ ] 支持 affectedRows 展示
[ ] 支持 truncated 提示
[ ] 支持虚拟滚动
[ ] 支持选中单元格
[ ] 支持复制单元格
[ ] 支持复制整行
[ ] 支持复制全部结果
[ ] 支持导出 CSV
[ ] 支持导出 JSON
[ ] 支持 Messages View
[ ] 支持 Query History
[ ] ResultPanel 已接入 Workbench BottomPanel
```

---

# 37. 最小闭环

Phase 6 最小闭环是：

```txt
SQL Editor 输入：
SELECT 1 AS id, 'hello' AS name;

Cmd/Ctrl + Enter
  ↓
Rust 返回 QueryResult
  ↓
resultService.finishQuery
  ↓
ResultPanel 自动打开
  ↓
ResultGrid 展示：
id | name
1  | hello
```

第二个闭环：

```txt
SQL 写错：
SELECT * FROM not_exists;

执行
  ↓
Messages 展示错误
  ↓
Result Tab 标红
```

第三个闭环：

```txt
查询 users 表
  ↓
选中某个 cell
  ↓
Copy Cell
  ↓
粘贴到外部编辑器
```

---

# 38. Phase 6 的核心设计原则

这一阶段不要把重点放在“炫酷表格”，而是建立稳定抽象：

```txt
QueryRecord
ResultStore
ResultService
ResultPanel
ResultGrid
Copy/Export Service
QueryHistory
Plugin Renderer Boundary
```

后续插件系统会基于 Phase 6 扩展出：

```txt
Explain Viewer 插件
Chart Renderer 插件
JSON Viewer 插件
CSV Export 插件
Data Masking 插件
Result Formatter 插件
```

所以 Phase 6 最重要的是：

> **结果数据不要和 UI 表格强绑定，要先抽象成 QueryRecord，然后由 ResultViewHost 渲染。**

这样后面做插件市场时，插件才能贡献自己的结果渲染器。
