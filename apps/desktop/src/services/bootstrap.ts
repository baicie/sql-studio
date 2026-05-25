import { registerCoreCommands } from './command/register-core-commands';
import { connectionService } from './connection/connection-service';
import { extensionService } from './extension/extension-service';
import { registerCoreKeybindings } from './keybinding/register-core-keybindings';
import { menuService } from './menu/menu-service';

function registerCoreMenus() {
  menuService.contribute('welcome/actions', [
    {
      command: 'connection.new',
      title: 'New Connection',
      source: 'core',
    },
    {
      command: 'editor.newQuery',
      title: 'New Query',
      source: 'core',
    },
    {
      command: 'extensions.openMarketplace',
      title: 'Open Extensions',
      source: 'core',
    },
  ]);

  menuService.contribute('connections/toolbar', [
    {
      command: 'connection.new',
      title: 'New Connection',
      source: 'core',
    },
  ]);

  menuService.contribute('connections/item', [
    {
      command: 'connection.connectActive',
      title: 'Connect',
      source: 'core',
    },
    {
      command: 'connection.test',
      title: 'Test',
      source: 'core',
      when: 'connectionActive == false',
    },
    {
      command: 'connection.disconnect',
      title: 'Disconnect',
      source: 'core',
      when: 'connectionActive == true',
    },
  ]);
}

export function bootstrapServices() {
  registerCoreCommands();
  registerCoreKeybindings();
  registerCoreMenus();
  connectionService.initialize();
  extensionService.initialize();
}
