import { useEffect, useState, useSyncExternalStore } from 'react';
import i18n from 'i18next';
import { Button, Input } from '@sqlgui/ui';

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
        <Input
          autoFocus
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('commandPalette.placeholder')}
          className="h-12 w-full rounded-none border-b border-x-0 border-t-0 bg-transparent px-4"
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
                <Button
                  key={command.id}
                  variant="ghost"
                  className="flex w-full justify-between px-3 py-2"
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
                </Button>
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
