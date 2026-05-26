import type { ExtensionPermission } from '@sqlgui/extension-schema';
import { getPermissionRisk } from '@/plugins/permissions/permissions';
import type { PermissionRiskLevel } from '@/plugins/permissions/types';

const order: Record<PermissionRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function getMarketplaceExtensionRisk(
  permissions: ExtensionPermission[],
): PermissionRiskLevel {
  let max: PermissionRiskLevel = 'low';

  for (const permission of permissions) {
    const risk = getPermissionRisk(permission);

    if (order[risk] > order[max]) {
      max = risk;
    }
  }

  return max;
}
