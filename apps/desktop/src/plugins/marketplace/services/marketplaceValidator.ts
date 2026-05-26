import type { MarketplaceExtension } from '../types';

export function validateMarketplaceExtension(
  extension: unknown,
): extension is MarketplaceExtension {
  if (!extension || typeof extension !== 'object') return false;

  const item = extension as MarketplaceExtension;

  if (!item.id) return false;
  if (!item.name) return false;
  if (!item.publisher) return false;
  if (!item.version) return false;
  if (!item.displayName) return false;
  if (!item.source) return false;

  return true;
}

export function validateMarketplaceExtensions(extensions: unknown[]) {
  return extensions.filter(validateMarketplaceExtension) as MarketplaceExtension[];
}
