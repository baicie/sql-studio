export function normalizeExtensionInstallError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Missing sqlgui.extension.json')) {
    return '插件目录中缺少 sqlgui.extension.json';
  }

  if (message.includes('Extension already installed')) {
    return '插件已安装';
  }

  if (message.includes('main file not found')) {
    return '插件入口文件不存在';
  }

  if (message.includes('Invalid package entry path')) {
    return '插件包包含非法路径';
  }

  if (message.includes('Extension folder does not exist')) {
    return '插件目录不存在';
  }

  if (message.includes('Extension package does not exist')) {
    return '插件包文件不存在';
  }

  return message;
}
