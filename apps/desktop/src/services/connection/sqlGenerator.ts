import type { ConnectionTreeNode } from '@/services/connection/types';

export function generateSelectTopSql(node: ConnectionTreeNode): string {
  const tableName = quoteTableName(node);
  return `SELECT * FROM ${tableName} LIMIT 1000;`;
}

export function quoteTableName(node: ConnectionTreeNode): string {
  const parts: string[] = [];

  const kind = node.meta?.kind as string | undefined;

  if (node.schema && node.schema !== 'main') {
    parts.push(quoteIdentifier(node.schema, kind));
  }

  parts.push(quoteIdentifier(node.table ?? node.name, kind));

  return parts.join('.');
}

function quoteIdentifier(name: string, kind?: string): string {
  if (kind === 'MySQL') {
    return `\`${name.replace('`', '``')}\``;
  }

  if (kind === 'PostgreSQL' || kind === 'SQLite') {
    return `"${name.replace('"', '""')}"`;
  }

  if (identifierRequiresQuoting(name)) {
    return `"${name.replace('"', '""')}"`;
  }

  return name;
}

function identifierRequiresQuoting(name: string): boolean {
  if (!name) return false;
  if (/[a-z][A-Z]/.test(name)) return true;
  if (/[A-Z][a-z]/.test(name)) return true;
  if (/[^a-zA-Z0-9_]/.test(name)) return true;
  return false;
}

export function getTableDisplayName(node: ConnectionTreeNode): string {
  if (node.schema && node.schema !== 'main') {
    return `${node.schema}.${node.table ?? node.name}`;
  }
  return node.table ?? node.name;
}
