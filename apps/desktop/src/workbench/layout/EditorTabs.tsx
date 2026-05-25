import { X } from 'lucide-react';

import { useWorkbenchStore } from '../store/workbenchStore';
import { cn } from '@/lib/cn';

export function EditorTabs() {
  const editorTabs = useWorkbenchStore((state) => state.editorTabs);
  const activeEditorTabId = useWorkbenchStore((state) => state.activeEditorTabId);
  const setActiveEditorTab = useWorkbenchStore((state) => state.setActiveEditorTab);
  const closeEditorTab = useWorkbenchStore((state) => state.closeEditorTab);

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-muted/20">
      {editorTabs.map((tab) => {
        const active = tab.id === activeEditorTabId;

        return (
          <div
            key={tab.id}
            role="tab"
            tabIndex={0}
            className={cn(
              'group flex h-full min-w-32 max-w-52 cursor-pointer items-center gap-2 border-r px-3 text-sm',
              active ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-muted/40',
            )}
            onClick={() => setActiveEditorTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                setActiveEditorTab(tab.id);
              }
            }}
          >
            <span className="truncate">
              {tab.title}
              {tab.dirty ? ' •' : ''}
            </span>

            <button
              type="button"
              className="ml-auto rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                closeEditorTab(tab.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
