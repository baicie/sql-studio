import { useEffect, useState, useSyncExternalStore } from 'react';
import i18n from 'i18next';

import { useAppTranslation } from '@/i18n';
import { executeCommand } from '@/services/command/execute-command';
import { commandService } from '@/services/command/command-service';
import { formatKeybinding } from '@/services/keybinding/format-keybinding';
import { keybindingService } from '@/services/keybinding/keybinding-service';
import { useWorkbenchStore } from '../store/workbenchStore';

export function CommandPalette() {
  const { t } = useAppTranslation('workbench');

  const open = useWorkbenchStore((state) => state.commandPaletteOpen);
  const closeCommandPalette = useWorkbenchStore((state) => state.closeCommandPalette);
  const [keyword, setKeyword] = useState('');
  const commandVersion = useSyncExternalStore(
    commandService.subscribe.bind(commandService),
    commandService.getVersion.bind(commandService),
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeCommandPalette();
      }
    }

    if (!open) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeCommandPalette, open]);

  const commands =
    commandVersion >= 0 && open
      ? commandService.getAll().filter((command) => {
          const lowerKeyword = keyword.toLowerCase();

          return (
            getCommandTitle(command).toLowerCase().includes(lowerKeyword) ||
            command.id.toLowerCase().includes(lowerKeyword) ||
            command.category?.toLowerCase().includes(lowerKeyword)
          );
        })
      : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-background/40 pt-24 backdrop-blur-sm">
      <div className="h-fit w-[640px] overflow-hidden rounded-lg border bg-popover shadow-xl">
        <input
          autoFocus
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('commandPalette.placeholder')}
          className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none"
        />

        <div className="max-h-80 overflow-auto p-1">
          {commands.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('commandPalette.noCommands')}
            </div>
          ) : (
            commands.map((command) => {
              const binding = keybindingService.getBindingForCommand(command.id);

              return (
                <button
                  key={command.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={async () => {
                    await executeCommand(command.id);
                    closeCommandPalette();
                    setKeyword('');
                  }}
                >
                  <span>{getCommandTitle(command)}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {command.category ? <span>{command.category}</span> : null}
                    {binding ? <span>{formatKeybinding(binding)}</span> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function getCommandTitle(command: {
  title?: string;
  titleKey?: string;
  id: string;
  category?: string;
}) {
  if (command.titleKey) {
    return i18n.t(command.titleKey);
  }

  return command.title ?? command.id;
}
