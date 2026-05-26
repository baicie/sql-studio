export function installWorkerSandbox() {
  try {
    Object.defineProperty(globalThis, 'fetch', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {
    // ignore
  }

  try {
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {
    // ignore
  }
}
