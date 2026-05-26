import { commandService } from './command-service';
import { connectionService } from '../connection/connection-service';
import { editorService } from '../../workbench/editor/services/editorService';
import { extensionService } from '../extension/extension-service';
import { notificationService } from '../notification/notification-service';
import { workbenchService } from '../workbench/workbench-service';
import { sqlExecutionService } from '../../workbench/editor/services/sqlExecutionService';

export function registerCoreCommands() {
  commandService.register({
    id: 'workbench.openCommandPalette',
    titleKey: 'commandPalette.open',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.openCommandPalette();
    },
  });

  commandService.register({
    id: 'workbench.toggleSideBar',
    titleKey: 'sideBar.toggle',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.toggleSideBar();
    },
  });

  commandService.register({
    id: 'workbench.toggleBottomPanel',
    titleKey: 'bottomPanel.toggle',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.toggleBottomPanel();
    },
  });

  commandService.register({
    id: 'workbench.showConnections',
    titleKey: 'activityBar.connections',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('connections');
    },
  });

  commandService.register({
    id: 'workbench.showExtensions',
    titleKey: 'activityBar.extensions',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('extensions');
    },
  });

  commandService.register({
    id: 'workbench.showHistory',
    titleKey: 'activityBar.history',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('history');
    },
  });

  commandService.register({
    id: 'workbench.showSettings',
    titleKey: 'activityBar.settings',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('settings');
    },
  });

  commandService.register({
    id: 'editor.newQuery',
    titleKey: 'editor.newQuery',
    category: 'Editor',
    source: 'core',
    handler: () => {
      const activeConnectionId = connectionService.getActiveConnectionId();
      editorService.newQuery(activeConnectionId ?? undefined);
    },
  });

  commandService.register({
    id: 'editor.run',
    titleKey: 'editor.run',
    category: 'SQL',
    source: 'core',
    handler: async () => {
      const active = editorService.getActiveEditor();
      if (!active) return;

      try {
        await sqlExecutionService.executeEditor(active.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notificationService.error(`Execute failed: ${message}`);
      }
    },
  });

  commandService.register({
    id: 'editor.save',
    titleKey: 'editor.saveDraft',
    category: 'Editor',
    source: 'core',
    handler: () => {
      const active = editorService.getActiveEditor();
      if (!active) return;

      editorService.updateEditor(active.id, {
        dirty: false,
      });
    },
  });

  commandService.register({
    id: 'editor.close',
    titleKey: 'editor.closeEditor',
    category: 'Editor',
    source: 'core',
    handler: () => {
      const active = editorService.getActiveEditor();
      if (!active) return;

      editorService.closeEditor(active.id);
    },
  });

  commandService.register({
    id: 'sql.execute',
    titleKey: 'sql.execute',
    category: 'SQL',
    source: 'core',
    handler: async () => {
      if (!connectionService.isConnected()) {
        notificationService.warning('Connect to a database before executing SQL.');
        return;
      }

      const active = editorService.getActiveEditor();
      if (!active) {
        notificationService.warning('No active editor.');
        return;
      }

      try {
        await sqlExecutionService.executeEditor(active.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notificationService.error(`Execute failed: ${message}`);
      }
    },
  });

  commandService.register({
    id: 'connection.new',
    titleKey: 'connection.newConnection',
    category: 'Connection',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('connections');
      connectionService.openNewDialog();
    },
  });

  commandService.register({
    id: 'connection.test',
    titleKey: 'connection.testConnection',
    category: 'Connection',
    source: 'core',
    handler: async () => {
      const activeId = connectionService.getActiveConnectionId();
      const targetId = activeId ?? connectionService.getProfiles()[0]?.id;

      if (!targetId) {
        notificationService.warning('No connection profile available to test.');
        return;
      }

      await connectionService.testConnectionById(targetId);
    },
  });

  commandService.register({
    id: 'connection.disconnect',
    titleKey: 'connection.closeConnection',
    category: 'Connection',
    source: 'core',
    handler: () => {
      if (!connectionService.isConnected()) {
        notificationService.warning('No active connection.');
        return;
      }

      connectionService.disconnect();
    },
  });

  commandService.register({
    id: 'connection.connectActive',
    titleKey: 'connection.openConnection',
    category: 'Connection',
    source: 'core',
    handler: async (_profileId?: unknown) => {
      const profileId =
        typeof _profileId === 'string' ? _profileId : connectionService.getProfiles()[0]?.id;

      if (!profileId) {
        notificationService.warning('Create a connection profile first.');
        return;
      }

      await connectionService.connect(profileId);
    },
  });

  commandService.register({
    id: 'extensions.openMarketplace',
    titleKey: 'extension.title',
    category: 'Extensions',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('extensions');
    },
  });

  commandService.register({
    id: 'extensions.reload',
    titleKey: 'extension.reloadHost',
    category: 'Extensions',
    source: 'core',
    handler: () => {
      extensionService.reload();
    },
  });
}
