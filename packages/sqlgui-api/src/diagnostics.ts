import type { Disposable } from './disposable';
import type { TextRange } from './editor';

export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  range?: TextRange;
  source?: string;
  code?: string;
}

export interface DiagnosticsApi {
  setDiagnostics(editorId: string, diagnostics: Diagnostic[]): Promise<void>;

  clearDiagnostics(editorId: string): Promise<void>;

  createDiagnosticCollection(name: string): DiagnosticCollection;
}

export interface DiagnosticCollection extends Disposable {
  set(editorId: string, diagnostics: Diagnostic[]): Promise<void>;
  clear(editorId?: string): Promise<void>;
}
