import { menuService } from './menu-service';

export function registerCoreMenus() {
  menuService.contribute('welcome/actions', [
    {
      command: 'connection.new',
      title: 'New Connection',
      source: 'core',
      order: 10,
    },
    {
      command: 'editor.newQuery',
      title: 'New Query',
      source: 'core',
      order: 20,
    },
    {
      command: 'extensions.openMarketplace',
      title: 'Open Extensions',
      source: 'core',
      order: 30,
    },
  ]);

  menuService.contribute('connections/toolbar', [
    {
      command: 'connection.new',
      title: 'New Connection',
      source: 'core',
      order: 10,
    },
  ]);

  menuService.contribute('connections/item', [
    {
      command: 'connection.connectActive',
      title: 'Connect',
      source: 'core',
      order: 10,
    },
    {
      command: 'connection.test',
      title: 'Test',
      source: 'core',
      when: 'connectionActive == false',
      order: 20,
    },
    {
      command: 'connection.disconnect',
      title: 'Disconnect',
      source: 'core',
      when: 'connectionActive == true',
      order: 30,
    },
  ]);

  menuService.contribute('editor/title', [
    {
      command: 'editor.newQuery',
      title: 'New Query',
      source: 'core',
      group: 'navigation',
      order: 10,
    },
  ]);

  menuService.contribute('activity/title', [
    {
      command: 'connection.new',
      title: 'New Connection',
      source: 'core',
      when: 'activeActivity == connections',
      order: 10,
    },
    {
      command: 'extensions.openMarketplace',
      title: 'Open Marketplace',
      source: 'core',
      when: 'activeActivity == extensions',
      order: 10,
    },
  ]);

  menuService.contribute('editor/context', [
    {
      command: 'sql.execute',
      title: 'Execute SQL',
      source: 'core',
      when: 'editorLang == sql',
      order: 10,
    },
    {
      command: 'editor.newQuery',
      title: 'New Query',
      source: 'core',
      when: 'editorLang == sql',
      order: 20,
    },
  ]);
}
