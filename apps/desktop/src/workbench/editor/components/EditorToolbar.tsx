import { Play, Save } from 'lucide-react';

import { Button, Toolbar, ToolbarButton, ToolbarSeparator } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import type { SqlEditorTab } from '../types';
import { ConnectionSelector } from './ConnectionSelector';
import { editorService } from '../services/editorService';
import { sqlExecutionService } from '../services/sqlExecutionService';

interface EditorToolbarProps {
  tab: SqlEditorTab;
}

export function EditorToolbar({ tab }: EditorToolbarProps) {
  const { t } = useAppTranslation('editor');

  return (
    <Toolbar className="h-9 shrink-0 border-b px-2">
      <ConnectionSelector
        value={tab.connectionId}
        onChange={(connectionId) => {
          editorService.setConnection(tab.id, connectionId);
        }}
      />

      <ToolbarSeparator />

      <Button
        variant="default"
        size="sm"
        className="h-6 gap-1 px-2 text-xs"
        onClick={() => {
          void sqlExecutionService.executeEditor(tab.id);
        }}
      >
        <Play className="h-3 w-3" />
        {t('run')}
      </Button>

      <ToolbarButton
        title={t('saveDraft')}
        onClick={() => {
          editorService.updateEditor(tab.id, { dirty: false });
        }}
      >
        <Save className="h-3 w-3" />
        {t('saveDraft')}
      </ToolbarButton>

      <div className="ml-auto truncate text-xs text-muted-foreground">
        {tab.connectionId ? t('selectConnection') : t('noConnection')}
      </div>
    </Toolbar>
  );
}
