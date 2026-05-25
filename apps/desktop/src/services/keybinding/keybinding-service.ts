import { executeCommand } from '../command/execute-command';

import type { Keybinding, KeybindingContext, KeybindingRegistration } from './types';

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.metaKey || event.ctrlKey) {
    parts.push('mod');
  }

  if (event.shiftKey) {
    parts.push('shift');
  }

  if (event.altKey) {
    parts.push('alt');
  }

  parts.push(event.key.toLowerCase());

  return parts.join('+');
}

class KeybindingService {
  private _bindings: Keybinding[] = [];

  register(binding: Keybinding): KeybindingRegistration {
    this._bindings.push(binding);

    return {
      dispose: () => {
        const index = this._bindings.indexOf(binding);
        if (index >= 0) {
          this._bindings.splice(index, 1);
        }
      },
    };
  }

  getAll() {
    return this._bindings.slice();
  }

  getBindingForCommand(commandId: string) {
    const binding = this._bindings.find((item) => item.command === commandId);
    return binding?.key ?? null;
  }

  async handleKeyDown(
    event: KeyboardEvent,
    context: KeybindingContext,
    evaluateWhen: (expression: string, ctx: KeybindingContext) => boolean,
  ) {
    const pressedKey = normalizeKey(event);

    for (const binding of this._bindings) {
      if (binding.key !== pressedKey) {
        continue;
      }

      if (binding.when && !evaluateWhen(binding.when, context)) {
        continue;
      }

      event.preventDefault();
      await executeCommand(binding.command);
      return true;
    }

    return false;
  }
}

export const keybindingService = new KeybindingService();
