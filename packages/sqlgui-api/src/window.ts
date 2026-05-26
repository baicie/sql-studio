import type { Event } from './event';
import type { SqlEditor } from './editor';

export interface MessageItem {
  title: string;
  isCloseAffordance?: boolean;
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
}

export interface InputBoxOptions {
  title?: string;
  prompt?: string;
  placeholder?: string;
  value?: string;
  password?: boolean;
}

export interface WindowApi {
  readonly activeSqlEditor: SqlEditor | undefined;

  readonly onDidChangeActiveSqlEditor: Event<SqlEditor | undefined>;

  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;

  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;

  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;

  showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: {
      title?: string;
      placeholder?: string;
    },
  ): Promise<T | undefined>;

  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
}
