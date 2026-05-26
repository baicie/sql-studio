import { Play } from 'lucide-react';
import { connectionService } from '@/services/connection/connection-service';
import { editorService } from '../services/editorService';

export function EmptyEditorState() {
  const handleNewQuery = () => {
    const activeConnectionId = connectionService.getActiveConnectionId();
    editorService.newQuery(activeConnectionId ?? undefined);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">No SQL Editor Open</h3>
        <p className="mt-1 text-sm text-muted-foreground">Create a new query to get started.</p>
      </div>

      <button
        type="button"
        className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        onClick={handleNewQuery}
      >
        <Play className="h-3 w-3" />
        New Query
      </button>

      <div className="mt-4 text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Ctrl+N</kbd> to create a new
        query
      </div>
    </div>
  );
}
