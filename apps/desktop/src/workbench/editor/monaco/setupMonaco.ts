import type * as monaco from 'monaco-editor';

export function setupMonaco(monacoInstance: typeof monaco) {
  monacoInstance.editor.defineTheme('sqlgui-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.sql', foreground: 'C586C0' },
      { token: 'string.sql', foreground: 'CE9178' },
      { token: 'number.sql', foreground: 'B5CEA8' },
      { token: 'comment.sql', foreground: '6A9955' },
    ],
    colors: {
      'editor.background': '#0f1115',
      'editorLineNumber.foreground': '#6b7280',
      'editorCursor.foreground': '#ffffff',
    },
  });

  monacoInstance.editor.defineTheme('sqlgui-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    },
  });

  registerSqlCompletionProvider(monacoInstance);
}

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'AS',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'ON',
  'USING',
  'NATURAL',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'FETCH',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'TRUNCATE',
  'CREATE INDEX',
  'DROP INDEX',
  'CREATE VIEW',
  'DROP VIEW',
  'CREATE DATABASE',
  'DROP DATABASE',
  'USE',
  'PRIMARY KEY',
  'FOREIGN KEY',
  'REFERENCES',
  'UNIQUE',
  'CHECK',
  'DEFAULT',
  'CONSTRAINT',
  'CASCADE',
  'RESTRICT',
  'DISTINCT',
  'ALL',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'EXISTS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'NULLIF',
  'CAST',
  'CONVERT',
  'TRUE',
  'FALSE',
  'VARCHAR',
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'REAL',
  'DOUBLE',
  'DATE',
  'TIME',
  'DATETIME',
  'TIMESTAMP',
  'BOOLEAN',
  'TEXT',
  'BLOB',
  'JSON',
];

function registerSqlCompletionProvider(monacoInstance: typeof monaco) {
  monacoInstance.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monacoInstance.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );

      const suggestions = SQL_KEYWORDS.map((keyword) => ({
        label: keyword,
        kind: monacoInstance.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range,
      }));

      return { suggestions };
    },
  });
}
