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
    historyId?: string;
  };
}

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

export interface QueryRecord {
  queryId: string;
  editorId: string;
  connectionId: string;
  sql: string;
  startedAt: number;
  finishedAt?: number;
  elapsedMs?: number;
  success?: boolean;
  result?: QueryResult;
  error?: string;
}

export interface EditorCursorState {
  editorId: string;
  lineNumber: number;
  column: number;
}
