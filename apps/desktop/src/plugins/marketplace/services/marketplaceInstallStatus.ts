import { extensionService } from '@/services/extension/extension-service';

export function isMarketplaceExtensionInstalled(extensionId: string) {
  const extensions = extensionService.getExtensions();
  return extensions.some((e) => e.id === extensionId);
}

export function isMarketplaceExtensionEnabled(extensionId: string) {
  const extensions = extensionService.getExtensions();
  const ext = extensions.find((e) => e.id === extensionId);
  return ext?.enabled ?? false;
}
