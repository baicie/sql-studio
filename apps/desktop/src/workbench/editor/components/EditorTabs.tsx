import { useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@sqlgui/ui';
import type { SqlEditorTab } from '../types';
import { editorService } from '../services/editorService';
import { cn } from '@/lib/cn';

/**
 * Flux Editor Tabs -- Square-ish tabs for SQL workbench.
 * Active tab: 2px bottom border in primary color.
 * Dirty indicator: 6px circle in secondary color.
 * Close button: only visible on hover.
 */
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
    <div className="flex h-8 shrink-0 items-stretch justify-between border-b border-outline-variant bg-surface-container">
      {/* Tabs scroll container */}
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeEditorId;

          return (
            <div
              key={tab.id}
              draggable
              className={cn(
                'group relative flex h-full min-w-36 max-w-52 cursor-pointer items-center gap-1.5 overflow-hidden border-r border-outline-variant px-3',
                // Active tab: 2px primary bottom border, slightly brighter background
                active
                  ? 'border-b-2 !border-b-primary border-x-0 border-t-0 bg-surface-bright'
                  : 'hover:bg-surface-container-high',
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
              {/* Database icon placeholder */}
              <svg
                className="h-3.5 w-3.5 shrink-0 text-on-surface-variant"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v6a9 3 0 0 0 18 0V5" />
                <path d="M3 11v6a9 3 0 0 0 18 0v-6" />
              </svg>

              {/* Tab title */}
              <span className="truncate text-xs font-medium text-on-surface">{tab.title}</span>

              {/* Dirty indicator */}
              {tab.dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />}

              {/* Close button -- visible on hover */}
              <IconButton
                variant="ghost"
                size="icon-sm"
                className="ml-auto opacity-0 group-hover:opacity-100"
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

      {/* New tab button */}
      <IconButton
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        title="New Tab"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </IconButton>
    </div>
  );
}
