export interface Disposable {
  dispose(): void;
}

export interface ExtensionContext {
  id: string;
  extensionPath: string;
  subscriptions: Disposable[];
}

export interface SqlGuiApi {
  commands: {
    registerCommand(
      command: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>,
    ): Disposable;

    executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T>;
  };

  window: {
    showInformationMessage(message: string): Promise<void>;
    showWarningMessage(message: string): Promise<void>;
    showErrorMessage(message: string): Promise<void>;
  };
}
