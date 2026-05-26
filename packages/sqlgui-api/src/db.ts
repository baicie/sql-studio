import type { Event } from './event';

export type DbKind = 'sqlite' | 'postgres' | 'mysql';

export interface DbConnection {
  id: string;
  name: string;
  kind: DbKind;
  database?: string;
  connected: boolean;
}

export interface DatabaseMeta {
  name: string;
}

export interface SchemaMeta {
  name: string;
}

export interface TableMeta {
  name: string;
  schema?: string;
  tableType: string;
}

export interface ColumnMeta {
  name: string;
  databaseType: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
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
  rows: unknown[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
}

export interface ExplainRequest {
  connectionId: string;
  sql: string;
}

export interface DatabaseApi {
  readonly onDidChangeConnections: Event<DbConnection[]>;
  readonly onDidChangeActiveConnection: Event<DbConnection | undefined>;

  getActiveConnection(): Promise<DbConnection | undefined>;

  getConnections(): Promise<DbConnection[]>;

  listDatabases(connectionId: string): Promise<DatabaseMeta[]>;

  listSchemas(connectionId: string, database?: string): Promise<SchemaMeta[]>;

  listTables(
    connectionId: string,
    options?: {
      database?: string;
      schema?: string;
    },
  ): Promise<TableMeta[]>;

  listColumns(
    connectionId: string,
    options: {
      database?: string;
      schema?: string;
      table: string;
    },
  ): Promise<ColumnMeta[]>;

  query(request: QueryRequest): Promise<QueryResult>;

  explain(request: ExplainRequest): Promise<QueryResult>;
}
