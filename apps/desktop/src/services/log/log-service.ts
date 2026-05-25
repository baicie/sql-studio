import { createSubscription } from '../common/subscription';
import { useLogStore } from './log-store';
import type { LogItem, LogLevel } from './types';

export class LogService {
  private _subscription = createSubscription();
  private _nextId = 1;

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getSnapshot(): LogItem[] {
    return useLogStore.getState().items;
  }

  clear() {
    useLogStore.getState().clear();
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

    useLogStore.getState().push(item);
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
