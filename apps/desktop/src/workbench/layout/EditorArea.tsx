import { useState, useSyncExternalStore } from 'react';

import { executeCommand } from '@/services/command/execute-command';
import { commandService } from '@/services/command/command-service';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
import { EditorTabs } from './EditorTabs';
import { useWorkbenchStore } from '../store/workbenchStore';

export function EditorArea() {
  const editorTabs = useWorkbenchStore((state) => state.editorTabs);
  const activeEditorTabId = useWorkbenchStore((state) => state.activeEditorTabId);

  const activeTab = editorTabs.find((tab) => tab.id === activeEditorTabId);

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <EditorTabs />

      <div className="min-h-0 flex-1">
        {activeTab?.kind === 'welcome' ? <WelcomeEditor /> : null}

        {activeTab?.kind === 'query' ? <QueryEditorPlaceholder /> : null}

        {!activeTab ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No editor opened.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function WelcomeEditor() {
  useSyncExternalStore(
    menuService.subscribe.bind(menuService),
    menuService.getVersion.bind(menuService),
  );

  const actions = menuService.getMenu('welcome/actions', getWorkbenchContext(), evaluateWhenClause);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">SQL GUI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lightweight and extensible database workbench.
        </p>

        <div className="mt-6 grid gap-2 text-left text-sm">
          {actions.map((item) => (
            <button
              key={item.command}
              type="button"
              className="rounded-md border px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                void executeCommand(item.command);
              }}
            >
              {item.title ?? item.command}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueryEditorPlaceholder() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  useSyncExternalStore(
    menuService.subscribe.bind(menuService),
    menuService.getVersion.bind(menuService),
  );

  const contextItems = menuService.getMenu(
    'editor/context',
    getWorkbenchContext(),
    evaluateWhenClause,
  );

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setMenuOpen(true);
  }

  return (
    <div className="relative flex h-full items-center justify-center text-sm text-muted-foreground">
      <div
        className="flex h-full w-full items-center justify-center"
        onContextMenu={handleContextMenu}
        onClick={() => setMenuOpen(false)}
      >
        Query editor placeholder. Right-click for context menu.
      </div>

      {menuOpen && contextItems.length > 0 ? (
        <div
          className="fixed z-40 min-w-40 rounded-md border bg-popover py-1 shadow-lg"
          style={{ left: menuPosition.x, top: menuPosition.y }}
        >
          {contextItems.map((item) => (
            <button
              key={item.command}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                void executeCommand(item.command);
                setMenuOpen(false);
              }}
            >
              {item.title ?? commandService.get(item.command)?.title ?? item.command}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
