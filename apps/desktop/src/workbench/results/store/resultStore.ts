import { create } from 'zustand';
import type { QueryRecord } from '../../editor/types';

interface ResultStore {
  records: QueryRecord[];
  activeQueryId: string | null;

  startQuery: (payload: {
    queryId: string;
    editorId: string;
    connectionId: string;
    sql: string;
    startedAt: number;
  }) => void;

  finishQuery: (result: {
    queryId: string;
    editorId: string;
    connectionId: string;
    sql: string;
    startedAt: number;
    finishedAt: number;
    elapsedMs: number;
    success: boolean;
    result?: {
      columns: Array<{ name: string; databaseType: string; nullable?: boolean }>;
      rows: unknown[][];
      affectedRows?: number;
      elapsedMs: number;
      truncated: boolean;
    };
    error?: string;
  }) => void;

  clearResults: () => void;

  getActiveRecord: () => QueryRecord | undefined;
}

export const useResultStore = create<ResultStore>((set, get) => ({
  records: [],
  activeQueryId: null,

  startQuery: (payload) =>
    set((state) => ({
      records: state.records.concat([
        {
          queryId: payload.queryId,
          editorId: payload.editorId,
          connectionId: payload.connectionId,
          sql: payload.sql,
          startedAt: payload.startedAt,
        },
      ]),
      activeQueryId: payload.queryId,
    })),

  finishQuery: (result) =>
    set((state) => ({
      records: state.records.map((record) =>
        record.queryId === result.queryId
          ? (Object.assign({}, record, {
              finishedAt: result.finishedAt,
              elapsedMs: result.elapsedMs,
              success: result.success,
              result: result.result,
              error: result.error,
            }) as QueryRecord)
          : record,
      ),
    })),

  clearResults: () =>
    set({
      records: [],
      activeQueryId: null,
    }),

  getActiveRecord: () => {
    const state = get();
    return state.records.find((r) => r.queryId === state.activeQueryId);
  },
}));
