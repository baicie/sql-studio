import { useState, useSyncExternalStore } from 'react';

import { connectionService } from '@/services/connection/connection-service';
import type { ConnectionProfile, CreateConnectionInput, DbKind } from '@/services/connection/types';

const DEFAULT_PORTS: Record<DbKind, number | undefined> = {
  sqlite: undefined,
  postgresql: 5432,
  mysql: 3306,
};

interface ConnectionDialogFormProps {
  mode: 'new' | 'edit';
  profile: ConnectionProfile | null;
  onClose: () => void;
}

function ConnectionDialogForm({ mode, profile, onClose }: ConnectionDialogFormProps) {
  const [name, setName] = useState(profile?.name ?? '');
  const [kind, setKind] = useState<DbKind>(profile?.kind ?? 'sqlite');
  const [host, setHost] = useState(profile?.host ?? '');
  const [port, setPort] = useState(profile?.port ? String(profile.port) : '');
  const [database, setDatabase] = useState(profile?.database ?? '');
  const [filePath, setFilePath] = useState(profile?.filePath ?? '');

  function buildInput(): CreateConnectionInput {
    const parsedPort = port ? Number(port) : DEFAULT_PORTS[kind];

    return {
      name: name.trim(),
      kind,
      host: kind === 'sqlite' ? undefined : host.trim() || undefined,
      port: kind === 'sqlite' ? undefined : parsedPort,
      database: kind === 'sqlite' ? undefined : database.trim() || undefined,
      filePath: kind === 'sqlite' ? filePath.trim() || undefined : undefined,
    };
  }

  function handleSubmit() {
    const input = buildInput();

    if (!input.name) {
      return;
    }

    if (mode === 'edit' && profile) {
      connectionService.updateConnection(
        Object.assign({}, profile, input, {
          port: input.port,
        }),
      );
    } else {
      connectionService.addConnection(input);
    }

    onClose();
  }

  return (
    <div className="w-full max-w-md rounded-lg border bg-popover p-4 shadow-xl">
      <h2 className="text-lg font-semibold">
        {mode === 'edit' ? 'Edit Connection' : 'New Connection'}
      </h2>

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
            onChange={(event) => setKind(event.target.value as DbKind)}
          >
            <option value="sqlite">SQLite</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </label>

        {kind === 'sqlite' ? (
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

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Database</span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={database}
                onChange={(event) => setDatabase(event.target.value)}
                placeholder="postgres"
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
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          onClick={handleSubmit}
        >
          Save
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
