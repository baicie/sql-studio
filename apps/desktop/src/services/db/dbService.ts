import { callNative } from '@/services/native/invoke';
import type {
  ColumnSchema,
  ConnectionConfig,
  DatabaseMeta,
  OpenConnectionResult,
  QueryRequest,
  QueryResult,
  SchemaMeta,
  TableMeta,
} from './types';

export class DbService {
  testConnection(config: ConnectionConfig): Promise<void> {
    return callNative<void>('db_test_connection', { config });
  }

  openConnection(config: ConnectionConfig): Promise<OpenConnectionResult> {
    return callNative<OpenConnectionResult>('db_open_connection', {
      config,
    });
  }

  closeConnection(connectionId: string): Promise<void> {
    return callNative<void>('db_close_connection', {
      connectionId,
    });
  }

  executeQuery(request: QueryRequest): Promise<QueryResult> {
    return callNative<QueryResult>('db_execute_query', {
      request,
    });
  }

  listDatabases(connectionId: string): Promise<DatabaseMeta[]> {
    return callNative<DatabaseMeta[]>('db_list_databases', {
      connectionId,
    });
  }

  listSchemas(connectionId: string): Promise<SchemaMeta[]> {
    return callNative<SchemaMeta[]>('db_list_schemas', {
      connectionId,
    });
  }

  listTables(connectionId: string, schema?: string): Promise<TableMeta[]> {
    return callNative<TableMeta[]>('db_list_tables', {
      connectionId,
      schema,
    });
  }

  listColumns(connectionId: string, table: string, schema?: string): Promise<ColumnSchema[]> {
    return callNative<ColumnSchema[]>('db_list_columns', {
      connectionId,
      schema,
      table,
    });
  }
}

export const dbService = new DbService();
