export type DbKind = 'sqlite' | 'postgresql' | 'mysql';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionProfile {
  id: string;
  name: string;
  kind: DbKind;
  host?: string;
  port?: number;
  username?: string;
  database?: string;
  filePath?: string;
}

export interface ConnectionDialogState {
  open: boolean;
  mode: 'new' | 'edit';
  editingId: string | null;
}

export interface CreateConnectionInput {
  name: string;
  kind: DbKind;
  host?: string;
  port?: number;
  username?: string;
  database?: string;
  filePath?: string;
}

export interface ConnectionSnapshot {
  profiles: ConnectionProfile[];
  activeConnectionId: string | null;
  status: ConnectionStatus;
  dialog: ConnectionDialogState;
}
