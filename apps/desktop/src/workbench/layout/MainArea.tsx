import { BottomPanel } from './BottomPanel';
import { EditorArea } from './EditorArea';
import { useWorkbenchStore } from '../store/workbenchStore';

export function MainArea() {
  const bottomPanelVisible = useWorkbenchStore((state) => state.bottomPanelVisible);
  const bottomPanelHeight = useWorkbenchStore((state) => state.bottomPanelHeight);

  return (
    <main className="grid min-w-0 flex-1 grid-rows-[1fr_auto]">
      <EditorArea />

      {bottomPanelVisible ? (
        <div className="min-h-0 border-t" style={{ height: bottomPanelHeight }}>
          <BottomPanel />
        </div>
      ) : null}
    </main>
  );
}
