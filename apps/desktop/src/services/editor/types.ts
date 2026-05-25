export type EditorKind = 'welcome' | 'query' | 'extension';

export interface EditorInput {
  id: string;
  title: string;
  kind: EditorKind;
  content?: string;
  dirty?: boolean;
}

export interface ActiveEditorSnapshot {
  id: string;
  title: string;
  kind: EditorKind;
  content: string;
}
