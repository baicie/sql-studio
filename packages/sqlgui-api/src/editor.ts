import type { Event } from './event';

export interface OpenSqlOptions {
  title?: string;
  content?: string;
  connectionId?: string;
  database?: string;
  schema?: string;
}

export interface TextRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface SqlEditor {
  readonly id: string;
  readonly title: string;
  readonly connectionId?: string;
  readonly database?: string;
  readonly schema?: string;
  readonly readonly: boolean;

  getText(): Promise<string>;

  setText(text: string): Promise<void>;

  getSelectedText(): Promise<string>;

  getSelectedTextOrDocumentText(): Promise<string>;

  replaceSelection(text: string): Promise<void>;

  insertText(text: string): Promise<void>;

  getCursorPosition(): Promise<CursorPosition | undefined>;

  revealRange(range: TextRange): Promise<void>;
}

export interface EditorApi {
  readonly onDidOpenEditor: Event<SqlEditor>;
  readonly onDidCloseEditor: Event<string>;
  readonly onDidChangeActiveEditor: Event<SqlEditor | undefined>;

  getActiveEditor(): Promise<SqlEditor | undefined>;

  getEditors(): Promise<SqlEditor[]>;

  openSql(options: OpenSqlOptions): Promise<SqlEditor>;

  closeEditor(editorId: string): Promise<void>;
}
