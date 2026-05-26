import type * as monaco from 'monaco-editor';

class SqlModelService {
  private editors = new Map<string, monaco.editor.IStandaloneCodeEditor>();

  registerEditor(editorId: string, editor: monaco.editor.IStandaloneCodeEditor) {
    this.editors.set(editorId, editor);

    return {
      dispose: () => {
        this.editors.delete(editorId);
      },
    };
  }

  unregisterEditor(editorId: string) {
    this.editors.delete(editorId);
  }

  getEditor(editorId: string) {
    return this.editors.get(editorId);
  }

  getSelectedText(editorId: string) {
    const editor = this.getEditor(editorId);
    const model = editor?.getModel();
    const selection = editor?.getSelection();

    if (!editor || !model || !selection) return '';

    return model.getValueInRange(selection);
  }

  replaceSelection(editorId: string, text: string) {
    const editor = this.getEditor(editorId);
    const selection = editor?.getSelection();

    if (!editor || !selection) return;

    editor.executeEdits('sqlgui', [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
  }

  insertText(editorId: string, text: string) {
    const editor = this.getEditor(editorId);
    const position = editor?.getPosition();

    if (!editor || !position) return;

    editor.executeEdits('sqlgui', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text,
        forceMoveMarkers: true,
      },
    ]);
  }

  getActivePosition(editorId: string) {
    const editor = this.getEditor(editorId);
    return editor?.getPosition() ?? null;
  }

  setPosition(editorId: string, lineNumber: number, column: number) {
    const editor = this.getEditor(editorId);
    if (!editor) return;

    editor.setPosition({ lineNumber, column });
    editor.revealLineInCenter(lineNumber);
  }
}

export const sqlModelService = new SqlModelService();
