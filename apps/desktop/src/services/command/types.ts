export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export type CommandSource = 'core' | 'plugin';

export interface CommandContext {
  source?: string;
}

export interface Command {
  id: string;
  title?: string;
  titleKey?: string;
  category?: string;
  categoryKey?: string;
  source: CommandSource;
  extensionId?: string;
  handler: CommandHandler;
}

export interface CommandRegistration {
  dispose: () => void;
}

export interface CommandServiceLike {
  registerCommand: (command: Command) => CommandRegistration;
  executeCommand: <T = unknown>(id: string, ...args: unknown[]) => Promise<T>;
  getCommand: (id: string) => Command | undefined;
  getCommands: () => Command[];
}
