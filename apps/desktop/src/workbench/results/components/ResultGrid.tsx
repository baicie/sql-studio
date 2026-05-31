import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Download } from 'lucide-react';
import { DataTable, Toolbar, ToolbarButton } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import type { QueryResult } from '../../editor/types';
import { cn } from '@/lib/cn';

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

/**
 * Flux Result Summary Bar — Slim bar above the result table.
 * Shows: result label, row count, column count, execution time, truncation warning.
 */
function ResultSummaryBar({ rowCount, columnCount, elapsedMs, truncated }: ResultSummaryBarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-3 border-b border-outline-variant bg-surface-container px-3 text-[11px] text-on-surface-variant">
      {/* Result label */}
      <span className="flex items-center gap-1.5 font-medium text-on-surface">
        {/* Table icon */}
        <svg
          className="h-3.5 w-3.5 text-secondary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
        </svg>
        Result
      </span>

      <span className="h-3 w-px bg-outline-variant" />

      <span>{rowCount.toLocaleString()} rows</span>
      <span>{columnCount} columns</span>

      {elapsedMs != null && (
        <>
          <span className="h-3 w-px bg-outline-variant" />
          <span className="flex items-center gap-1 font-mono tabular-nums">
            {/* Timer icon */}
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {elapsedMs}ms
          </span>
        </>
      )}

      {truncated && (
        <span className="ml-auto rounded-[4px] bg-amber-500/20 px-1.5 py-0.5 text-amber-400">
          Truncated
        </span>
      )}
    </div>
  );
}

export function ResultGrid({ result, elapsedMs }: ResultGridProps) {
  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    columnIndex: number;
  } | null>(null);

  const { columns, rows } = result;

  const formatCell = (cell: unknown): string => {
    if (cell === null) return 'NULL';
    if (typeof cell === 'boolean') return cell ? 'true' : 'false';
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
          <div className="flex h-full w-full items-center justify-center font-mono text-[11px] text-on-surface-variant">
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
        header: () => (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface">
              {col.name}
            </span>
            <span className="text-[10px] font-mono text-on-surface-variant">
              {col.databaseType}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const cell = row.original.__cells[colIndex];
          const isSelected =
            selectedCell?.rowIndex === row.original.__rowIndex &&
            selectedCell?.columnIndex === colIndex;
          return (
            <div
              className={cn(
                'flex h-full w-full cursor-pointer items-center overflow-hidden px-2 font-mono text-[12px]',
                isSelected
                  ? 'bg-primary-container/30 text-on-primary-container'
                  : cell === null
                    ? 'italic text-on-surface-variant'
                    : 'text-on-surface',
              )}
              onClick={() => handleCellClick(row.original.__rowIndex, colIndex)}
              title={formatCell(cell)}
            >
              <span className="truncate">{formatCell(cell)}</span>
            </div>
          );
        },
        enableSorting: false,
      });
    });

    return cols;
  }, [columns, selectedCell, handleCellClick]);

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      <ResultSummaryBar
        rowCount={rows.length}
        columnCount={columns.length}
        elapsedMs={elapsedMs ?? result.elapsedMs}
        truncated={result.truncated}
      />

      {/* Truncation warning */}
      {result.truncated ? (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-400">
          Returned {rows.length.toLocaleString()} rows. Result may be truncated.
        </div>
      ) : null}

      {/* Toolbar */}
      <ResultToolbar
        onCopyCell={handleCopyCell}
        onExportCSV={() => downloadFile(csvContent, 'result.csv', 'text/csv')}
        onExportJSON={() => downloadFile(jsonContent, 'result.json', 'application/json')}
        selectedCell={selectedCell}
      />

      {/* Data table */}
      <div className="min-h-0 flex-1 overflow-auto flux-scrollbar">
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
    <Toolbar className="shrink-0 px-2 py-1">
      <ToolbarButton onClick={onCopyCell} disabled={!selectedCell} title={t('toolbar.copyCell')}>
        <Copy className="h-3 w-3" />
        <span className="text-[11px]">{t('toolbar.copyCell')}</span>
      </ToolbarButton>

      <div className="mx-0.5 h-3 w-px bg-outline-variant" />

      <ToolbarButton onClick={onExportCSV} title={t('toolbar.exportCsv')}>
        <Download className="h-3 w-3" />
        <span className="text-[11px]">CSV</span>
      </ToolbarButton>
      <ToolbarButton onClick={onExportJSON} title={t('toolbar.exportJson')}>
        <Download className="h-3 w-3" />
        <span className="text-[11px]">JSON</span>
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
