import { Emitter } from '@/lib/event';
import { useWorkbenchStore } from '../../workbench/store/workbenchStore';
import type { ActiveEditorSnapshot, EditorInput } from './types';

export class EditorService {
  private _editorContents = new Map<string, string>();
  private _onDidChangeActiveEditorEmitter = new Emitter<string | null>();

  readonly onDidChangeActiveEditor = this._onDidChangeActiveEditorEmitter.event.bind(
    this._onDidChangeActiveEditorEmitter,
  );

  newQuery(initialSql = '') {
    const id = `query-${Date.now()}`;
    this._editorContents.set(id, initialSql);

    useWorkbenchStore.getState().openEditorTab({
      id,
      title: 'Untitled Query',
      kind: 'query',
      dirty: false,
    });

    this._onDidChangeActiveEditorEmitter.fire(id);

    return id;
  }

  openEditor(input: EditorInput) {
    this._editorContents.set(input.id, input.content ?? '');

    useWorkbenchStore.getState().openEditorTab({
      id: input.id,
      title: input.title,
      kind: input.kind,
      dirty: input.dirty,
    });

    this._onDidChangeActiveEditorEmitter.fire(input.id);
  }

  closeEditor(id: string) {
    this._editorContents.delete(id);
    useWorkbenchStore.getState().closeEditorTab(id);
  }

  setActiveEditor(id: string) {
    useWorkbenchStore.getState().setActiveEditorTab(id);
    this._onDidChangeActiveEditorEmitter.fire(id);
  }

  closeActiveTab() {
    const activeId = useWorkbenchStore.getState().activeEditorTabId;

    if (activeId) {
      this.closeEditor(activeId);
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

  getActiveEditor(): ActiveEditorSnapshot | undefined {
    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return undefined;
    }

    return {
      id: activeTab.id,
      title: activeTab.title,
      kind: activeTab.kind,
      content: this.getText(activeTab.id),
    };
  }

  getText(editorId: string) {
    return this._editorContents.get(editorId) ?? '';
  }

  setText(editorId: string, text: string) {
    this._editorContents.set(editorId, text);

    const state = useWorkbenchStore.getState();
    const tab = state.editorTabs.find((item) => item.id === editorId);

    if (!tab) {
      return;
    }

    const nextTabs = state.editorTabs.map((item) => {
      if (item.id === editorId) {
        return Object.assign({}, item, { dirty: true });
      }

      return item;
    });

    useWorkbenchStore.setState({
      editorTabs: nextTabs,
    });
  }

  getActiveText() {
    const activeEditor = this.getActiveEditor();
    return activeEditor?.content ?? '';
  }
}

export const editorService = new EditorService();
