import { ConnectionsView } from '../views/ConnectionsView';
import { ExtensionsView } from '../views/ExtensionsView';
import { HistoryView } from '../views/HistoryView';
import { SettingsView } from '../views/SettingsView';
import { useWorkbenchStore } from '../store/workbenchStore';

export function SideBar() {
  const activeActivity = useWorkbenchStore((state) => state.activeActivity);

  if (activeActivity === 'connections') {
    return <ConnectionsView />;
  }

  if (activeActivity === 'extensions') {
    return <ExtensionsView />;
  }

  if (activeActivity === 'history') {
    return <HistoryView />;
  }

  if (activeActivity === 'settings') {
    return <SettingsView />;
  }

  return null;
}
