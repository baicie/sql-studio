export interface Keybinding {
  command: string;
  key: string;
  when?: string;
}

export interface KeybindingRegistration {
  dispose: () => void;
}

export interface KeybindingContext {
  [key: string]: unknown;
}
