import { useWorkbenchStore } from '../../workbench/store/workbenchStore';
import type { ActivityId, BottomPanelId } from '../../workbench/types';

export class WorkbenchService {
  showActivity(activity: ActivityId) {
    useWorkbenchStore.getState().setActiveActivity(activity);
  }

  toggleSideBar() {
    useWorkbenchStore.getState().toggleSideBar();
  }

  toggleBottomPanel() {
    useWorkbenchStore.getState().toggleBottomPanel();
  }

  showBottomPanel(panel: BottomPanelId) {
    useWorkbenchStore.getState().setActiveBottomPanel(panel);
  }

  openCommandPalette() {
    useWorkbenchStore.getState().openCommandPalette();
  }

  closeCommandPalette() {
    useWorkbenchStore.getState().closeCommandPalette();
  }
}

export const workbenchService = new WorkbenchService();
