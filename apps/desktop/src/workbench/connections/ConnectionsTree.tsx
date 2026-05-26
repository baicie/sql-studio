import type { UseTranslationResponse } from 'react-i18next';
import { useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, Columns3, Database, Loader2, Table } from 'lucide-react';

import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import {
  createNodeId,
  createRootNode,
  loadNodeChildren,
} from '@/services/connection/connectionTreeService';
import { editorService } from '@/workbench/editor/services/editorService';
import { logService } from '@/services/log/log-service';
import { notificationService } from '@/services/notification/notification-service';
import { generateSelectTopSql, getTableDisplayName } from '@/services/connection/sqlGenerator';
import { ContextMenu } from './ContextMenu';
import type { ConnectionProfile, ConnectionTreeNode } from '@/services/connection/types';

export function ConnectionsTree() {
  const { t } = useAppTranslation('connection');

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadedChildren, setLoadedChildren] = useState<Map<string, ConnectionTreeNode[]>>(
    new Map(),
  );
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: ConnectionTreeNode;
  } | null>(null);

  const profiles = connectionService.getProfiles();

  const handleToggle = useCallback(
    async (node: ConnectionTreeNode) => {
      const isExpanded = expandedNodes.has(node.id);

      if (isExpanded) {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
        return;
      }

      if (!loadedChildren.has(node.id) && !node.isLeaf) {
        setLoadingNodes((prev) => new Set(prev).add(node.id));

        try {
          const children = await loadNodeChildren(node);
          setLoadedChildren((prev) => new Map(prev).set(node.id, children));
        } catch (error) {
          logService.error('connection', `Failed to load children for ${node.name}`, error);
          setLoadedChildren((prev) => new Map(prev).set(node.id, []));
        } finally {
          setLoadingNodes((prev) => {
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
        }
      }

      setExpandedNodes((prev) => new Set(prev).add(node.id));
    },
    [expandedNodes, loadedChildren],
  );

  const handleContextMenu = useCallback((event: React.MouseEvent, node: ConnectionTreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  const handleRefresh = useCallback(async () => {
    const activeConnectionId = connectionService.getActiveConnectionId();

    if (activeConnectionId) {
      setExpandedNodes(new Set());
      setLoadedChildren(new Map());

      const profile = profiles.find((p) => p.id === activeConnectionId);
      if (profile) {
        const rootNode = createRootNode(profile);
        await handleToggle(rootNode);
      }
    }
  }, [profiles, handleToggle]);

  const handleSelectTop1000 = useCallback(() => {
    if (!contextMenu?.node) return;

    const node = contextMenu.node;
    const sql = generateSelectTopSql(node);
    const title = getTableDisplayName(node);

    editorService.openSql({
      title: `${title}.sql`,
      content: sql,
      connectionId: node.connectionId,
      database: node.database,
      schema: node.schema,
      source: {
        type: 'connection-tree',
        nodeId: node.id,
      },
    });

    logService.info('editor', `Opened query for table: ${title}`);
  }, [contextMenu]);

  const handleCopyTableName = useCallback(() => {
    if (!contextMenu?.node) return;

    const tableName = getTableDisplayName(contextMenu.node);
    void navigator.clipboard.writeText(tableName);
    notificationService.info(`${t('contextMenu.copyTableName')}: ${tableName}`);
  }, [contextMenu]);

  const handleCopyFullName = useCallback(() => {
    if (!contextMenu?.node) return;

    const fullName = contextMenu.node.table ?? contextMenu.node.name;
    void navigator.clipboard.writeText(fullName);
    notificationService.info(`${t('contextMenu.copyFullName')}: ${fullName}`);
  }, [contextMenu]);

  const handleShowColumns = useCallback(async () => {
    if (!contextMenu?.node) return;

    const node = contextMenu.node;

    if (node.type === 'table') {
      const tableNodeId = createNodeId(
        'table',
        node.connectionId,
        node.database,
        node.schema,
        node.table,
      );
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add(tableNodeId);
        return next;
      });

      if (!loadedChildren.has(tableNodeId)) {
        setLoadingNodes((prev) => new Set(prev).add(tableNodeId));

        try {
          const children = await loadNodeChildren({
            id: tableNodeId,
            type: node.type,
            name: node.name,
            connectionId: node.connectionId,
            database: node.database,
            schema: node.schema,
            table: node.table,
            isLeaf: node.isLeaf,
          });
          setLoadedChildren((prev) => new Map(prev).set(tableNodeId, children));
        } catch (error) {
          logService.error('connection', `Failed to load columns`, error);
        } finally {
          setLoadingNodes((prev) => {
            const next = new Set(prev);
            next.delete(tableNodeId);
            return next;
          });
        }
      }
    }
  }, [contextMenu, loadedChildren]);

  function renderNode(node: ConnectionTreeNode, level: number): React.ReactNode {
    const isExpanded = expandedNodes.has(node.id);
    const isLoading = loadingNodes.has(node.id);
    const children = loadedChildren.get(node.id) ?? [];

    return (
      <div key={node.id}>
        <div
          className="group flex cursor-default items-center gap-1 rounded px-1 py-0.5 hover:bg-accent"
          style={{ paddingLeft: level * 16 + 4 }}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center"
            onClick={() => handleToggle(node)}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : node.isLeaf ? null : isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          <NodeIcon node={node} />

          <span className="truncate text-sm">{node.name}</span>

          {node.type === 'connection' && (
            <ConnectionStatusBadge profile={profiles.find((p) => p.id === node.connectionId)} />
          )}
        </div>

        {isExpanded && children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  }

  const rootNodes = profiles.map((profile) => createRootNode(profile));

  return (
    <>
      <div className="text-sm">{rootNodes.map((node) => renderNode(node, 0))}</div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.node, t, {
            onSelectTop1000: handleSelectTop1000,
            onShowColumns: handleShowColumns,
            onCopyTableName: handleCopyTableName,
            onCopyFullName: handleCopyFullName,
            onRefresh: handleRefresh,
          })}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

function NodeIcon({ node }: { node: ConnectionTreeNode }) {
  switch (node.type) {
    case 'connection':
      return <Database className="h-4 w-4 text-muted-foreground" />;
    case 'database':
      return <Database className="h-4 w-4 text-blue-500" />;
    case 'schema':
      return <Database className="h-4 w-4 text-purple-500" />;
    case 'tables':
      return <Table className="h-4 w-4 text-muted-foreground" />;
    case 'table':
      return <Table className="h-4 w-4 text-muted-foreground" />;
    case 'columns':
      return <Columns3 className="h-4 w-4 text-muted-foreground" />;
    case 'column':
      return <Columns3 className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Database className="h-4 w-4 text-muted-foreground" />;
  }
}

function ConnectionStatusBadge({ profile }: { profile?: ConnectionProfile }) {
  const { t } = useAppTranslation('connection');

  if (!profile) return null;

  const isConnected = connectionService.getActiveConnectionId() === profile.id;

  return (
    <span className={`ml-auto text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
      {isConnected ? t('status.connected') : t('status.disconnected')}
    </span>
  );
}

function getContextMenuItems(
  node: ConnectionTreeNode,
  t: UseTranslationResponse<'connection', undefined>['t'],
  handlers: {
    onSelectTop1000: () => void;
    onShowColumns: () => void;
    onCopyTableName: () => void;
    onCopyFullName: () => void;
    onRefresh: () => void;
  },
) {
  const items: Array<{ id: string; label: string; onClick: () => void }> = [];

  if (node.type === 'table') {
    items.push(
      {
        id: 'select-top-1000',
        label: t('contextMenu.selectTop1000'),
        onClick: handlers.onSelectTop1000,
      },
      { id: 'show-columns', label: t('contextMenu.showColumns'), onClick: handlers.onShowColumns },
    );
  }

  if (node.type === 'table' || node.type === 'column') {
    items.push(
      {
        id: 'copy-table-name',
        label: t('contextMenu.copyTableName'),
        onClick: handlers.onCopyTableName,
      },
      {
        id: 'copy-full-name',
        label: t('contextMenu.copyFullName'),
        onClick: handlers.onCopyFullName,
      },
    );
  }

  items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });

  return items;
}
