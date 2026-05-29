import { Emitter } from '@/lib/event';
import { appStorage } from '../storage/storage-service';
import { createSubscription } from '../common/subscription';
import { dbService } from '../db/dbService';
import { notificationService } from '../notification/notification-service';
import { logService } from '../log/log-service';
import { credentialStore } from './credential-store';
import type {
  ConnectionDialogState,
  ConnectionProfile,
  ConnectionSnapshot,
  ConnectionStatus,
} from './types';

const CONNECTIONS_KEY = 'connections';
const ACTIVE_CONNECTION_KEY = 'active_connection';

export class ConnectionService {
  private _profiles: ConnectionProfile[] = [];
  private _activeConnectionId: string | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private _dialog: ConnectionDialogState = {
    open: false,
    mode: 'new',
    editingId: null,
  };
  private _snapshot: ConnectionSnapshot = {
    profiles: this._profiles,
    activeConnectionId: this._activeConnectionId,
    status: this._status,
    dialog: this._dialog,
  };

  private _subscription = createSubscription();
  private _onDidChangeActiveConnectionEmitter = new Emitter<ConnectionProfile | null>();

  readonly onDidChangeActiveConnection = this._onDidChangeActiveConnectionEmitter.event.bind(
    this._onDidChangeActiveConnectionEmitter,
  );

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getSnapshot(): ConnectionSnapshot {
    return this._snapshot;
  }

  initialize() {
    this._profiles = appStorage.getJSON<ConnectionProfile[]>(CONNECTIONS_KEY) ?? [];
    this._activeConnectionId = appStorage.getItem(ACTIVE_CONNECTION_KEY);
    this._status = 'disconnected';
    this._refreshSnapshot();
    this._subscription.emit();
  }

  async restoreActiveConnection(): Promise<string | null> {
    if (!this._activeConnectionId) {
      return null;
    }

    const profile = this.getProfile(this._activeConnectionId);

    if (!profile) {
      this._activeConnectionId = null;
      this._status = 'disconnected';
      this._persistActiveConnection();
      this._refreshSnapshot();
      this._subscription.emit();
      return null;
    }

    this._status = 'connecting';
    this._refreshSnapshot();
    this._subscription.emit();

    try {
      logService.info('connection', `Restoring connection: ${profile.name}`);

      const password = profile.rememberPassword ? credentialStore.get(profile.id) : null;

      const result = await dbService.openConnection({
        id: profile.id,
        name: profile.name,
        kind: profile.kind,
        filePath: profile.filePath,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        password: password ?? undefined,
        database: profile.database,
      });

      this._activeConnectionId = result.connectionId;
      this._status = 'connected';
      this._persistActiveConnection();
      this._refreshSnapshot();
      this._subscription.emit();
      this._onDidChangeActiveConnectionEmitter.fire(profile);

      notificationService.success(`Reconnected to ${profile.name}.`);
      logService.info('connection', `Connection restored: ${profile.name}`);

      return result.connectionId;
    } catch (error) {
      this._activeConnectionId = null;
      this._status = 'disconnected';
      this._persistActiveConnection();
      this._refreshSnapshot();
      this._subscription.emit();

      const message = error instanceof Error ? error.message : String(error);
      notificationService.warning(`Failed to restore connection: ${message}`);
      logService.error('connection', `Failed to restore connection: ${profile.name}`, error);
      return null;
    }
  }

  getProfiles() {
    return this._profiles.slice();
  }

  getProfile(id: string) {
    return this._profiles.find((profile) => profile.id === id) ?? null;
  }

  getActiveConnectionId() {
    return this._activeConnectionId;
  }

  getActiveConnection() {
    if (!this._activeConnectionId) {
      return null;
    }

    return this.getProfile(this._activeConnectionId);
  }

  getConnectionIdForQuery() {
    return this._activeConnectionId;
  }

  addProfile(profile: ConnectionProfile) {
    const { password, rememberPassword } = profile;
    if (rememberPassword && password) {
      credentialStore.save(profile.id, password);
    } else {
      credentialStore.delete(profile.id);
    }
    this._profiles = this._profiles.concat({
      id: profile.id,
      name: profile.name,
      kind: profile.kind,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      database: profile.database,
      filePath: profile.filePath,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      rememberPassword: profile.rememberPassword,
    });
    this._persist();
    this._refreshSnapshot();
    this._subscription.emit();
  }

  updateConnection(profile: ConnectionProfile) {
    const { password, rememberPassword } = profile;
    if (rememberPassword && password) {
      credentialStore.save(profile.id, password);
    } else {
      credentialStore.delete(profile.id);
    }
    this._profiles = this._profiles.map((item) => {
      if (item.id === profile.id) {
        return {
          id: profile.id,
          name: profile.name,
          kind: profile.kind,
          host: profile.host,
          port: profile.port,
          username: profile.username,
          database: profile.database,
          filePath: profile.filePath,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          rememberPassword: profile.rememberPassword,
        };
      }
      return item;
    });
    this._persist();
    this._refreshSnapshot();
    this._subscription.emit();
  }

