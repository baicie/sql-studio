import type { Command, CommandHandler, CommandRegistration } from './types';

class CommandService {
  private _commands = new Map<string, Command>();

  register(command: Command): CommandRegistration {
    if (this._commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }

    this._commands.set(command.id, command);

    return {
      dispose: () => {
        this.unregister(command.id);
      },
    };
  }

  registerOrReplace(command: Command): CommandRegistration {
    this._commands.set(command.id, command);

    return {
      dispose: () => {
        this.unregister(command.id);
      },
    };
  }

  unregister(id: string) {
    this._commands.delete(id);
  }

  async execute<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    const command = this._commands.get(id);

    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }

    return (await command.handler(...args)) as T;
  }

  has(id: string) {
    return this._commands.has(id);
  }

  get(id: string) {
    return this._commands.get(id);
  }

  getAll() {
    return Array.from(this._commands.values());
  }

  registerPluginCommand(
    extensionId: string,
    raw: { command: string; title?: string; handler: CommandHandler },
  ) {
    return this.register({
      id: raw.command,
      title: raw.title ?? raw.command,
      source: 'plugin',
      extensionId,
      handler: raw.handler,
    });
  }
}

export const commandService = new CommandService();
