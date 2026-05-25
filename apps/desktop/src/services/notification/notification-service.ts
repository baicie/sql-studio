export type NotificationType = 'info' | 'warn' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

type NotificationListener = () => void;

class NotificationService {
  private _notifications: Notification[] = [];
  private _listeners = new Set<NotificationListener>();
  private _nextId = 1;

  subscribe(listener: NotificationListener) {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  getSnapshot(): Notification[] {
    return this._notifications;
  }

  show(message: string, type: NotificationType = 'info') {
    const notification: Notification = {
      id: String(this._nextId++),
      message,
      type,
    };

    this._notifications = this._notifications.concat(notification);
    this._emit();

    window.setTimeout(() => {
      this.dismiss(notification.id);
    }, 4000);
  }

  info(message: string) {
    this.show(message, 'info');
  }

  warn(message: string) {
    this.show(message, 'warn');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  dismiss(id: string) {
    this._notifications = this._notifications.filter((item) => item.id !== id);
    this._emit();
  }

  clear() {
    this._notifications = [];
    this._emit();
  }

  private _emit() {
    this._listeners.forEach((listener) => {
      listener();
    });
  }
}

export const notificationService = new NotificationService();
