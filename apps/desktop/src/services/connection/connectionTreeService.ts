import { dbService } from '@/services/db/dbService';
import type {
  ConnectionProfile,
  ConnectionTreeNode,
  ConnectionTreeNodeType,
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

  switch (type) {
    case 'connection':
      return loadDatabases(connectionId);

    case 'database':
      if (!database) return [];
      return loadSchemasOrTables(connectionId, database);

    case 'schema':
      if (!database || !schema) return [];
      return loadTables(connectionId, database, schema);

    case 'tables':
      return [];

    case 'table':
      if (!database || !schema || !table) return [];
      return loadColumns(connectionId, database, schema, table);

    case 'columns':
      return [];

    case 'column':
      return [];

    default:
      return [];
  }
}

async function loadDatabases(connectionId: string): Promise<ConnectionTreeNode[]> {
  try {
    const databases = await dbService.listDatabases(connectionId);

    return databases.map((db) => ({
      id: createNodeId('database', connectionId, db.name),
      type: 'database' as const,
      name: db.name,
      connectionId,
      database: db.name,
      isLeaf: false,
    }));
  } catch {
    return [];
  }
}

async function loadSchemasOrTables(
  connectionId: string,
  database: string,
): Promise<ConnectionTreeNode[]> {
  try {
    const schemas = await dbService.listSchemas(connectionId);

    if (schemas.length === 0) {
      return [
        {
          id: createNodeId('tables', connectionId, database),
          type: 'tables' as const,
          name: 'Tables',
          connectionId,
          database,
          isLeaf: false,
        },
      ];
    }

    return schemas.map((s) => ({
      id: createNodeId('schema', connectionId, database, s.name),
      type: 'schema' as const,
      name: s.name,
      connectionId,
      database,
      schema: s.name,
      isLeaf: false,
    }));
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
        isLeaf: false,
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
        meta: {
          tableType: t.tableType,
        },
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
        isLeaf: false,
      },
      ...columns.map((c) => ({
        id: createNodeId('column', connectionId, database, schema, table, c.name),
        type: 'column' as const,
        name: c.name,
        connectionId,
        database,
        schema,
        table: c.table,
        isLeaf: true,
        meta: { name: c.name, databaseType: c.databaseType } as Record<string, unknown>,
      })),
    ];
  } catch {
    return [];
  }
}
