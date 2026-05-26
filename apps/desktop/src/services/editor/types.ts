import type { SqlEditorKind2 } from '../../workbench/types';

export type EditorKind = SqlEditorKind2;

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
