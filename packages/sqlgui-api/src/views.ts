import type { Disposable } from './disposable';
import type { Event } from './event';

export type ViewLocation = 'sideBar' | 'panel';

export interface ViewContext {
  readonly viewId: string;
  readonly extensionId: string;

  postMessage(message: unknown): Promise<void>;

  readonly onDidReceiveMessage: Event<unknown>;
}

export interface ViewProvider {
  resolveView(context: ViewContext): void | Promise<void>;
}

export interface WebviewOptions {
  enableScripts?: boolean;
}

export interface WebviewView {
  readonly id: string;
  readonly title: string;

  setHtml(html: string): Promise<void>;
  postMessage(message: unknown): Promise<void>;
}

export interface ViewApi {
  registerViewProvider(viewId: string, provider: ViewProvider): Disposable;

  openView(viewId: string, payload?: unknown): Promise<void>;

  createWebviewView(viewId: string, options?: WebviewOptions): Promise<WebviewView>;
}
