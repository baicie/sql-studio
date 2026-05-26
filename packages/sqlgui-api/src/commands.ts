import type { Disposable } from './disposable';

export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export interface CommandApi {
  registerCommand(command: string, handler: CommandHandler): Disposable;

  executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T>;

  getCommands(): Promise<string[]>;
}
