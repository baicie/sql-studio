import { useNotificationStore } from './notification-store';
import type { NotificationItem, NotificationType } from './types';

type NotificationListener = () => void;

export class NotificationService {
  private _listeners = new Set<NotificationListener>();
  private _nextId = 1;

  subscribe(listener: NotificationListener) {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  getSnapshot(): NotificationItem[] {
    return useNotificationStore.getState().items;
  }

  show(message: string, type: NotificationType = 'info') {
    const notification: NotificationItem = {
      id: String(this._nextId++),
      message,
      type,
      createdAt: Date.now(),
      timeoutMs: 4000,
    };

    useNotificationStore.getState().push(notification);
    this._emit();

    window.setTimeout(() => {
      this.dismiss(notification.id);
    }, 4000);
  }

  info(message: string) {
    this.show(message, 'info');
  }

  warn(message: string) {
    this.show(message, 'warning');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  dismiss(id: string) {
    useNotificationStore.getState().remove(id);
    this._emit();
  }

  clear() {
    useNotificationStore.getState().clear();
    this._emit();
  }

  private _emit() {
    this._listeners.forEach((listener) => {
      listener();
    });
  }
}

export const notificationService = new NotificationService();
