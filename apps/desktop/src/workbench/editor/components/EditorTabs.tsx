import { X } from 'lucide-react';
import type { SqlEditorTab } from '../types';
import { editorService } from '../services/editorService';
import { cn } from '@/lib/cn';

interface EditorTabsProps {
  tabs: SqlEditorTab[];
  activeEditorId?: string;
}

export function EditorTabs(props: EditorTabsProps) {
  const { tabs, activeEditorId } = props;

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/20">
      <div className="flex h-full min-w-0 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeEditorId;

          return (
            <div
              key={tab.id}
              className={cn(
                'group flex h-full min-w-32 max-w-52 cursor-pointer items-center gap-2 border-r px-3 text-sm',
                active
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40',
              )}
              onClick={() => editorService.setActiveEditor(tab.id)}
            >
              <span className="truncate">
                {tab.dirty ? '* ' : ''}
                {tab.title}
              </span>

              <button
                type="button"
                className="ml-auto rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  editorService.closeEditor(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
