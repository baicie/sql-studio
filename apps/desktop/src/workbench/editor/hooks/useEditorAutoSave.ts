import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

const STORAGE_KEY = 'sqlgui.editor.tabs';

export function useEditorAutoSave() {
  const tabs = useEditorStore((state) => state.tabs);
  const activeEditorId = useEditorStore((state) => state.activeEditorId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cleanedTabs = tabs.map((tab) => {
        const result = Object.assign({}, tab);
        result.dirty = false;
        return result;
      });
      const snapshot = {
        tabs: cleanedTabs,
        activeEditorId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [tabs, activeEditorId]);
}
