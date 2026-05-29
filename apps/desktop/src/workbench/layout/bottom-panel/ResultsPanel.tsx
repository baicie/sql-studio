import { useAppTranslation } from '@/i18n';
import { useResultStore } from '../../results/store/resultStore';
import { resultService } from '../../results/services/resultService';
import { ResultGrid } from '../../results/components/ResultGrid';
import { Button } from '@sqlgui/ui';

export function ResultsPanel() {
  const { t } = useAppTranslation('result');
  const { t: tc } = useAppTranslation('common');

  const records = useResultStore((state) => state.records);

  if (records.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('empty.description')}
      </div>
    );
  }

  const latest = records.at(-1);

  if (!latest) {
    return null;
  }

  if (latest.error) {
    return (
      <div className="flex h-full flex-col p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="font-medium text-destructive">{t('error.queryFailed')}</span>
          {latest.elapsedMs !== undefined && (
            <span className="text-muted-foreground">{latest.elapsedMs}ms</span>
          )}
        </div>
        <pre className="flex-1 overflow-auto rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          {latest.error}
        </pre>
        <div className="mt-2 overflow-auto rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          {latest.sql}
        </div>
      </div>
    );
  }

  if (!latest.result) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('status.running')}
      </div>
    );
  }

  const { result } = latest;
  const rowCount = result.rows.length;
  const isDml = result.affectedRows != null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="text-foreground">
          {isDml
            ? t('summary.affectedRows', { count: result.affectedRows! })
            : t('summary.rowsColumns', { rows: rowCount, columns: result.columns.length })}
        </span>
        <span>{latest.elapsedMs}ms</span>
        {result.truncated && <span className="text-yellow-600">{t('status.truncated')}</span>}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-foreground"
          onClick={() => resultService.clearResults()}
        >
          {tc('actions.clear')}
        </Button>
      </div>

      {isDml ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-1 text-2xl font-semibold text-foreground">{result.affectedRows}</div>
            <div className="text-xs text-muted-foreground">{t('summary.rowsAffected')}</div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ResultGrid result={result} />
        </div>
      )}
    </div>
  );
}
