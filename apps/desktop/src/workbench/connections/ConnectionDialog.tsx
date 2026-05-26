import { useState, useSyncExternalStore } from 'react';

import { useAppTranslation } from '@/i18n';
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
  const { t } = useAppTranslation('connection');
  const { t: tc } = useAppTranslation('common');

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
        {mode === 'edit' ? t('editConnection') : t('newConnection')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('message.passwordInsecure')}</p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{t('fields.name')}</span>
          <input
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('fields.name')}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{t('fields.type')}</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={kind}
            onChange={(event) => {
              const nextKind = event.target.value as DbKind;
              setKind(nextKind);
              setPort(nextKind === 'SQLite' ? '' : String(DEFAULT_PORTS[nextKind] ?? ''));
            }}
          >
            <option value="SQLite">{t('dbKind.sqlite')}</option>
            <option value="PostgreSQL">{t('dbKind.postgres')}</option>
            <option value="MySQL">{t('dbKind.mysql')}</option>
          </select>
        </label>

        {kind === 'SQLite' ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{t('fields.filePath')}</span>
            <input
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={filePath}
              onChange={(event) => setFilePath(event.target.value)}
              placeholder={t('fields.filePath')}
            />
          </label>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t('fields.host')}</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder={t('fields.host')}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t('fields.port')}</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                  placeholder={String(DEFAULT_PORTS[kind] ?? '')}
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t('fields.username')}
              </span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t('fields.username')}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t('fields.password')}
              </span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('fields.password')}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t('fields.database')}
              </span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={database}
                onChange={(event) => setDatabase(event.target.value)}
                placeholder={t('fields.database')}
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
          {tc('actions.cancel')}
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={handleTest}
          disabled={loading || !name.trim()}
        >
          {loading ? tc('status.loading') : t('testConnection')}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          onClick={handleSaveAndConnect}
          disabled={loading || !name.trim()}
        >
          {loading ? tc('status.loading') : tc('actions.save')}
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
