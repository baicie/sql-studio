import { useCallback, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { CheckCircle, Clock, Copy, Database, Trash2, XCircle } from 'lucide-react';
import { Button, IconButton, ScrollArea } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { historyService } from '@/services/history/history-service';
import type { HistoryEntry } from '@/services/history/history-service';
import { editorService } from '@/workbench/editor/services/editorService';
import { notificationService } from '@/services/notification/notification-service';

export function HistoryView() {
  const { t } = useAppTranslation('workbench');

  const history = useSyncExternalStore(historyService.subscribe.bind(historyService), () =>
    historyService.getHistory(),
  );

  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredHistory = history.filter((entry) => {
    if (filter !== 'all' && entry.status !== filter) return false;
    return true;
  });

  const handleRestore = useCallback((entry: HistoryEntry) => {
    editorService.openSql({
      title: 'history.sql',
      content: entry.sql,
      connectionId: entry.connectionId,
      source: {
        type: 'history',
        historyId: entry.id,
      },
    });
    notificationService.info(
      `Restored: ${entry.sql.slice(0, 50)}${entry.sql.length > 50 ? '...' : ''}`,
    );
  }, []);

  const handleCopy = useCallback((sql: string) => {
    void navigator.clipboard.writeText(sql);
    notificationService.info('SQL copied to clipboard.');
  }, []);

  const handleClear = useCallback(() => {
    historyService.clearHistory();
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('panel.history')}
        </span>
        <IconButton
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleClear}
          title={t('history.clear')}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          {t('history.empty')}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex border-b px-2 py-1">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {t('history.filterAll')}
            </Button>
            <Button
              variant={filter === 'success' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('success')}
            >
              {t('history.filterSuccess')}
            </Button>
            <Button
              variant={filter === 'error' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('error')}
            >
              {t('history.filterError')}
            </Button>
          </div>

          <div className="divide-y">
            {filteredHistory.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t('history.noMatch')}
              </div>
            ) : (
              filteredHistory.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  onRestore={handleRestore}
                  onCopy={handleCopy}
                  formatTime={formatTime}
                  formatElapsed={formatElapsed}
                  t={t}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}

function HistoryItem({
  entry,
  onRestore,
  onCopy,
  formatTime,
  formatElapsed,
  t,
}: {
  entry: HistoryEntry;
  onRestore: (entry: HistoryEntry) => void;
  onCopy: (sql: string) => void;
  formatTime: (ts: number) => string;
  formatElapsed: (ms: number) => string;
  t: (key: string) => string;
}) {
  return (
    <div className="group px-3 py-2 hover:bg-accent/50">
      <div className="mb-1 flex items-center gap-2">
        {entry.status === 'success' ? (
          <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-3 w-3 shrink-0 text-red-500" />
        )}

        <Database className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs text-muted-foreground">{entry.connectionName}</span>

        <div className="ml-auto flex items-center gap-2">
          <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{formatElapsed(entry.elapsedMs)}</span>
        </div>
      </div>

      <pre
        className="mb-1 max-h-20 cursor-pointer overflow-hidden text-xs leading-relaxed"
        onClick={() => onRestore(entry)}
        title={t('history.restoreToEditor')}
      >
        <code className="whitespace-pre-wrap break-all text-foreground">{entry.sql}</code>
      </pre>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatTime(entry.startedAt)}</span>

        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={() => onCopy(entry.sql)}
            title={t('history.copy')}
          >
            <Copy className="h-3 w-3" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={() => historyService.deleteEntry(entry.id)}
            title={t('history.delete')}
          >
            <Trash2 className="h-3 w-3" />
          </IconButton>
        </div>
      </div>

      {entry.errorMessage && (
        <div className="mt-1 rounded bg-destructive/10 p-1.5 text-xs text-destructive">
          {entry.errorMessage}
        </div>
      )}
    </div>
  );
}
