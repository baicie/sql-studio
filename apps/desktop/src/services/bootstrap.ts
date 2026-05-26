import { registerCoreCommands } from './command/register-core-commands';
import { commandService } from './command/command-service';
import { connectionService } from './connection/connection-service';
import { editorService } from './editor/editor-service';
import { extensionService } from './extension/extension-service';
import { keybindingService } from './keybinding/keybinding-service';
import { registerCoreKeybindings } from './keybinding/register-core-keybindings';
import { logService } from './log/log-service';
import { menuService } from './menu/menu-service';
import { registerCoreMenus } from './menu/register-core-menus';
import { notificationService } from './notification/notification-service';
import { storageService } from './storage/storage-service';
import { workbenchService } from './workbench/workbench-service';

export const services = {
  command: commandService,
  connection: connectionService,
  editor: editorService,
  extension: extensionService,
  keybinding: keybindingService,
  log: logService,
  menu: menuService,
  notification: notificationService,
  storage: storageService,
  workbench: workbenchService,
};

let bootstrapped = false;

export function bootstrapServices() {
  if (bootstrapped) {
    return services;
  }

  bootstrapped = true;

  registerCoreCommands();
  registerCoreKeybindings();
  registerCoreMenus();
  connectionService.initialize();
  void extensionService.initialize();
  void connectionService.restoreActiveConnection();
  logService.info('app', 'Application bootstrapped.');

  return services;
}

export const bootstrapApp = bootstrapServices;
