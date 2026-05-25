import { invoke } from '@tauri-apps/api/core';

export async function callNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }
}
