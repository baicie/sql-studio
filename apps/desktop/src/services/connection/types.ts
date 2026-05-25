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
