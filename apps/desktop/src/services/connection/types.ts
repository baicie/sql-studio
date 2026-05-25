export type DbKind = 'SQLite' | 'PostgreSQL' | 'MySQL';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionProfile {
  id: string;
  name: string;
  kind: DbKind;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filePath?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type ConnectionTreeNodeType =
  | 'connection'
  | 'database'
  | 'schema'
  | 'tables'
  | 'table'
  | 'columns'
  | 'column';

export interface ConnectionTreeNode {
  id: string;
  type: ConnectionTreeNodeType;
  name: string;
  connectionId: string;
  database?: string;
  schema?: string;
  table?: string;
  isLeaf: boolean;
  isLoading?: boolean;
  children?: ConnectionTreeNode[];
  meta?: Record<string, unknown>;
}

export interface ConnectionDialogState {
  open: boolean;
  mode: 'new' | 'edit';
  editingId: string | null;
}

export interface ConnectionSnapshot {
  profiles: ConnectionProfile[];
  activeConnectionId: string | null;
  status: ConnectionStatus;
  dialog: ConnectionDialogState;
}
