import { commandService } from './command-service';
import { notificationService } from '../notification/notification-service';

export async function executeCommand<T = unknown>(
  id: string,
  ...args: unknown[]
): Promise<T | undefined> {
  try {
    return await commandService.execute<T>(id, ...args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notificationService.error(message);
    return undefined;
  }
}
