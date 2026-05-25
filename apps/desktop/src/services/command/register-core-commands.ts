import { commandService } from './command-service';
import { connectionService } from '../connection/connection-service';
import { editorService } from '../editor/editor-service';
import { extensionService } from '../extension/extension-service';
import { notificationService } from '../notification/notification-service';
import { useWorkbenchStore } from '../../workbench/store/workbenchStore';

export function registerCoreCommands() {
  commandService.register({
    id: 'workbench.showCommandPalette',
    title: 'Show Command Palette',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      useWorkbenchStore.getState().openCommandPalette();
    },
  });

  commandService.register({
    id: 'workbench.toggleSideBar',
    title: 'Toggle Side Bar',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      useWorkbenchStore.getState().toggleSideBar();
    },
  });

  commandService.register({
    id: 'workbench.toggleBottomPanel',
    title: 'Toggle Bottom Panel',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      useWorkbenchStore.getState().toggleBottomPanel();
    },
  });

  commandService.register({
    id: 'workbench.showConnections',
    title: 'Show Connections',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      useWorkbenchStore.getState().setActiveActivity('connections');
    },
  });

  commandService.register({
    id: 'workbench.showExtensions',
    title: 'Show Extensions',
    category: 'Workbench',
    source: 'core',
    handler: () => {
      useWorkbenchStore.getState().setActiveActivity('extensions');
    },
  });

  commandService.register({
    id: 'editor.newQuery',
    title: 'New Query',
    category: 'Editor',
    source: 'core',
    handler: () => {
      editorService.newQuery();
    },
  });

  commandService.register({
    id: 'sql.execute',
    title: 'Execute SQL',
    category: 'SQL',
    source: 'core',
    handler: () => {
      if (!connectionService.isConnected()) {
        notificationService.warn('Connect to a database before executing SQL.');
        return;
      }

      notificationService.info('SQL execution will be available in Phase 3.');
    },
  });

  commandService.register({
    id: 'connection.new',
    title: 'New Connection',
    category: 'Connection',
    source: 'core',
    handler: () => {
      useWorkbenchStore.getState().setActiveActivity('connections');
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
        notificationService.warn('No connection profile available to test.');
        return;
      }

      await connectionService.testConnection(targetId);
    },
  });

  commandService.register({
    id: 'connection.disconnect',
    title: 'Disconnect',
    category: 'Connection',
    source: 'core',
    handler: () => {
      if (!connectionService.isConnected()) {
        notificationService.warn('No active connection.');
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
        notificationService.warn('Create a connection profile first.');
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
      useWorkbenchStore.getState().setActiveActivity('extensions');
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
