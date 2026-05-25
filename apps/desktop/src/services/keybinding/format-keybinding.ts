export function formatKeybinding(key: string): string {
  const isMac = navigator.platform.toLowerCase().includes('mac');

  return key
    .split('+')
    .map((part) => {
      if (part === 'mod') {
        return isMac ? '⌘' : 'Ctrl';
      }

      if (part === 'shift') {
        return isMac ? '⇧' : 'Shift';
      }

      if (part === 'alt') {
        return isMac ? '⌥' : 'Alt';
      }

      if (part === 'enter') {
        return isMac ? '↩' : 'Enter';
      }

      return part.toUpperCase();
    })
    .join(isMac ? '' : '+');
}
