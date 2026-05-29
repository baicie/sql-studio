import { Bot, Database, Puzzle, TableProperties, X } from 'lucide-react';

import {
  IconButton,
  PanelBody,
  PanelHeader,
  PanelShell,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@sqlgui/ui';
import { featureFlags } from '@/features';
import { useWorkbenchStore } from '../store/workbenchStore';

export function RightPanel() {
  const activeRightPanel = useWorkbenchStore((state) => state.activeRightPanel);
  const setActiveRightPanel = useWorkbenchStore((state) => state.setActiveRightPanel);
  const toggleRightPanel = useWorkbenchStore((state) => state.toggleRightPanel);

  return (
    <PanelShell className="border-l">
      <PanelHeader
        title="Inspector"
        actions={
          <IconButton variant="ghost" size="icon" onClick={toggleRightPanel}>
            <X className="h-4 w-4" />
          </IconButton>
        }
      />

      <Tabs
        value={activeRightPanel}
        onValueChange={(value) => setActiveRightPanel(value as typeof activeRightPanel)}
      >
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0">
          {featureFlags.sqlAgent ? (
            <TabsTrigger value="agent" className="h-full rounded-none px-3">
              <Bot className="mr-1 h-3.5 w-3.5" />
              Agent
            </TabsTrigger>
          ) : null}

          {featureFlags.cellDetail ? (
            <TabsTrigger value="cell-detail" className="h-full rounded-none px-3">
              <TableProperties className="mr-1 h-3.5 w-3.5" />
              Cell
            </TabsTrigger>
          ) : null}

          {featureFlags.schemaDetail ? (
            <TabsTrigger value="schema-detail" className="h-full rounded-none px-3">
              <Database className="mr-1 h-3.5 w-3.5" />
              Schema
            </TabsTrigger>
          ) : null}

          {featureFlags.pluginInspector ? (
            <TabsTrigger value="plugin-inspector" className="h-full rounded-none px-3">
              <Puzzle className="mr-1 h-3.5 w-3.5" />
              Plugin
            </TabsTrigger>
          ) : null}
        </TabsList>
      </Tabs>

      <PanelBody className="p-3">
        {activeRightPanel === 'cell-detail' ? <CellDetailPanel /> : null}
        {activeRightPanel === 'schema-detail' ? <SchemaDetailPanel /> : null}
        {activeRightPanel === 'plugin-inspector' ? <PluginInspectorPanel /> : null}
        {activeRightPanel === 'agent' && featureFlags.sqlAgent ? <SqlAgentPanel /> : null}
        {activeRightPanel === 'sync-task' && featureFlags.dataSync ? <SyncTaskPanel /> : null}
      </PanelBody>
    </PanelShell>
  );
}

function SqlAgentPanel() {
  return <div className="text-sm text-muted-foreground">SQL Agent will appear here.</div>;
}

function CellDetailPanel() {
  return <div className="text-sm text-muted-foreground">Select a cell to inspect value.</div>;
}

function SchemaDetailPanel() {
  return (
    <div className="text-sm text-muted-foreground">Select schema object to inspect metadata.</div>
  );
}

function PluginInspectorPanel() {
  return <div className="text-sm text-muted-foreground">Plugin inspector.</div>;
}

function SyncTaskPanel() {
  return <div className="text-sm text-muted-foreground">Sync task details will appear here.</div>;
}
