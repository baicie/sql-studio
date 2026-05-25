import type { Command, CommandHandler, CommandRegistration } from './types';
import { createSubscription } from '../common/subscription';
import { logService } from '../log/log-service';

export class CommandService {
  private _commands = new Map<string, Command>();
  private _subscription = createSubscription();
  private _version = 0;

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getVersion() {
    return this._version;
  }

  register(command: Command): CommandRegistration {
    return this.registerCommand(command);
  }

  registerCommand(command: Command): CommandRegistration {
    if (this._commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }

    this._commands.set(command.id, command);
    this._emitChange();
    logService.info('command', `Registered command: ${command.id}`);

    return {
      dispose: () => {
        this.unregister(command.id);
      },
    };
  }

  registerOrReplace(command: Command): CommandRegistration {
    this._commands.set(command.id, command);
    this._emitChange();
    logService.info('command', `Registered command: ${command.id}`);

    return {
      dispose: () => {
        this.unregister(command.id);
      },
    };
  }

  unregister(id: string) {
    if (this._commands.delete(id)) {
      this._emitChange();
      logService.info('command', `Disposed command: ${id}`);
    }
  }

  async execute<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    return this.executeCommand<T>(id, ...args);
  }

  async executeCommand<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    const command = this._commands.get(id);

    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }

    logService.debug('command', `Execute command: ${id}`);

    try {
      return (await command.handler(...args)) as T;
    } catch (error) {
      logService.error('command', `Command failed: ${id}`, error);
      throw error;
    }
  }

  has(id: string) {
    return this._commands.has(id);
  }

  get(id: string) {
    return this.getCommand(id);
  }

  getCommand(id: string) {
    return this._commands.get(id);
  }

  getAll() {
    return this.getCommands();
  }

  getCommands() {
    return Array.from(this._commands.values()).sort((left, right) => {
      return left.title.localeCompare(right.title);
    });
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

  private _emitChange() {
    this._version += 1;
    this._subscription.emit();
  }
}

export const commandService = new CommandService();
