import type { CommandApi } from './commands';
import type { WindowApi } from './window';
import type { EditorApi } from './editor';
import type { DatabaseApi } from './db';
import type { ViewApi } from './views';
import type { StorageApi } from './storage';
import type { I18nApi } from './i18n';
import type { ClipboardApi } from './clipboard';
import type { DiagnosticsApi } from './diagnostics';
import type { ResultApi } from './result';

export interface SqlGuiApi {
  readonly version: string;

  readonly commands: CommandApi;
  readonly window: WindowApi;
  readonly editor: EditorApi;
  readonly db: DatabaseApi;
  readonly views: ViewApi;
  readonly storage: StorageApi;
  readonly i18n: I18nApi;
  readonly clipboard: ClipboardApi;
  readonly diagnostics: DiagnosticsApi;
  readonly result: ResultApi;
}
