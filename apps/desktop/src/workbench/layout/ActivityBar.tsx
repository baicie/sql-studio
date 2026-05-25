import { Blocks, Database, History, Settings } from 'lucide-react';

export function ActivityBar() {
  return (
    <aside className="flex flex-col items-center gap-3 border-r bg-muted/40 py-3">
      <Database className="h-5 w-5" />
      <Blocks className="h-5 w-5" />
      <History className="h-5 w-5" />
      <div className="flex-1" />
      <Settings className="h-5 w-5" />
    </aside>
  );
}
