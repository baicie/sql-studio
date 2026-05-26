import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { dbService } from '@/services/db/dbService';
import { connectionService } from '@/services/connection/connection-service';

export const dbRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'db.getActiveConnection'() {
    const profile = connectionService.getActiveConnection();

    if (!profile) return undefined;

    return {
      id: profile.id,
      name: profile.name,
      kind: profile.kind,
      database: profile.database,
      connected: connectionService.isConnected(),
    };
  },

  async 'db.getConnections'() {
    return connectionService.getProfiles().map((profile) => ({
      id: profile.id,
      name: profile.name,
      kind: profile.kind,
      database: profile.database,
      connected: false,
    }));
  },

  async 'db.listDatabases'(_extension, params) {
    const { connectionId } = params as { connectionId: string };
    return dbService.listDatabases(connectionId);
  },

  async 'db.listSchemas'(_extension, params) {
    const payload = params as {
      connectionId: string;
      database?: string;
    };

    return dbService.listSchemas(payload.connectionId);
  },

  async 'db.listTables'(_extension, params) {
    const payload = params as {
      connectionId: string;
      database?: string;
      schema?: string;
    };

    return dbService.listTables(payload.connectionId, payload.schema);
  },

  async 'db.listColumns'(_extension, params) {
    const payload = params as {
      connectionId: string;
      database?: string;
      schema?: string;
      table: string;
    };

    return dbService.listColumns(payload.connectionId, payload.table, payload.schema);
  },

  async 'db.query'(_extension, params) {
    const payload = params as {
      connectionId: string;
      sql: string;
      limit?: number;
      timeoutMs?: number;
    };

    return dbService.executeQuery({
      connectionId: payload.connectionId,
      sql: payload.sql,
      limit: payload.limit ?? 1000,
      timeoutMs: payload.timeoutMs ?? 30_000,
    });
  },

  async 'db.explain'(_extension, params) {
    const payload = params as {
      connectionId: string;
      sql: string;
    };

    return dbService.executeQuery({
      connectionId: payload.connectionId,
      sql: `EXPLAIN ${payload.sql}`,
      limit: 1000,
      timeoutMs: 30_000,
    });
  },
};
