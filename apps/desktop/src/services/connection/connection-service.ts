import { appStorage } from '../storage/storage-service';
import { createSubscription } from '../common/subscription';
import { notificationService } from '../notification/notification-service';
import type {
  ConnectionDialogState,
  ConnectionProfile,
  ConnectionSnapshot,
  ConnectionStatus,
  CreateConnectionInput,
} from './types';

const CONNECTIONS_KEY = 'connections';

class ConnectionService {
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

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getSnapshot(): ConnectionSnapshot {
    return this._snapshot;
  }

  initialize() {
    this._profiles = appStorage.getJSON<ConnectionProfile[]>(CONNECTIONS_KEY) ?? [];
    this._refreshSnapshot();
    this._subscription.emit();
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

  addConnection(input: CreateConnectionInput) {
    const profile: ConnectionProfile = {
      id: `conn-${Date.now()}`,
      name: input.name,
      kind: input.kind,
      host: input.host,
      port: input.port,
      username: input.username,
      database: input.database,
      filePath: input.filePath,
    };

    this._profiles = this._profiles.concat(profile);
    this._persist();
    this._refreshSnapshot();
    this._subscription.emit();

    return profile;
  }

  updateConnection(profile: ConnectionProfile) {
    this._profiles = this._profiles.map((item) => {
      if (item.id === profile.id) {
        return profile;
      }

      return item;
    });
    this._persist();
    this._refreshSnapshot();
    this._subscription.emit();
  }

  removeConnection(id: string) {
    this._profiles = this._profiles.filter((profile) => profile.id !== id);

    if (this._activeConnectionId === id) {
      this.disconnect();
    }

    this._persist();
    this._refreshSnapshot();
    this._subscription.emit();
  }

  async connect(id: string) {
    const profile = this.getProfile(id);

    if (!profile) {
      throw new Error(`Connection not found: ${id}`);
    }

    this._status = 'connecting';
    this._refreshSnapshot();
    this._subscription.emit();

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 250);
    });

    this._activeConnectionId = id;
    this._status = 'connected';
    this._refreshSnapshot();
    this._subscription.emit();
    notificationService.info(`Connected to ${profile.name} (mock).`);
  }

  disconnect() {
    const previous = this.getActiveConnection();
    this._activeConnectionId = null;
    this._status = 'disconnected';
    this._refreshSnapshot();
    this._subscription.emit();

    if (previous) {
      notificationService.info(`Disconnected from ${previous.name}.`);
    }
  }

  async testConnection(id: string) {
    const profile = this.getProfile(id);

    if (!profile) {
      throw new Error(`Connection not found: ${id}`);
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 200);
    });

    notificationService.info(`Connection "${profile.name}" test succeeded (mock).`);
  }

  private _persist() {
    appStorage.setJSON(CONNECTIONS_KEY, this._profiles);
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
