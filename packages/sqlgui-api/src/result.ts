import type { Disposable } from './disposable';
import type { Event } from './event';
import type { QueryResult } from './db';

export interface QueryRecord {
  queryId: string;
  editorId: string;
  connectionId: string;
  sql: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  result?: QueryResult;
  error?: string;
  elapsedMs?: number;
}

export interface ResultRendererContext {
  query: QueryRecord;
}

export interface ResultRenderer {
  render(context: ResultRendererContext): void | Promise<void>;
}

export interface ResultApi {
  readonly onDidFinishQuery: Event<QueryRecord>;

  getActiveQuery(): Promise<QueryRecord | undefined>;

  getQueries(): Promise<QueryRecord[]>;

  registerResultRenderer(rendererId: string, renderer: ResultRenderer): Disposable;
}
