export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export type CommandSource = 'core' | 'plugin';

export interface Command {
  id: string;
  title: string;
  category?: string;
  source: CommandSource;
  extensionId?: string;
  handler: CommandHandler;
}

export interface CommandRegistration {
  dispose: () => void;
}
