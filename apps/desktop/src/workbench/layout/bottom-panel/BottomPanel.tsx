import { PanelBody, PanelShell } from '@sqlgui/ui';

import { useWorkbenchStore } from '../../store/workbenchStore';
import { BottomPanelTabs } from './BottomPanelTabs';
import { ProblemsPanel } from './ProblemsPanel';
import { ResultsPanel } from './ResultsPanel';
import { TerminalPanel } from './TerminalPanel';

export function BottomPanel() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const panel = activeBottomPanel === 'logs' ? 'terminal' : activeBottomPanel;

  return (
    <PanelShell>
      <BottomPanelTabs />

      <PanelBody scrollable={false}>
        {panel === 'results' ? <ResultsPanel /> : null}
        {panel === 'problems' ? <ProblemsPanel /> : null}
        {panel === 'terminal' ? <TerminalPanel /> : null}
      </PanelBody>
    </PanelShell>
  );
}
