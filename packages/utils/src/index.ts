export const add = (a: number, b: number) => a + b;
export const subtract = (a: number, b: number) => a - b;

/**
 * Merges multiple objects into one, avoiding the verbose inline helpers
 * that esbuild generates for object spread syntax in ES2016 targets.
 */
export function extend<T extends object, U extends object>(target: T, source: U): T & U {
  return Object.assign({}, target, source);
}

/**
 * Normalizes an unknown error value into a human-readable string.
 * Used throughout the app to ensure consistent error message formatting.
 */
export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
