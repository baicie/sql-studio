import { useEffect, useRef } from 'react';
import type * as Monaco from 'monaco-editor';
import type { SqlEditorTab } from '../types';
import { editorService } from '../services/editorService';
import { sqlModelService } from '../services/sqlModelService';
import { setupMonaco } from '../monaco/setupMonaco';

interface SqlEditorProps {
  tab: SqlEditorTab;
  theme?: 'sqlgui-dark' | 'sqlgui-light';
}

let monacoInstance: typeof Monaco | null = null;
let monacoSetupDone = false;

export function SqlEditor(props: SqlEditorProps) {
  const { tab, theme = 'sqlgui-dark' } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);

  useEffect(() => {
    let disposed = false;
    const editorId = tab.id;

    async function mount() {
      if (!containerRef.current || disposed) return;

      if (!monacoInstance) {
        monacoInstance = await import('monaco-editor');

        (window as unknown as { MonacoEnvironment?: Monaco.Environment }).MonacoEnvironment = {
          getWorkerUrl(_moduleId: string, label: string) {
            const origin = window.location.origin;
            if (label === 'json') {
              return `${origin}/node_modules/monaco-editor/esm/vs/language/json/json.worker.js`;
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
              return `${origin}/node_modules/monaco-editor/esm/vs/language/css/css.worker.js`;
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
              return `${origin}/node_modules/monaco-editor/esm/vs/language/html/html.worker.js`;
            }
            if (label === 'typescript' || label === 'javascript') {
              return `${origin}/node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js`;
            }
            return `${origin}/node_modules/monaco-editor/esm/vs/editor/editor.worker.js`;
          },
        };
      }

      const monaco = monacoInstance;

      if (!monacoSetupDone) {
        monacoSetupDone = true;
        setupMonaco(monaco);
      }

      if (disposed) return;

      const editor = monaco.editor.create(containerRef.current, {
        value: tab.content,
        language: 'sql',
        theme,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: false,
        formatOnType: false,
        readOnly: Boolean(tab.readonly),
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
      });

      editorRef.current = editor;

      const d1 = editor.onDidChangeModelContent(() => {
        editorService.updateContent(editorId, editor.getValue());
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        void import('../services/sqlExecutionService').then(({ sqlExecutionService }) => {
          sqlExecutionService.executeEditor(editorId, editor);
        });
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        editorService.updateEditor(editorId, { dirty: false });
      });

      disposablesRef.current = [d1];
      sqlModelService.registerEditor(editorId, editor);

      editor.focus();
    }

    void mount();

    return () => {
      disposed = true;

      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];

      const editor = editorRef.current;
      if (editor) {
        editorRef.current = null;
        sqlModelService.unregisterEditor(editorId);
        editor.dispose();
      }
    };
  }, [tab.id]); // eslint-disable-line react-hooks/exhaustive-deps -- tab.content/readonly handled via onDidChangeModelContent

  useEffect(() => {
    if (monacoInstance && editorRef.current) {
      monacoInstance.editor.setTheme(theme);
    }
  }, [theme]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
