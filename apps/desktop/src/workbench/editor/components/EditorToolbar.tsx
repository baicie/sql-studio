import { Play, Save } from 'lucide-react';
import type { SqlEditorTab } from '../types';
import { ConnectionSelector } from './ConnectionSelector';
import { useAppTranslation } from '@/i18n';
import { sqlExecutionService } from '../services/sqlExecutionService';
import { editorService } from '../services/editorService';

interface EditorToolbarProps {
  tab: SqlEditorTab;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { t } = useAppTranslation('editor');

  const { tab } = props;

  return (
    <div className="flex h-9 items-center gap-2 border-b px-2">
      <ConnectionSelector
        value={tab.connectionId}
        onChange={(connectionId) => {
          editorService.setConnection(tab.id, connectionId);
        }}
      />

      <button
        type="button"
        className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
        onClick={() => {
          void sqlExecutionService.executeEditor(tab.id);
        }}
      >
        <Play className="h-3 w-3" />
        {t('run')}
      </button>

      <button
        type="button"
        className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
        onClick={() => {
          editorService.updateEditor(tab.id, { dirty: false });
        }}
      >
        <Save className="h-3 w-3" />
        {t('saveDraft')}
      </button>

      <div className="ml-auto text-xs text-muted-foreground">
        {tab.connectionId ? t('selectConnection') : t('noConnection')}
      </div>
    </div>
  );
}
