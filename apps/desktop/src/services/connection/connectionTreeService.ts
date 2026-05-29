import { dbService } from '@/services/db/dbService';
import type {
  ConnectionProfile,
  ConnectionTreeNode,
  ConnectionTreeNodeType,
  DbKind,
} from '@/services/connection/types';

export function createNodeId(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(':');
}

export function parseNodeId(id: string): {
  type: ConnectionTreeNodeType;
  connectionId: string;
  database?: string;
  schema?: string;
  table?: string;
} {
  const parts = id.split(':');
  const type = parts[0] as ConnectionTreeNodeType;
  const connectionId = parts[1] ?? '';
  const database = parts[2];
  const schema = parts[3];
  const table = parts[4];

  return { type, connectionId, database, schema, table };
}

export function createRootNode(profile: ConnectionProfile): ConnectionTreeNode {
  return {
    id: createNodeId('connection', profile.id),
    type: 'connection',
    name: profile.name,
    connectionId: profile.id,
    isLeaf: false,
    meta: {
      kind: profile.kind,
    },
  };
}

export async function loadNodeChildren(node: ConnectionTreeNode): Promise<ConnectionTreeNode[]> {
  const { type, connectionId, database, schema, table } = parseNodeId(node.id);
  const kind = node.meta?.kind as DbKind | undefined;

  switch (type) {
    case 'connection':
      return loadConnectionChildren(connectionId, kind);

    case 'database':
      if (!database) return [];
      return loadDatabaseChildren(connectionId, database, kind);

    case 'schema': {
      if (!schema) return [];
      const ctx = database ?? schema;
      return loadTables(connectionId, ctx, schema);
    }

    case 'tables': {
      // The tables folder is a grouping node; its children (table nodes) are
      // already returned by loadDatabaseChildren / loadTables as siblings.
      return [];
    }

    case 'columns': {
      // The columns folder is a grouping node; its children (column nodes) are
      // already returned by loadColumns as siblings. Return empty so the
      // grouping folder itself cannot be further expanded.
      return [];
    }

    case 'table':
      if (!database || !schema || !table) return [];
      return loadColumns(connectionId, database, schema, table);

    case 'column':
      return [];

    default:
      return [];
  }
}

async function loadConnectionChildren(
  connectionId: string,
  kind?: DbKind,
): Promise<ConnectionTreeNode[]> {
  try {
    switch (kind) {
      case 'SQLite':
        return loadTables(connectionId, 'main', 'main');

      case 'PostgreSQL': {
        const schemas = await dbService.listSchemas(connectionId);
        if (schemas.length === 0) {
          return loadTables(connectionId, 'public', 'public');
        }
        return schemas.map((s) => ({
          id: createNodeId('schema', connectionId, s.name),
          type: 'schema' as const,
          name: s.name,
          connectionId,
          database: undefined,
          schema: s.name,
          isLeaf: false,
        }));
      }

      case 'MySQL':
      default: {
        const databases = await dbService.listDatabases(connectionId);
        if (databases.length === 0) {
          return [];
        }
        return databases.map((db) => ({
          id: createNodeId('database', connectionId, db.name),
          type: 'database' as const,
          name: db.name,
          connectionId,
          database: db.name,
          isLeaf: false,
        }));
      }
    }
  } catch {
    return [];
  }
}

async function loadDatabaseChildren(
  connectionId: string,
  database: string,
  kind?: DbKind,
): Promise<ConnectionTreeNode[]> {
  try {
    switch (kind) {
      case 'SQLite':
        return loadTables(connectionId, database, 'main');

      case 'PostgreSQL': {
        const schemas = await dbService.listSchemas(connectionId);
        if (schemas.length === 0) {
          return loadTables(connectionId, database, 'public');
        }
        return schemas.map((s) => ({
          id: createNodeId('schema', connectionId, s.name),
          type: 'schema' as const,
          name: s.name,
          connectionId,
          database,
          schema: s.name,
          isLeaf: false,
        }));
      }

      case 'MySQL':
      default: {
        const tables = await dbService.listTables(connectionId, database);
        if (tables.length === 0) {
          return [];
        }
        return [
          {
            id: createNodeId('tables', connectionId, database),
            type: 'tables' as const,
            name: 'Tables',
            connectionId,
            database,
            isLeaf: true,
          },
          ...tables.map((t) => ({
            id: createNodeId('table', connectionId, database, t.name),
            type: 'table' as const,
            name: t.name,
            connectionId,
            database,
            table: t.name,
            isLeaf: false,
            meta: { tableType: t.tableType } as Record<string, unknown>,
          })),
        ];
      }
    }
  } catch {
    return [];
  }
}

async function loadTables(
  connectionId: string,
  database: string,
  schema: string,
): Promise<ConnectionTreeNode[]> {
  try {
    const tables = await dbService.listTables(connectionId, schema);

    return [
      {
        id: createNodeId('tables', connectionId, database, schema),
        type: 'tables' as const,
        name: 'Tables',
        connectionId,
        database,
        schema,
        isLeaf: true,
      },
      ...tables.map((t) => ({
        id: createNodeId('table', connectionId, database, schema, t.name),
        type: 'table' as const,
        name: t.name,
        connectionId,
        database,
        schema,
        table: t.name,
        isLeaf: false,
        meta: { tableType: t.tableType } as Record<string, unknown>,
      })),
    ];
  } catch {
    return [];
  }
}

async function loadColumns(
  connectionId: string,
  database: string,
  schema: string,
  table: string,
): Promise<ConnectionTreeNode[]> {
  try {
    const columns = await dbService.listColumns(connectionId, table, schema);

    return [
      {
        id: createNodeId('columns', connectionId, database, schema, table),
        type: 'columns' as const,
        name: 'Columns',
        connectionId,
        database,
        schema,
        table,
        isLeaf: true,
      },
      ...columns.map((c) => ({
        id: createNodeId('column', connectionId, database, schema, table, c.name),
        type: 'column' as const,
        name: c.name,
        connectionId,
        database,
        schema,
        table,
        isLeaf: true,
        meta: { name: c.name, databaseType: c.databaseType } as Record<string, unknown>,
      })),
    ];
  } catch {
    return [];
  }
}
