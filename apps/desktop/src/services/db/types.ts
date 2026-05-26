export type DbKind = 'SQLite' | 'PostgreSQL' | 'MySQL';

export interface ConnectionConfig {
  id?: string;
  name: string;
  kind: DbKind;

  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;

  filePath?: string;

  ssl?: boolean;
  connectTimeoutMs?: number;
}

export interface OpenConnectionResult {
  connectionId: string;
  name: string;
  kind: DbKind;
  database?: string;
}

export interface QueryRequest {
  connectionId: string;
  sql: string;
  limit?: number;
  timeoutMs?: number;
  readonly?: boolean;
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: CellValue[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
  message?: string;
}

export interface ColumnMeta {
  name: string;
  databaseType: string;
  nullable?: boolean;
}

export type CellValue =
  | { type: 'Null' }
  | { type: 'Bool'; value: boolean }
  | { type: 'I64'; value: number }
  | { type: 'F64'; value: number }
  | { type: 'String'; value: string }
  | { type: 'Bytes'; value: string }
  | { type: 'Json'; value: unknown };

export interface DatabaseMeta {
  name: string;
}

export interface SchemaMeta {
  name: string;
}

export interface TableMeta {
  schema?: string;
  name: string;
  tableType: string;
}

export interface ColumnSchema {
  schema?: string;
  table: string;
  name: string;
  databaseType: string;
  nullable?: boolean;
  primaryKey: boolean;
  defaultValue?: string;
}
