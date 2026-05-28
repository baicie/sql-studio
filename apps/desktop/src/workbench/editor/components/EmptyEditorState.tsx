import { Play } from 'lucide-react';
import { Button } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import { editorService } from '../services/editorService';

export function EmptyEditorState() {
  const { t } = useAppTranslation('editor');

  const handleNewQuery = () => {
    const activeConnectionId = connectionService.getActiveConnectionId();
    editorService.newQuery(activeConnectionId ?? undefined);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">{t('empty.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('empty.description')}</p>
      </div>

      <Button onClick={handleNewQuery}>
        <Play className="h-3 w-3" />
        {t('newQuery')}
      </Button>

      <div className="mt-4 text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Ctrl+N</kbd> to create a new
        query
      </div>
    </div>
  );
}
