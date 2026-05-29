import { useState, useSyncExternalStore } from 'react';
import { FilePlus, FolderOpen } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@sqlgui/ui';
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
  const [rememberPassword, setRememberPassword] = useState(profile?.rememberPassword ?? false);

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
        rememberPassword: kind === 'SQLite' ? undefined : rememberPassword,
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

  function handleKindChange(value: string) {
    const nextKind = value as DbKind;
    setKind(nextKind);
    setPort(nextKind === 'SQLite' ? '' : String(DEFAULT_PORTS[nextKind] ?? ''));
  }

  async function handleBrowseFile() {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'SQLite Database',
            extensions: ['db', 'sqlite', 'sqlite3', 'db3'],
          },
          {
            name: 'All Files',
            extensions: ['*'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        setFilePath(selected);
        if (!name.trim()) {
          const fileName =
            selected
              .split('/')
              .pop()
              ?.replace(/\.[^/.]+$/, '') ?? selected;
          setName(fileName);
        }
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  }

  async function handleCreateFile() {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selected = await save({
        filters: [
          {
            name: 'SQLite Database',
            extensions: ['db', 'sqlite', 'sqlite3'],
          },
        ],
        defaultPath: name.trim() ? `${name.trim()}.db` : 'database.db',
      });

      if (selected) {
        setFilePath(selected);
        if (!name.trim()) {
          const fileName =
            selected
              .split('/')
              .pop()
              ?.replace(/\.[^/.]+$/, '') ?? selected;
          setName(fileName);
        }
      }
    } catch (err) {
      console.error('Failed to open save dialog:', err);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === 'edit' ? t('editConnection') : t('newConnection')}</DialogTitle>
        <DialogDescription>{t('message.passwordInsecure')}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>{t('fields.name')}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('fields.name')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label>{t('fields.type')}</Label>
          <Select value={kind} onValueChange={handleKindChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SQLite">{t('dbKind.sqlite')}</SelectItem>
              <SelectItem value="PostgreSQL">{t('dbKind.postgres')}</SelectItem>
              <SelectItem value="MySQL">{t('dbKind.mysql')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {kind === 'SQLite' ? (
          <div className="flex flex-col gap-1">
            <Label>{t('fields.filePath')}</Label>
            <div className="flex gap-2">
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder={t('fields.filePath')}
                className="flex-1"
              />
              <IconButton
                variant="outline"
                size="icon"
                onClick={handleBrowseFile}
                title={t('sqlite.browse')}
              >
                <FolderOpen className="h-4 w-4" />
              </IconButton>
              <IconButton
                variant="outline"
                size="icon"
                onClick={handleCreateFile}
                title={t('sqlite.create')}
              >
                <FilePlus className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div className="flex flex-col gap-1">
                <Label>{t('fields.host')}</Label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder={t('fields.host')}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>{t('fields.port')}</Label>
                <Input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder={String(DEFAULT_PORTS[kind] ?? '')}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>{t('fields.username')}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('fields.username')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>{t('fields.password')}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('fields.password')}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={rememberPassword}
                onCheckedChange={(checked) => setRememberPassword(checked === true)}
                id="remember-password"
              />
              <Label htmlFor="remember-password" className="cursor-pointer text-sm font-normal">
                {t('fields.rememberPassword')}
              </Label>
            </div>

            <div className="flex flex-col gap-1">
              <Label>{t('fields.database')}</Label>
              <Input
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder={t('fields.database')}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {tc('actions.cancel')}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={loading || !name.trim()}>
          {loading ? tc('status.loading') : t('testConnection')}
        </Button>
        <Button onClick={handleSaveAndConnect} disabled={loading || !name.trim()}>
          {loading ? tc('status.loading') : tc('actions.save')}
        </Button>
      </div>
    </>
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
    <Dialog open={snapshot.dialog.open} onOpenChange={() => connectionService.closeDialog()}>
      <DialogContent>
        <ConnectionDialogForm
          key={formKey}
          mode={snapshot.dialog.mode}
          profile={profile}
          onClose={() => connectionService.closeDialog()}
        />
      </DialogContent>
    </Dialog>
  );
}
