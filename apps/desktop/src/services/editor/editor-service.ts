import { useWorkbenchStore } from '../../workbench/store/workbenchStore';

class EditorService {
  newQuery(title = 'Untitled Query') {
    const id = `query-${Date.now()}`;

    useWorkbenchStore.getState().openEditorTab({
      id,
      title,
      kind: 'query',
      dirty: false,
    });

    return id;
  }

  closeActiveTab() {
    const activeId = useWorkbenchStore.getState().activeEditorTabId;

    if (activeId) {
      useWorkbenchStore.getState().closeEditorTab(activeId);
    }
  }

  markActiveTabDirty(dirty = true) {
    const state = useWorkbenchStore.getState();
    const activeId = state.activeEditorTabId;

    if (!activeId) {
      return;
    }

    const nextTabs = state.editorTabs.map((tab) => {
      if (tab.id === activeId) {
        return Object.assign({}, tab, { dirty });
      }

      return tab;
    });

    useWorkbenchStore.setState({
      editorTabs: nextTabs,
    });
  }

  renameActiveTab(title: string) {
    const state = useWorkbenchStore.getState();
    const activeId = state.activeEditorTabId;

    if (!activeId) {
      return;
    }

    const nextTabs = state.editorTabs.map((tab) => {
      if (tab.id === activeId) {
        return Object.assign({}, tab, { title });
      }

      return tab;
    });

    useWorkbenchStore.setState({
      editorTabs: nextTabs,
    });
  }

  getActiveTabId() {
    return useWorkbenchStore.getState().activeEditorTabId;
  }

  getActiveTabKind() {
    const state = useWorkbenchStore.getState();
    const activeTab = state.editorTabs.find((tab) => tab.id === state.activeEditorTabId);
    return activeTab?.kind ?? null;
  }

  getActiveTab() {
    const state = useWorkbenchStore.getState();
    return state.editorTabs.find((tab) => tab.id === state.activeEditorTabId) ?? null;
  }
}

export const editorService = new EditorService();
