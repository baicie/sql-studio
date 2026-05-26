import { keybindingService } from './keybinding-service';

export function registerCoreKeybindings() {
  keybindingService.register({
    command: 'workbench.openCommandPalette',
    key: 'mod+shift+p',
    source: 'core',
  });

  keybindingService.register({
    command: 'workbench.toggleSideBar',
    key: 'mod+b',
    source: 'core',
  });

  keybindingService.register({
    command: 'workbench.toggleBottomPanel',
    key: 'mod+j',
    source: 'core',
  });

  keybindingService.register({
    command: 'editor.newQuery',
    key: 'mod+n',
    source: 'core',
  });

  keybindingService.register({
    command: 'editor.run',
    key: 'mod+enter',
    when: 'activeEditorKind == query',
    source: 'core',
  });

  keybindingService.register({
    command: 'editor.close',
    key: 'mod+w',
    when: 'activeEditorKind == query',
    source: 'core',
  });

  keybindingService.register({
    command: 'editor.save',
    key: 'mod+s',
    when: 'activeEditorKind == query',
    source: 'core',
  });
}
