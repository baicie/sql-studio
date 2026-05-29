import type { UseTranslationResponse } from 'react-i18next';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronRight, Columns3, Database, Loader2, Table } from 'lucide-react';
import { IconButton } from '@sqlgui/ui';

import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import {
  createNodeId,
  createRootNode,
  loadNodeChildren,
  parseNodeId,
} from '@/services/connection/connectionTreeService';
import { editorService } from '@/workbench/editor/services/editorService';
import { logService } from '@/services/log/log-service';
import { notificationService } from '@/services/notification/notification-service';
import { generateSelectTopSql, getTableDisplayName } from '@/services/connection/sqlGenerator';
import { ContextMenu } from './ContextMenu';
import type { ConnectionProfile, ConnectionTreeNode } from '@/services/connection/types';

export function ConnectionsTree({ keyword }: { keyword?: string }) {
  const { t } = useAppTranslation('connection');

  const connectionSnapshot = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
  );

  const profiles = connectionSnapshot.profiles;
  const activeConnectionId = connectionSnapshot.activeConnectionId;

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

  const expandedNodesRef = useRef(expandedNodes);
  const loadedChildrenRef = useRef(loadedChildren);

  // Keep refs in sync with state
  // eslint-disable-next-line react-hooks/refs
  expandedNodesRef.current = expandedNodes;
  // eslint-disable-next-line react-hooks/refs
  loadedChildrenRef.current = loadedChildren;

  // Clean up stale nodes when profiles change.
  // Intentionally syncs internal tree state with external profile list.
  useEffect(() => {
    const validConnectionIds = new Set(profiles.map((profile) => profile.id));

    const nextExpanded = new Set<string>();
    for (const nodeId of expandedNodesRef.current) {
      const parsed = parseNodeId(nodeId);
      if (parsed.connectionId && validConnectionIds.has(parsed.connectionId)) {
        nextExpanded.add(nodeId);
      }
    }

    const nextLoaded = new Map<string, ConnectionTreeNode[]>();
    for (const [nodeId, children] of loadedChildrenRef.current) {
      const parsed = parseNodeId(nodeId);
      if (parsed.connectionId && validConnectionIds.has(parsed.connectionId)) {
        nextLoaded.set(
          nodeId,
          children.filter(
            (child) => !child.connectionId || validConnectionIds.has(child.connectionId),
          ),
        );
      }
    }

    setExpandedNodes(nextExpanded);
    setLoadedChildren(nextLoaded);
  }, [profiles]);

  const getProfileById = useCallback(
    (id: string) => profiles.find((profile) => profile.id === id),
    [profiles],
  );

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

  const handleConnect = useCallback(async () => {
    if (!contextMenu?.node) return;
    const node = contextMenu.node;
    try {
      await connectionService.connect(node.connectionId);
    } catch {
      // error already handled in service
    }
  }, [contextMenu]);

  const handleDisconnect = useCallback(async () => {
    await connectionService.disconnect();
  }, []);

  const handleEdit = useCallback(() => {
    if (!contextMenu?.node) return;
    const profile = getProfileById(contextMenu.node.connectionId);
    if (profile) {
      connectionService.openEditDialog(profile.id);
    }
  }, [contextMenu, getProfileById]);

  const handleDelete = useCallback(() => {
    if (!contextMenu?.node) return;
    const profile = getProfileById(contextMenu.node.connectionId);
    if (profile && window.confirm(`Delete connection "${profile.name}"?`)) {
      void connectionService.deleteConnection(profile.id);
    }
  }, [contextMenu, getProfileById]);

  const handleRefresh = useCallback(async () => {
    if (!contextMenu?.node) return;
    const node = contextMenu.node;

    // Collapse and reload the subtree rooted at the target node.
    setExpandedNodes((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (!id.startsWith(node.id + ':') && id !== node.id) {
          next.add(id);
        }
      }
      return next;
    });
    setLoadedChildren((prev) => {
      const next = new Map(prev);
      next.delete(node.id);
      return next;
    });

    if (node.type === 'connection') {
      setExpandedNodes((prev) => new Set(prev).add(node.id));
    } else if (!expandedNodes.has(node.id)) {
      setExpandedNodes((prev) => new Set(prev).add(node.id));
    }

    const profile = getProfileById(node.connectionId);
    if (profile) {
      const tempNode: ConnectionTreeNode = {
        ...node,
        isLeaf: false,
      };
      setLoadingNodes((prev) => new Set(prev).add(tempNode.id));

      try {
        const children = await loadNodeChildren(tempNode);
        setLoadedChildren((prev) => new Map(prev).set(tempNode.id, children));
      } catch (error) {
        logService.error('connection', `Failed to refresh ${node.name}`, error);
        setLoadedChildren((prev) => new Map(prev).set(tempNode.id, []));
      } finally {
        setLoadingNodes((prev) => {
          const next = new Set(prev);
          next.delete(tempNode.id);
          return next;
        });
      }
    }
  }, [contextMenu, expandedNodes, getProfileById]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMenu]);

  const handleCopyFullName = useCallback(() => {
    if (!contextMenu?.node) return;

    const fullName = contextMenu.node.table ?? contextMenu.node.name;
    void navigator.clipboard.writeText(fullName);
    notificationService.info(`${t('contextMenu.copyFullName')}: ${fullName}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            meta: node.meta,
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
          <IconButton
            variant="ghost"
            size="icon"
            className="flex h-4 w-4 shrink-0 items-center justify-center"
            onClick={() => handleToggle(node)}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            ) : node.isLeaf ? null : isExpanded ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
          </IconButton>

          <NodeIcon node={node} />

          <span className="truncate text-sm">{node.name}</span>

          {node.type === 'connection' && (
            <ConnectionStatusBadge
              profile={getProfileById(node.connectionId)}
              activeConnectionId={activeConnectionId}
            />
          )}
        </div>

        {isExpanded && children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  }

  const rootNodes = profiles
    .map((profile) => createRootNode(profile))
    .filter((node) => matchNode(node, keyword ?? ''));

  return (
    <>
      <div className="text-sm">{rootNodes.map((node) => renderNode(node, 0))}</div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.node, t, activeConnectionId, {
            onConnect: handleConnect,
            onDisconnect: handleDisconnect,
            onEdit: handleEdit,
            onDelete: handleDelete,
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

function matchNode(node: ConnectionTreeNode, keyword: string) {
  if (!keyword.trim()) return true;

  const normalized = keyword.trim().toLowerCase();

  return [node.name, node.database, node.schema, node.table]
    .filter(Boolean)
    .some((item) => item!.toLowerCase().includes(normalized));
}

function NodeIcon({ node }: { node: ConnectionTreeNode }) {
  switch (node.type) {
    case 'connection':
      return <Database className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case 'database':
      return <Database className="h-4 w-4 shrink-0 text-blue-500" />;
    case 'schema':
      return <Database className="h-4 w-4 shrink-0 text-purple-500" />;
    case 'tables':
      return <Table className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case 'table':
      return <Table className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case 'columns':
      return <Columns3 className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case 'column':
      return <Columns3 className="h-4 w-4 shrink-0 text-muted-foreground" />;
    default:
      return <Database className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

function ConnectionStatusBadge({
  profile,
  activeConnectionId,
}: {
  profile?: ConnectionProfile;
  activeConnectionId: string | null;
}) {
  const { t } = useAppTranslation('connection');

  if (!profile) return null;

  const isConnected = activeConnectionId === profile.id;

  return (
    <span className={`ml-auto text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
      {isConnected ? t('status.connected') : t('status.disconnected')}
    </span>
  );
}

function getContextMenuItems(
  node: ConnectionTreeNode,
  t: UseTranslationResponse<'connection', undefined>['t'],
  activeConnectionId: string | null,
  handlers: {
    onConnect: () => void;
    onDisconnect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSelectTop1000: () => void;
    onShowColumns: () => void;
    onCopyTableName: () => void;
    onCopyFullName: () => void;
    onRefresh: () => void;
  },
) {
  const items: Array<{ id: string; label: string; onClick: () => void }> = [];

  if (node.type === 'connection') {
    const isConnected = activeConnectionId === node.connectionId;
    items.push({
      id: 'connect',
      label: isConnected ? t('closeConnection') : t('openConnection'),
      onClick: isConnected ? handlers.onDisconnect : handlers.onConnect,
    });
    items.push({
      id: 'edit',
      label: t('editConnection'),
      onClick: handlers.onEdit,
    });
    items.push({
      id: 'delete',
      label: t('deleteConnection'),
      onClick: handlers.onDelete,
    });
  }

  if (node.type === 'database') {
    items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });
  }

  if (node.type === 'schema') {
    items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });
  }

  if (node.type === 'tables') {
    items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });
  }

  if (node.type === 'table') {
    items.push(
      {
        id: 'select-top-1000',
        label: t('contextMenu.selectTop1000'),
        onClick: handlers.onSelectTop1000,
      },
      { id: 'show-columns', label: t('contextMenu.showColumns'), onClick: handlers.onShowColumns },
    );
    items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });
  }

  if (node.type === 'columns') {
    items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });
  }

  if (node.type === 'column') {
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
    items.push({ id: 'refresh', label: t('contextMenu.refresh'), onClick: handlers.onRefresh });
  }

  return items;
}
