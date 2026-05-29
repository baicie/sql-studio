import { useWorkbenchStore } from '../../workbench/store/workbenchStore';
import type { ActivityId, BottomPanelId, LayoutPreset, RightPanelId } from '../../workbench/types';

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

  toggleBottomPanelMaximized() {
    useWorkbenchStore.getState().toggleBottomPanelMaximized();
  }

  showBottomPanel(panel: BottomPanelId) {
    useWorkbenchStore.getState().setActiveBottomPanel(panel);
  }

  resetLayout() {
    useWorkbenchStore.getState().resetLayout();
  }

  setActiveRightPanel(panel: RightPanelId) {
    useWorkbenchStore.getState().setActiveRightPanel(panel);
  }

  toggleRightPanel() {
    useWorkbenchStore.getState().toggleRightPanel();
  }

  applyLayoutPreset(preset: LayoutPreset) {
    useWorkbenchStore.getState().applyLayoutPreset(preset);
  }

  openCommandPalette() {
    useWorkbenchStore.getState().openCommandPalette();
  }

  closeCommandPalette() {
    useWorkbenchStore.getState().closeCommandPalette();
  }
}

export const workbenchService = new WorkbenchService();
