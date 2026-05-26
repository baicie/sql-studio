import { useEditorStore } from '../store/editorStore';
import { EditorTabs } from './EditorTabs';
import { SqlEditor } from './SqlEditor';
import { EditorToolbar } from './EditorToolbar';
import { EmptyEditorState } from './EmptyEditorState';

export function SqlEditorArea() {
  const tabs = useEditorStore((state) => state.tabs);
  const activeEditorId = useEditorStore((state) => state.activeEditorId);

  const activeTab = tabs.find((tab) => tab.id === activeEditorId);

  if (!activeTab) {
    return <EmptyEditorState />;
  }

  return (
    <div className="flex h-full flex-col">
      <EditorTabs tabs={tabs} activeEditorId={activeEditorId} />

      <EditorToolbar tab={activeTab} />

      <div className="min-h-0 flex-1">
        <SqlEditor tab={activeTab} />
      </div>
    </div>
  );
}
