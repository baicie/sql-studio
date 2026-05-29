import { commandService } from './command-service';
import { logService } from '../log/log-service';
import { notificationService } from '../notification/notification-service';
import { normalizeErrorMessage } from '@sqlgui/utils';

export async function executeCommand<T = unknown>(
  id: string,
  ...args: unknown[]
): Promise<T | undefined> {
  try {
    return await commandService.executeCommand<T>(id, ...args);
  } catch (error) {
    const message = normalizeErrorMessage(error);
    logService.error('command', message, error);
    notificationService.error(message);
    return undefined;
  }
}
