import { Play, Save } from 'lucide-react';
import { Button, Toolbar, ToolbarButton, ToolbarSeparator } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import type { SqlEditorTab } from '../types';
import { ConnectionSelector } from './ConnectionSelector';
import { editorService } from '../services/editorService';
import { sqlExecutionService } from '../services/sqlExecutionService';

/**
 * Flux Editor Toolbar -- Low-profile toolbar above SQL editor.
 * Shows: connection selector, Run button, Format, Save.
 */
interface EditorToolbarProps {
  tab: SqlEditorTab;
}

export function EditorToolbar({ tab }: EditorToolbarProps) {
  const { t } = useAppTranslation('editor');

  return (
    <Toolbar className="h-8 shrink-0 border-b border-outline-variant bg-surface-container px-2">
      {/* Connection selector */}
      <ConnectionSelector
        value={tab.connectionId}
        onChange={(connectionId) => {
          editorService.setConnection(tab.id, connectionId);
        }}
      />

      <ToolbarSeparator />

      {/* Run button -- primary accent */}
      <Button
        variant="primary"
        size="sm"
        className="h-6 gap-1 px-2 text-[11px]"
        onClick={() => {
          void sqlExecutionService.executeEditor(tab.id);
        }}
      >
        <Play className="h-3 w-3" />
        {t('run')}
      </Button>

      {/* Format button */}
      <ToolbarButton title={t('saveDraft')}>
        <Save className="h-3 w-3" />
        <span className="text-[11px]">{t('saveDraft')}</span>
      </ToolbarButton>

      {/* Connection status */}
      <div className="ml-auto truncate text-[11px] text-on-surface-variant">
        {tab.connectionId ? t('selectConnection') : t('noConnection')}
      </div>
    </Toolbar>
  );
}
