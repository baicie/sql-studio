import { createSubscription } from '../common/subscription';
import type { LogItem, LogLevel } from './types';

const MAX_LOG_ITEMS = 1000;

export class LogService {
  private _subscription = createSubscription();
  private _nextId = 1;
  private _items: LogItem[] = [];
  private _cachedSnapshot: LogItem[] = [];

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getSnapshot(): LogItem[] {
    return this._cachedSnapshot;
  }

  clear() {
    this._items = [];
    this._cachedSnapshot = [];
    this._subscription.emit();
  }

  debug(scope: string, message: string, data?: unknown) {
    this._log('debug', scope, message, data);
  }

  info(scope: string, message: string, data?: unknown) {
    this._log('info', scope, message, data);
  }

  warn(scope: string, message: string, data?: unknown) {
    this._log('warn', scope, message, data);
  }

  error(scope: string, message: string, data?: unknown) {
    this._log('error', scope, message, data);
  }

  private _log(level: LogLevel, scope: string, message: string, data?: unknown) {
    const item: LogItem = {
      id: String(this._nextId++),
      level,
      scope,
      message,
      timestamp: Date.now(),
      data,
    };

    this._items = this._items.concat(item).slice(-MAX_LOG_ITEMS);
    this._cachedSnapshot = this._items;
    this._subscription.emit();

    const text = `[${scope}] ${message}`;

    if (level === 'error') {
      console.error(text, data);
      return;
    }

    if (level === 'warn') {
      console.warn(text, data);
      return;
    }

    console.info(text, data);
  }
}

export const logService = new LogService();
