import type { Disposable } from './disposable';
import type { SqlGuiApi } from './api';

export interface ExtensionContext {
  readonly id: string;
  readonly name: string;
  readonly publisher: string;
  readonly version: string;

  readonly extensionPath: string;
  readonly globalStoragePath: string;

  readonly subscriptions: Disposable[];

  readonly globalState: Memento;
  readonly workspaceState: Memento;

  readonly logger: ExtensionLogger;
}

export interface Memento {
  get<T>(key: string): Promise<T | undefined>;
  get<T>(key: string, defaultValue: T): Promise<T>;
  update<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface ExtensionLogger {
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export type ActivateFunction = (api: SqlGuiApi, context: ExtensionContext) => void | Promise<void>;

export type DeactivateFunction = () => void | Promise<void>;

export interface ExtensionModule {
  activate?: ActivateFunction;
  deactivate?: DeactivateFunction;
}
