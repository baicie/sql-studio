import type { ExtensionPermission } from '@sqlgui/extension-schema';
import { PermissionList } from '@/plugins/permissions/components/PermissionList';

interface MarketplacePermissionPreviewProps {
  permissions: ExtensionPermission[];
}

export function MarketplacePermissionPreview(props: MarketplacePermissionPreviewProps) {
  return (
    <section className="rounded-md border p-3">
      <h3 className="mb-2 text-sm font-medium">Permissions</h3>

      <PermissionList permissions={props.permissions} />
    </section>
  );
}
