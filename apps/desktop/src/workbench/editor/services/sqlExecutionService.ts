import type * as monaco from 'monaco-editor';
import i18n from 'i18next';
import { dbService } from '@/services/db/dbService';
import { editorService } from './editorService';
import { resultService } from '@/workbench/results/services/resultService';
import { historyService } from '@/services/history/history-service';
import { connectionService } from '@/services/connection/connection-service';
import { getSelectedSqlOrFullText, isDangerousSql } from './sqlSelection';
import { normalizeErrorMessage } from '@sqlgui/utils';

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
    const connectionProfile = connectionService.getProfile(tab.connectionId);
    const connectionName = connectionProfile?.name ?? tab.connectionId;

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

      const finishedAt = Date.now();

      resultService.finishQuery({
        queryId,
        editorId: tab.id,
        connectionId: tab.connectionId,
        sql,
        startedAt,
        finishedAt,
        elapsedMs: result.elapsedMs,
        success: true,
        result,
      });

      historyService.addEntry({
        connectionId: tab.connectionId,
        connectionName,
        sql,
        status: 'success',
        elapsedMs: result.elapsedMs,
        startedAt,
        finishedAt,
      });
    } catch (err) {
      const finishedAt = Date.now();
      const elapsedMs = finishedAt - startedAt;
      const errorMessage = normalizeErrorMessage(err);

      resultService.finishQuery({
        queryId,
        editorId: tab.id,
        connectionId: tab.connectionId,
        sql,
        startedAt,
        finishedAt,
        elapsedMs,
        success: false,
        error: errorMessage,
      });

      historyService.addEntry({
        connectionId: tab.connectionId,
        connectionName,
        sql,
        status: 'error',
        elapsedMs,
        startedAt,
        finishedAt,
        errorMessage,
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
    const connectionProfile = connectionService.getProfile(connectionId);
    const connectionName = connectionProfile?.name ?? connectionId;

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

      const finishedAt = Date.now();

      resultService.finishQuery({
        queryId,
        editorId: editorId ?? '',
        connectionId,
        sql,
        startedAt,
        finishedAt,
        elapsedMs: result.elapsedMs,
        success: true,
        result,
      });

      historyService.addEntry({
        connectionId,
        connectionName,
        sql,
        status: 'success',
        elapsedMs: result.elapsedMs,
        startedAt,
        finishedAt,
      });
    } catch (err) {
      const finishedAt = Date.now();
      const elapsedMs = finishedAt - startedAt;
      const errorMessage = normalizeErrorMessage(err);

      resultService.finishQuery({
        queryId,
        editorId: editorId ?? '',
        connectionId,
        sql,
        startedAt,
        finishedAt,
        elapsedMs,
        success: false,
        error: errorMessage,
      });

      historyService.addEntry({
        connectionId,
        connectionName,
        sql,
        status: 'error',
        elapsedMs,
        startedAt,
        finishedAt,
        errorMessage,
      });
    }
  },
};
