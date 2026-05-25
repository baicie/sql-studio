import { keybindingService } from './keybinding-service';

export function registerCoreKeybindings() {
  keybindingService.register({
    command: 'workbench.showCommandPalette',
    key: 'mod+shift+p',
  });

  keybindingService.register({
    command: 'workbench.toggleSideBar',
    key: 'mod+b',
  });

  keybindingService.register({
    command: 'workbench.toggleBottomPanel',
    key: 'mod+j',
  });

  keybindingService.register({
    command: 'editor.newQuery',
    key: 'mod+n',
  });

  keybindingService.register({
    command: 'sql.execute',
    key: 'mod+enter',
    when: 'activeEditorKind == query',
  });
}
