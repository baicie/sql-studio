import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Download } from 'lucide-react';
import { DataTable, DataTableColumnHeader, Toolbar, ToolbarButton } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import type { QueryResult } from '../../editor/types';

export interface ResultGridProps {
  result: QueryResult;
  elapsedMs?: number;
  onClose?: () => void;
}

interface ResultRow {
  __rowIndex: number;
  __cells: unknown[];
}

interface ResultSummaryBarProps {
  rowCount: number;
  columnCount: number;
  elapsedMs?: number;
  truncated?: boolean;
}

function ResultSummaryBar({ rowCount, columnCount, elapsedMs, truncated }: ResultSummaryBarProps) {
  const { t } = useAppTranslation('result');

  return (
    <div className="flex h-8 shrink-0 items-center gap-3 border-b bg-muted/20 px-3 text-xs">
      <span className="font-medium text-foreground">Result</span>
      <span className="text-muted-foreground">{rowCount} rows</span>
      <span className="text-muted-foreground">{columnCount} columns</span>
      {elapsedMs != null && <span className="text-muted-foreground">{elapsedMs}ms</span>}
      {truncated && <span className="text-yellow-600">{t('status.truncated')}</span>}
    </div>
  );
}

export function ResultGrid({ result, elapsedMs }: ResultGridProps) {
  const { t } = useAppTranslation('result');

  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    columnIndex: number;
  } | null>(null);

  const { columns, rows } = result;

  const formatCell = (cell: unknown): string => {
    if (cell === null) return t('cell.null');
    if (typeof cell === 'object') return JSON.stringify(cell);
    return String(cell);
  };

  const data: ResultRow[] = useMemo(
    () => rows.map((row, index) => ({ __rowIndex: index, __cells: row })),
    [rows],
  );

  const handleCellClick = useCallback((rowIndex: number, columnIndex: number) => {
    setSelectedCell({ rowIndex, columnIndex });
  }, []);

  const handleCopyCell = useCallback(() => {
    if (!selectedCell) return;
    const { rowIndex, columnIndex } = selectedCell;
    const value = formatCell(rows[rowIndex]?.[columnIndex]);
    void navigator.clipboard.writeText(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, rows]);

  const toCSV = useCallback(() => {
    const escape = (v: string) => {
      if (v.includes('"') || v.includes(',') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };
    const header = columns.map((c) => escape(c.name)).join(',');
    const body = rows
      .map((row) => row.map((cell) => escape(formatCell(cell))).join(','))
      .join('\n');
    return `${header}\n${body}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rows]);

  const toJSON = useCallback(() => {
    const data = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col.name] = row[i];
      });
      return obj;
    });
    return JSON.stringify(data, null, 2);
  }, [columns, rows]);

  const csvContent = useMemo(() => toCSV(), [toCSV]);
  const jsonContent = useMemo(() => toJSON(), [toJSON]);

  const tableColumns: ColumnDef<ResultRow, unknown>[] = useMemo(() => {
    const cols: ColumnDef<ResultRow, unknown>[] = [
      {
        id: '__rowNumber',
        size: 48,
        header: '#',
        cell: ({ row }) => (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {row.original.__rowIndex + 1}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ];

    columns.forEach((col, colIndex) => {
      cols.push({
        id: col.name,
        size: 160,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={`${col.name}\n(${col.databaseType})`} />
        ),
        cell: ({ row }) => {
          const cell = row.original.__cells[colIndex];
          const isSelected =
            selectedCell?.rowIndex === row.original.__rowIndex &&
            selectedCell?.columnIndex === colIndex;
          return (
            <div
              className={`flex h-full w-full cursor-pointer items-center overflow-hidden px-2 ${
                isSelected ? 'bg-primary/20' : ''
              }`}
              onClick={() => handleCellClick(row.original.__rowIndex, colIndex)}
              title={formatCell(cell)}
            >
              {cell === null ? (
                <span className="truncate italic text-muted-foreground">{t('cell.null')}</span>
              ) : (
                <span className="truncate">{formatCell(cell)}</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      });
    });

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, selectedCell, handleCellClick, t]);

  return (
    <div className="flex h-full flex-col">
      <ResultSummaryBar
        rowCount={rows.length}
        columnCount={columns.length}
        elapsedMs={elapsedMs ?? result.elapsedMs}
        truncated={result.truncated}
      />

      {result.truncated ? (
        <div className="shrink-0 border-b border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-500">
          Returned {result.rows.length} rows. Result may be truncated.
        </div>
      ) : null}

      <ResultToolbar
        onCopyCell={handleCopyCell}
        onExportCSV={() => downloadFile(csvContent, 'result.csv', 'text/csv')}
        onExportJSON={() => downloadFile(jsonContent, 'result.json', 'application/json')}
        selectedCell={selectedCell}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <DataTable
          columns={tableColumns}
          data={data}
          enableSorting={false}
          enablePagination={false}
          enableColumnVisibility={false}
          enableRowSelection={false}
          getRowId={(row) => String(row.__rowIndex)}
        />
      </div>
    </div>
  );
}

interface ResultToolbarProps {
  onCopyCell: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  selectedCell: { rowIndex: number; columnIndex: number } | null;
}

function ResultToolbar({
  onCopyCell,
  onExportCSV,
  onExportJSON,
  selectedCell,
}: ResultToolbarProps) {
  const { t } = useAppTranslation('result');

  return (
    <Toolbar className="shrink-0 border-b px-2 py-1">
      <ToolbarButton onClick={onCopyCell} disabled={!selectedCell} title={t('toolbar.copyCell')}>
        <Copy className="h-3 w-3" />
        {t('toolbar.copyCell')}
      </ToolbarButton>

      <div className="mx-1 h-3 w-px bg-border" />

      <ToolbarButton onClick={onExportCSV} title={t('toolbar.exportCsv')}>
        <Download className="h-3 w-3" />
        {t('toolbar.exportCsv')}
      </ToolbarButton>
      <ToolbarButton onClick={onExportJSON} title={t('toolbar.exportJson')}>
        <Download className="h-3 w-3" />
        {t('toolbar.exportJson')}
      </ToolbarButton>
    </Toolbar>
  );
}

async function downloadFile(content: string, filename: string, mimeType: string) {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      defaultPath: filename,
      filters: [
        {
          name: filename.endsWith('.csv') ? 'CSV' : 'JSON',
          extensions: [filename.split('.').pop() ?? '*'],
        },
      ],
    });

    if (filePath) {
      await writeTextFile(filePath, content);
    }
  } catch {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
