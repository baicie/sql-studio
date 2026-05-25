import { useState, useSyncExternalStore } from 'react';

import { connectionService } from '@/services/connection/connection-service';
import type { ConnectionProfile, DbKind } from '@/services/connection/types';

const DEFAULT_PORTS: Record<DbKind, number | undefined> = {
  SQLite: undefined,
  PostgreSQL: 5432,
  MySQL: 3306,
};

interface ConnectionDialogFormProps {
  mode: 'new' | 'edit';
  profile: ConnectionProfile | null;
  onClose: () => void;
}

function ConnectionDialogForm({ mode, profile, onClose }: ConnectionDialogFormProps) {
  const [name, setName] = useState(profile?.name ?? '');
  const [kind, setKind] = useState<DbKind>(profile?.kind ?? 'SQLite');
  const [host, setHost] = useState(profile?.host ?? 'localhost');
  const [port, setPort] = useState(profile?.port ? String(profile.port) : '');
  const [database, setDatabase] = useState(profile?.database ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [password, setPassword] = useState(profile?.password ?? '');
  const [filePath, setFilePath] = useState(profile?.filePath ?? '');
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    if (!name.trim()) {
      return;
    }

    setLoading(true);

    try {
      await connectionService.testConnection({
        name: name.trim(),
        kind,
        host: kind === 'SQLite' ? undefined : host.trim() || undefined,
        port: kind === 'SQLite' ? undefined : port ? Number(port) : DEFAULT_PORTS[kind],
        username: kind === 'SQLite' ? undefined : username.trim() || undefined,
        password: kind === 'SQLite' ? undefined : password || undefined,
        database: kind === 'SQLite' ? undefined : database.trim() || undefined,
        filePath: kind === 'SQLite' ? filePath.trim() || undefined : undefined,
      });
    } catch {
      // error already handled in service
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAndConnect() {
    if (!name.trim()) {
      return;
    }

    setLoading(true);

    try {
      const profileData: ConnectionProfile = {
        id: profile?.id ?? `conn-${Date.now()}`,
        name: name.trim(),
        kind,
        host: kind === 'SQLite' ? undefined : host.trim() || undefined,
        port: kind === 'SQLite' ? undefined : port ? Number(port) : DEFAULT_PORTS[kind],
        username: kind === 'SQLite' ? undefined : username.trim() || undefined,
        password: kind === 'SQLite' ? undefined : password || undefined,
        database: kind === 'SQLite' ? undefined : database.trim() || undefined,
        filePath: kind === 'SQLite' ? filePath.trim() || undefined : undefined,
      };

      if (mode === 'edit' && profile) {
        connectionService.updateConnection(profileData);
      } else {
        connectionService.addProfile(profileData);
      }

      await connectionService.connect(profileData.id);
      onClose();
    } catch {
      // error already handled in service
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border bg-popover p-4 shadow-xl">
      <h2 className="text-lg font-semibold">
        {mode === 'edit' ? 'Edit Connection' : 'New Connection'}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Create and test a database connection.</p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Name</span>
          <input
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Local SQLite"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Database Type</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={kind}
            onChange={(event) => {
              const nextKind = event.target.value as DbKind;
              setKind(nextKind);
              setPort(nextKind === 'SQLite' ? '' : String(DEFAULT_PORTS[nextKind] ?? ''));
            }}
          >
            <option value="SQLite">SQLite</option>
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MySQL">MySQL</option>
          </select>
        </label>

        {kind === 'SQLite' ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">File Path</span>
            <input
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={filePath}
              onChange={(event) => setFilePath(event.target.value)}
              placeholder="/path/to/database.sqlite"
            />
          </label>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Host</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder="localhost"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Port</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                  placeholder={String(DEFAULT_PORTS[kind] ?? '')}
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Username</span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="postgres"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Password</span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Database</span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={database}
                onChange={(event) => setDatabase(event.target.value)}
                placeholder={kind === 'MySQL' ? 'mydb' : 'postgres'}
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={handleTest}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Testing...' : 'Test'}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          onClick={handleSaveAndConnect}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Connecting...' : 'Save & Connect'}
        </button>
      </div>
    </div>
  );
}

export function ConnectionDialog() {
  const snapshot = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
  );

  if (!snapshot.dialog.open) {
    return null;
  }

  const profile =
    snapshot.dialog.mode === 'edit' && snapshot.dialog.editingId
      ? connectionService.getProfile(snapshot.dialog.editingId)
      : null;

  const formKey = `${snapshot.dialog.mode}-${snapshot.dialog.editingId ?? 'new'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm">
      <ConnectionDialogForm
        key={formKey}
        mode={snapshot.dialog.mode}
        profile={profile}
        onClose={() => connectionService.closeDialog()}
      />
    </div>
  );
}
