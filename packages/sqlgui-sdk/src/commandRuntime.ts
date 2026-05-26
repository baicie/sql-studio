import type { CommandHandler, Disposable } from '@sqlgui/api';

export class CommandRuntime {
  private readonly handlers = new Map<string, CommandHandler>();

  registerCommand(
    command: string,
    handler: CommandHandler,
    notifyRegister: (command: string) => void,
    notifyUnregister: (command: string) => void,
  ): Disposable {
    this.handlers.set(command, handler);
    notifyRegister(command);

    return {
      dispose: () => {
        this.handlers.delete(command);
        notifyUnregister(command);
      },
    };
  }

  async executeLocalCommand(command: string, args: unknown[]): Promise<unknown> {
    const handler = this.handlers.get(command);

    if (!handler) {
      throw new Error(`Command handler not found: ${command}`);
    }

    return await handler(...args);
  }

  has(command: string) {
    return this.handlers.has(command);
  }

  clear() {
    this.handlers.clear();
  }
}
