import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { SqlEditorTab } from '../types';

const STORAGE_KEY = 'sqlgui.editor.tabs';

interface EditorSnapshot {
  tabs: SqlEditorTab[];
  activeEditorId?: string;
}

export function useRestoreEditors() {
  const openEditor = useEditorStore((state) => state.openEditor);
  const setActiveEditor = useEditorStore((state) => state.setActiveEditor);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const snapshot: EditorSnapshot = JSON.parse(raw);

      for (const tab of snapshot.tabs) {
        openEditor(tab);
      }

      if (snapshot.activeEditorId) {
        setActiveEditor(snapshot.activeEditorId);
      }
    } catch {
      // ignore parse errors
    }
  }, [openEditor, setActiveEditor]);
}
