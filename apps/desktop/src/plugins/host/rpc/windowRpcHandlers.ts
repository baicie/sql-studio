import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { notificationService } from '@/services/notification/notification-service';

export const windowRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'window.showInformationMessage'(_extension, params) {
    const payload = params as {
      message: string;
      items?: string[];
    };

    return notificationService.info(payload.message);
  },

  async 'window.showWarningMessage'(_extension, params) {
    const payload = params as {
      message: string;
      items?: string[];
    };

    return notificationService.warn(payload.message);
  },

  async 'window.showErrorMessage'(_extension, params) {
    const payload = params as {
      message: string;
      items?: string[];
    };

    return notificationService.error(payload.message);
  },

  async 'window.showQuickPick'(_extension, _params) {
    console.warn('showQuickPick is not implemented yet');
    return undefined;
  },

  async 'window.showInputBox'(_extension, _params) {
    console.warn('showInputBox is not implemented yet');
    return undefined;
  },
};
