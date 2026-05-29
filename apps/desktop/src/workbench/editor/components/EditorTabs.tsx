import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from '@sqlgui/ui';
import type { SqlEditorTab } from '../types';
import { editorService } from '../services/editorService';

interface EditorTabsProps {
  tabs: SqlEditorTab[];
  activeEditorId?: string;
}

export function EditorTabs({ tabs, activeEditorId }: EditorTabsProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
              draggable
              className={cn(
                'group flex h-full min-w-32 max-w-52 cursor-pointer items-center gap-2 border-r px-3 text-sm',
                active
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40',
                draggingId === tab.id && 'opacity-50',
              )}
              onClick={() => editorService.setActiveEditor(tab.id)}
              onDragStart={() => setDraggingId(tab.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={() => {
                if (!draggingId || draggingId === tab.id) return;
                editorService.moveTab(draggingId, tab.id);
                setDraggingId(null);
              }}
            >
              <span className="truncate">
                {tab.dirty ? '* ' : ''}
                {tab.title}
              </span>

              <IconButton
                variant="ghost"
                size="icon"
                className="ml-auto rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  editorService.closeEditor(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </IconButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
