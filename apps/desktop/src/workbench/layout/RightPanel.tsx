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

/**
 * Flux Right Panel — AI Chat / Inspector Panel docked to the right.
 * Shows: Agent (AI Chat), Cell Detail, Schema Detail, Plugin Inspector.
 */
export function RightPanel() {
  const activeRightPanel = useWorkbenchStore((state) => state.activeRightPanel);
  const setActiveRightPanel = useWorkbenchStore((state) => state.setActiveRightPanel);
  const toggleRightPanel = useWorkbenchStore((state) => state.toggleRightPanel);

  return (
    <PanelShell className="border-l border-outline-variant">
      {/* Panel header */}
      <PanelHeader
        title="Inspector"
        actions={
          <IconButton
            variant="ghost"
            size="icon"
            onClick={toggleRightPanel}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X className="h-4 w-4" />
          </IconButton>
        }
      />

      {/* Panel tabs */}
      <Tabs
        value={activeRightPanel}
        onValueChange={(value) => setActiveRightPanel(value as typeof activeRightPanel)}
      >
        <TabsList className="h-8 w-full items-stretch justify-start border-b border-outline-variant bg-surface p-0">
          {featureFlags.sqlAgent ? (
            <TabsTrigger
              value="agent"
              className="h-full rounded-none border-b-2 border-transparent px-3 text-[11px] text-on-surface-variant data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-on-surface"
            >
              <Bot className="mr-1 h-3.5 w-3.5" />
              Agent
            </TabsTrigger>
          ) : null}

          {featureFlags.cellDetail ? (
            <TabsTrigger
              value="cell-detail"
              className="h-full rounded-none border-b-2 border-transparent px-3 text-[11px] text-on-surface-variant data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-on-surface"
            >
              <TableProperties className="mr-1 h-3.5 w-3.5" />
              Cell
            </TabsTrigger>
          ) : null}

          {featureFlags.schemaDetail ? (
            <TabsTrigger
              value="schema-detail"
              className="h-full rounded-none border-b-2 border-transparent px-3 text-[11px] text-on-surface-variant data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-on-surface"
            >
              <Database className="mr-1 h-3.5 w-3.5" />
              Schema
            </TabsTrigger>
          ) : null}

          {featureFlags.pluginInspector ? (
            <TabsTrigger
              value="plugin-inspector"
              className="h-full rounded-none border-b-2 border-transparent px-3 text-[11px] text-on-surface-variant data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-on-surface"
            >
              <Puzzle className="mr-1 h-3.5 w-3.5" />
              Plugin
            </TabsTrigger>
          ) : null}
        </TabsList>
      </Tabs>

      {/* Panel body */}
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
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* AI indicator dot */}
        <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          SQL Agent
        </span>
      </div>
      <div className="flex-1 rounded-[6px] border border-outline-variant bg-surface-container p-4 text-[13px] text-on-surface-variant">
        Ask me anything about your database schema, queries, or data.
      </div>
    </div>
  );
}

function CellDetailPanel() {
  return (
    <div className="rounded-[6px] border border-outline-variant bg-surface-container p-4 text-[13px] text-on-surface-variant">
      Select a cell to inspect value.
    </div>
  );
}

function SchemaDetailPanel() {
  return (
    <div className="rounded-[6px] border border-outline-variant bg-surface-container p-4 text-[13px] text-on-surface-variant">
      Select schema object to inspect metadata.
    </div>
  );
}

function PluginInspectorPanel() {
  return (
    <div className="rounded-[6px] border border-outline-variant bg-surface-container p-4 text-[13px] text-on-surface-variant">
      Plugin inspector.
    </div>
  );
}

function SyncTaskPanel() {
  return (
    <div className="rounded-[6px] border border-outline-variant bg-surface-container p-4 text-[13px] text-on-surface-variant">
      Sync task details will appear here.
    </div>
  );
}
