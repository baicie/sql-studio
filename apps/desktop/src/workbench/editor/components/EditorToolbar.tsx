import { Play, Save } from 'lucide-react';
import type { SqlEditorTab } from '../types';
import { ConnectionSelector } from './ConnectionSelector';
import { Button } from '@sqlgui/ui';
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

      <Button
        variant="default"
        size="sm"
        className="h-6 gap-1 px-1.5 text-xs [&_[data-icon]]:size-3"
        onClick={() => {
          void sqlExecutionService.executeEditor(tab.id);
        }}
      >
        <Play data-icon="inline-start" />
        {t('run')}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-1.5 text-xs [&_[data-icon]]:size-3"
        onClick={() => {
          editorService.updateEditor(tab.id, { dirty: false });
        }}
      >
        <Save data-icon="inline-start" />
        {t('saveDraft')}
      </Button>

      <div className="ml-auto text-xs text-muted-foreground">
        {tab.connectionId ? t('selectConnection') : t('noConnection')}
      </div>
    </div>
  );
}
