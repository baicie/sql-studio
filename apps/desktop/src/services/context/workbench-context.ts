import { connectionService } from '../connection/connection-service';
import { extensionService } from '../extension/extension-service';
import { useWorkbenchStore } from '../../workbench/store/workbenchStore';

export function getWorkbenchContext(): Record<string, unknown> {
  const state = useWorkbenchStore.getState();
  const activeTab = state.editorTabs.find((tab) => tab.id === state.activeEditorTabId);
  const activeConnection = connectionService.getActiveConnection();

  return {
    activeEditorKind: activeTab?.kind ?? '',
    editorLang: activeTab?.kind === 'query' ? 'sql' : '',
    activeActivity: state.activeActivity,
    sideBarVisible: state.sideBarVisible,
    bottomPanelVisible: state.bottomPanelVisible,
    connectionActive: connectionService.isConnected(),
    activeConnectionId: connectionService.getActiveConnectionId() ?? '',
    dbKind: activeConnection?.kind ?? '',
    extensionHostState: extensionService.getHostState(),
  };
}