  setActiveConnection(connection: ConnectionProfile | null) {
    this._activeConnectionId = connection?.id ?? null;
    this._status = connection ? 'connected' : 'disconnected';
    this._persistActiveConnection();
    this._refreshSnapshot();
    this._subscription.emit();
    this._onDidChangeActiveConnectionEmitter.fire(connection);
  }

  isConnected() {
    return this._status === 'connected' && this._activeConnectionId !== null;
  }

  getStatus() {
    return this._status;
  }

  openNewDialog() {
    this._dialog = {
      open: true,
      mode: 'new',
      editingId: null,
    };
    this._refreshSnapshot();
    this._subscription.emit();
  }

  openEditDialog(id: string) {
    this._dialog = {
      open: true,
      mode: 'edit',
      editingId: id,
    };
    this._refreshSnapshot();
    this._subscription.emit();
  }

  closeDialog() {
    this._dialog = {
      open: false,
      mode: 'new',
      editingId: null,
    };
    this._refreshSnapshot();
    this._subscription.emit();
  }

  async testConnection(config: {
    name: string;
    kind: string;
    filePath?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
  }) {
    logService.info('connection', `Testing connection: ${config.name}`);

    try {
      await dbService.testConnection({
        name: config.name,
        kind: config.kind as 'SQLite' | 'PostgreSQL' | 'MySQL',
        filePath: config.filePath,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
      });

      notificationService.success('Connection successful.');
      logService.info('connection', `Connection test succeeded: ${config.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notificationService.error(`Connection failed: ${message}`);
      logService.error('connection', `Connection test failed: ${config.name}`, error);
      throw error;
    }
  }

  async connect(id: string) {
    const profile = this.getProfile(id);

    if (!profile) {
      throw new Error(`Connection not found: ${id}`);
    }

    this._status = 'connecting';
    this._refreshSnapshot();
    this._subscription.emit();

    try {
      logService.info('connection', `Opening connection: ${profile.name}`);

      const password = profile.rememberPassword ? credentialStore.get(profile.id) : undefined;

      await dbService.openConnection({
        id: profile.id,
        name: profile.name,
        kind: profile.kind,
        filePath: profile.filePath,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        password: password ?? undefined,
        database: profile.database,
      });

      this._activeConnectionId = id;
      this._status = 'connected';
      this._persistActiveConnection();
      this._refreshSnapshot();
      this._subscription.emit();
      this._onDidChangeActiveConnectionEmitter.fire(profile);

      notificationService.success(`Connected to ${profile.name}.`);
      logService.info('connection', `Connection opened: ${profile.name}`);
    } catch (error) {
      this._status = 'disconnected';
      this._refreshSnapshot();
      this._subscription.emit();

      const message = error instanceof Error ? error.message : String(error);
      notificationService.error(`Connection failed: ${message}`);
      logService.error('connection', `Connection failed: ${profile.name}`, error);
      throw error;
    }
  }

  async disconnect() {
    const previous = this.getActiveConnection();

    if (this._activeConnectionId) {
      try {
        await dbService.closeConnection(this._activeConnectionId);
      } catch {
        // ignore close errors
      }
    }

    this._activeConnectionId = null;
    this._status = 'disconnected';
    this._persistActiveConnection();
    this._refreshSnapshot();
    this._subscription.emit();
    this._onDidChangeActiveConnectionEmitter.fire(null);

    if (previous) {
      notificationService.info(`Disconnected from ${previous.name}.`);
      logService.info('connection', `Connection closed: ${previous.name}`);
    }
  }

  async testConnectionById(id: string) {
    const profile = this.getProfile(id);

    if (!profile) {
      throw new Error(`Connection not found: ${id}`);
    }

    const password = profile.rememberPassword ? credentialStore.get(profile.id) : undefined;

    await this.testConnection({
      name: profile.name,
      kind: profile.kind,
      filePath: profile.filePath,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      password: password ?? undefined,
      database: profile.database,
    });
  }

  async handleMenuCommand(command: string) {
    switch (command) {
      case 'connection.new':
        this.openNewDialog();
        break;
      default:
        break;
    }
  }

  private _persist() {
    const profilesToSave = this._profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      kind: profile.kind,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      database: profile.database,
      filePath: profile.filePath,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      rememberPassword: profile.rememberPassword,
    }));
    appStorage.setJSON(CONNECTIONS_KEY, profilesToSave);
  }

  private _persistActiveConnection() {
    if (this._activeConnectionId) {
      appStorage.setItem(ACTIVE_CONNECTION_KEY, this._activeConnectionId);
    } else {
      appStorage.removeItem(ACTIVE_CONNECTION_KEY);
    }
  }

  private _refreshSnapshot() {
    this._snapshot = {
      profiles: this._profiles,
      activeConnectionId: this._activeConnectionId,
      status: this._status,
      dialog: this._dialog,
    };
  }
}

export const connectionService = new ConnectionService();
