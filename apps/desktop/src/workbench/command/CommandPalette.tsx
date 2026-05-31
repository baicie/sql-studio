import { useEffect, useState, useSyncExternalStore } from 'react';
import i18n from 'i18next';
import { Button, Input } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { executeCommand } from '@/services/command/execute-command';
import { commandService } from '@/services/command/command-service';
import { formatKeybinding } from '@/services/keybinding/format-keybinding';
import { keybindingService } from '@/services/keybinding/keybinding-service';
import { useWorkbenchStore } from '../store/workbenchStore';
import { cn } from '@/lib/cn';

/**
 * Flux Command Palette -- Centered top, 600px width, backdrop blur.
 * 8px radius, 1px border, subtle shadow.
 */
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface/60 backdrop-blur-sm"
        onClick={closeCommandPalette}
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') closeCommandPalette();
        }}
      />

      {/* Palette panel */}
      <div className="relative z-10 flex w-[600px] flex-col overflow-hidden rounded-[8px] border border-outline-variant bg-surface-bright shadow-[0px_4px_12px_rgba(0,0,0,0.3)]">
        {/* Search area */}
        <div className="flex items-center border-b border-outline-variant px-3">
          {/* Search icon */}
          <svg
            className="mr-2 h-4 w-4 shrink-0 text-on-surface-variant"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="h-auto flex-1 border-0 bg-transparent py-3 text-sm font-mono shadow-none focus-visible:ring-0"
          />
          {/* ESC hint */}
          <span className="ml-2 rounded-[4px] border border-outline-variant bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
            ESC
          </span>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto flux-scrollbar">
          {commands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
              {t('commandPalette.noCommands')}
            </div>
          ) : (
            commands.map((command, index) => {
              const binding = keybindingService.getBindingForCommand(command.id);
              const isSelected = index === 0;

              return (
                <CommandItem
                  key={command.id}
                  label={getCommandTitle(command)}
                  category={command.category}
                  binding={binding ? formatKeybinding(binding) : undefined}
                  isSelected={isSelected}
                  onClick={async () => {
                    await executeCommand(command.id);
                    closeCommandPalette();
                    setKeyword('');
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface CommandItemProps {
  label: string;
  category?: string;
  binding?: string;
  isSelected: boolean;
  onClick: () => void;
}

function CommandItem({ label, category, binding, isSelected, onClick }: CommandItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'flex h-auto w-full items-center gap-3 px-4 py-2.5 text-left',
        'rounded-none text-sm text-on-surface',
        isSelected ? 'bg-primary-container text-on-primary-container' : '',
      )}
      onClick={onClick}
    >
      {/* Arrow icon */}
      <svg
        className="h-4 w-4 shrink-0 text-on-surface-variant"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>

      <span className="flex-1 truncate">{label}</span>

      <span className="flex items-center gap-2 text-xs text-on-surface-variant">
        {category && <span>{category}</span>}
        {binding && (
          <span className="rounded-[4px] border border-outline bg-surface px-1.5 py-0.5 text-[10px]">
            {binding}
          </span>
        )}
      </span>
    </Button>
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
