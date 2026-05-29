import { ResizablePanel } from '@sqlgui/ui';

import { BottomPanel } from './bottom-panel';
import { EditorArea } from './EditorArea';
import {
  DEFAULT_BOTTOM_PANEL_HEIGHT,
  MAX_BOTTOM_PANEL_HEIGHT,
  MIN_BOTTOM_PANEL_HEIGHT,
  useWorkbenchStore,
} from '../store/workbenchStore';
import { useWindowSize } from '@/hooks/use-window-size';

export function MainArea() {
  const bottomPanelVisible = useWorkbenchStore((state) => state.bottomPanelVisible);
  const bottomPanelHeight = useWorkbenchStore((state) => state.bottomPanelHeight);
  const bottomPanelMaximized = useWorkbenchStore((state) => state.bottomPanelMaximized);
  const setBottomPanelHeight = useWorkbenchStore((state) => state.setBottomPanelHeight);

  const { height: windowHeight } = useWindowSize();
  const panelHeight = bottomPanelMaximized ? Math.round(windowHeight * 0.7) : bottomPanelHeight;

  return (
    <main className="grid min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto]">
      <EditorArea />

      {bottomPanelVisible ? (
        <ResizablePanel
          value={panelHeight}
          min={MIN_BOTTOM_PANEL_HEIGHT}
          max={MAX_BOTTOM_PANEL_HEIGHT}
          defaultValue={DEFAULT_BOTTOM_PANEL_HEIGHT}
          direction="vertical"
          handlePosition="top"
          onResize={setBottomPanelHeight}
          className="border-t bg-background"
        >
          <BottomPanel />
        </ResizablePanel>
      ) : null}
    </main>
  );
}
