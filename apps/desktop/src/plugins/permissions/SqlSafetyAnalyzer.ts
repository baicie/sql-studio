export type SqlOperationKind = 'read' | 'write' | 'ddl' | 'transaction' | 'unknown';

export interface SqlSafetyAnalysis {
  kind: SqlOperationKind;
  dangerous: boolean;
  readonly: boolean;
  reason?: string;
  firstKeyword?: string;
}

class SqlSafetyAnalyzer {
  analyze(sql: string): SqlSafetyAnalysis {
    const normalized = normalizeSql(sql);
    const firstKeyword = getFirstKeyword(normalized);

    if (!firstKeyword) {
      return {
        kind: 'unknown',
        dangerous: true,
        readonly: false,
        reason: 'Cannot determine SQL operation.',
      };
    }

    if (readKeywords.has(firstKeyword)) {
      return {
        kind: 'read',
        dangerous: false,
        readonly: true,
        firstKeyword,
      };
    }

    if (writeKeywords.has(firstKeyword)) {
      return {
        kind: 'write',
        dangerous: true,
        readonly: false,
        firstKeyword,
        reason: `SQL starts with ${firstKeyword.toUpperCase()}, which may modify data.`,
      };
    }

    if (ddlKeywords.has(firstKeyword)) {
      return {
        kind: 'ddl',
        dangerous: true,
        readonly: false,
        firstKeyword,
        reason: `SQL starts with ${firstKeyword.toUpperCase()}, which may change schema.`,
      };
    }

    if (transactionKeywords.has(firstKeyword)) {
      return {
        kind: 'transaction',
        dangerous: true,
        readonly: false,
        firstKeyword,
        reason: `SQL starts with ${firstKeyword.toUpperCase()}, which may affect transaction state.`,
      };
    }

    return {
      kind: 'unknown',
      dangerous: true,
      readonly: false,
      firstKeyword,
      reason: `Unknown SQL operation: ${firstKeyword}`,
    };
  }

  isReadonly(sql: string) {
    return this.analyze(sql).readonly;
  }

  isDangerous(sql: string) {
    return this.analyze(sql).dangerous;
  }
}

const readKeywords = new Set(['select', 'show', 'describe', 'desc', 'explain', 'with', 'pragma']);

const writeKeywords = new Set(['insert', 'update', 'delete', 'replace', 'merge', 'call']);

const ddlKeywords = new Set(['create', 'alter', 'drop', 'truncate', 'rename', 'grant', 'revoke']);

const transactionKeywords = new Set(['begin', 'commit', 'rollback', 'savepoint', 'release']);

function normalizeSql(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim()
    .toLowerCase();
}

function getFirstKeyword(sql: string) {
  const match = sql.match(/^[a-z_]+/);
  return match?.[0];
}

export const sqlSafetyAnalyzer = new SqlSafetyAnalyzer();
