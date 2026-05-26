import type * as monaco from 'monaco-editor';
import i18n from 'i18next';
import { dbService } from '@/services/db/dbService';
import { editorService } from './editorService';
import { resultService } from '@/workbench/results/services/resultService';
import { getSelectedSqlOrFullText, isDangerousSql } from './sqlSelection';

export const sqlExecutionService = {
  async executeEditor(editorId: string, monacoEditor?: monaco.editor.IStandaloneCodeEditor | null) {
    const tab = editorService.getEditorById(editorId) ?? editorService.getActiveEditor();

    if (!tab) {
      throw new Error('No active editor.');
    }

    if (!tab.connectionId) {
      throw new Error('No connection selected.');
    }

    let sql = tab.content.trim();

    if (monacoEditor) {
      sql = getSelectedSqlOrFullText(monacoEditor);
    }

    if (!sql) {
      throw new Error('SQL is empty.');
    }

    if (isDangerousSql(sql)) {
      const confirmed = window.confirm(i18n.t('editor.message.dangerousSqlConfirm'));
      if (!confirmed) return;
    }

    const queryId = crypto.randomUUID();
    const startedAt = Date.now();

    resultService.startQuery({
      queryId,
      editorId: tab.id,
      connectionId: tab.connectionId,
      sql,
      startedAt,
    });

    try {
      const result = await dbService.executeQuery({
        connectionId: tab.connectionId,
        sql,
        limit: 1000,
        timeoutMs: 30_000,
      });

      resultService.finishQuery({
        queryId,
        editorId: tab.id,
        connectionId: tab.connectionId,
        sql,
        startedAt,
        finishedAt: Date.now(),
        elapsedMs: result.elapsedMs,
        success: true,
        result,
      });
    } catch (err) {
      resultService.finishQuery({
        queryId,
        editorId: tab.id,
        connectionId: tab.connectionId,
        sql,
        startedAt,
        finishedAt: Date.now(),
        elapsedMs: Date.now() - startedAt,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  async executeSql(connectionId: string, sql: string, editorId?: string) {
    if (isDangerousSql(sql)) {
      const confirmed = window.confirm(i18n.t('editor.message.dangerousSqlConfirm'));
      if (!confirmed) return;
    }

    const queryId = crypto.randomUUID();
    const startedAt = Date.now();

    resultService.startQuery({
      queryId,
      editorId: editorId ?? '',
      connectionId,
      sql,
      startedAt,
    });

    try {
      const result = await dbService.executeQuery({
        connectionId,
        sql,
        limit: 1000,
        timeoutMs: 30_000,
      });

      resultService.finishQuery({
        queryId,
        editorId: editorId ?? '',
        connectionId,
        sql,
        startedAt,
        finishedAt: Date.now(),
        elapsedMs: result.elapsedMs,
        success: true,
        result,
      });
    } catch (err) {
      resultService.finishQuery({
        queryId,
        editorId: editorId ?? '',
        connectionId,
        sql,
        startedAt,
        finishedAt: Date.now(),
        elapsedMs: Date.now() - startedAt,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
