export function createPluginWorker(): Worker {
  return new Worker(new URL('./worker/pluginHostWorker.ts', import.meta.url), {
    type: 'module',
    name: 'sqlgui-plugin-host',
  });
}

export function createExtensionSourceUrl(source: string): string {
  const blob = new Blob([source], {
    type: 'text/javascript',
  });

  return URL.createObjectURL(blob);
}
