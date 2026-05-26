import type { SqlExecutionResult } from '../../editor/types';
import { useResultStore } from '../store/resultStore';

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

  clearResults() {
    useResultStore.getState().clearResults();
  },
};
