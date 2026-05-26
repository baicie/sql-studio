import { connectionService } from '../connection/connection-service';
import { extensionService } from '../extension/extension-service';
import { useEditorStore } from '../../workbench/editor/store/editorStore';

export function getWorkbenchContext(): Record<string, unknown> {
  const tabs = useEditorStore.getState().tabs;
  const activeEditorId = useEditorStore.getState().activeEditorId;
  const activeTab = tabs.find((tab) => tab.id === activeEditorId);
  const activeConnection = connectionService.getActiveConnection();

  return {
    activeEditorKind: activeTab?.kind ?? '',
    editorLang: activeTab?.kind === 'query' ? 'sql' : '',
    sideBarVisible: true,
    bottomPanelVisible: true,
    connectionActive: connectionService.isConnected(),
    activeConnectionId: connectionService.getActiveConnectionId() ?? '',
    dbKind: activeConnection?.kind ?? '',
    extensionHostState: extensionService.getHostState(),
  };
}
