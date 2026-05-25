import type { Disposable } from '@/lib/disposable';

export interface Keybinding {
  command: string;
  key: string;
  when?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}

export interface KeybindingRegistration extends Disposable {}

export interface KeybindingContext {
  [key: string]: unknown;
}

export interface NormalizedKeybinding {
  key: string;
  command: string;
}
