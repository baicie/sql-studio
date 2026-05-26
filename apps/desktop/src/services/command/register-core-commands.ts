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
    title: 'Open Command Palette',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.openCommandPalette();
    },
  });

  commandService.register({
    id: 'workbench.toggleSideBar',
    title: 'Toggle Side Bar',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.toggleSideBar();
    },
  });

  commandService.register({
    id: 'workbench.toggleBottomPanel',
    title: 'Toggle Bottom Panel',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.toggleBottomPanel();
    },
  });

  commandService.register({
    id: 'workbench.showConnections',
    title: 'Show Connections',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('connections');
    },
  });

  commandService.register({
    id: 'workbench.showExtensions',
    title: 'Show Extensions',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('extensions');
    },
  });

  commandService.register({
    id: 'workbench.showHistory',
    title: 'Show History',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('history');
    },
  });

  commandService.register({
    id: 'workbench.showSettings',
    title: 'Show Settings',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('settings');
    },
  });

  commandService.register({
    id: 'editor.newQuery',
    title: 'New Query',
    category: 'Editor',
    source: 'core',
    handler: () => {
      const activeConnectionId = connectionService.getActiveConnectionId();
      editorService.newQuery(activeConnectionId ?? undefined);
    },
  });

  commandService.register({
    id: 'editor.run',
    title: 'Run SQL',
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
    title: 'Save SQL Draft',
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
    title: 'Close Editor',
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
    title: 'Execute SQL',
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
    title: 'New Connection',
    category: 'Connection',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('connections');
      connectionService.openNewDialog();
    },
  });

  commandService.register({
    id: 'connection.test',
    title: 'Test Connection',
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
    title: 'Disconnect',
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
    title: 'Connect Active Profile',
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
    title: 'Open Extension Marketplace',
    category: 'Extensions',
    source: 'core',
    handler: () => {
      workbenchService.showActivity('extensions');
    },
  });

  commandService.register({
    id: 'extensions.reload',
    title: 'Reload Extensions',
    category: 'Extensions',
    source: 'core',
    handler: () => {
      extensionService.reload();
    },
  });
}
