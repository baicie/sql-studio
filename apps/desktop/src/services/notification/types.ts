export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  timeoutMs: number;
}
