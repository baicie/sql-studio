/* eslint-disable react-hooks/incompatible-library */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Copy, Download } from 'lucide-react';
import { Toolbar, ToolbarButton } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import type { QueryResult } from '../../editor/types';

export interface ResultGridProps {
  result: QueryResult;
  onClose?: () => void;
}

export function ResultGrid({ result }: ResultGridProps) {
  const { t } = useAppTranslation('result');

  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    columnIndex: number;
  } | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: result.rows.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 28,
    overscan: 20,
  });

  const { columns, rows } = result;

  const formatCell = (cell: unknown): string => {
    if (cell === null) return t('cell.null');
    if (typeof cell === 'object') return JSON.stringify(cell);
    return String(cell);
  };

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

  return (
    <div className="flex h-full flex-col">
      <ResultToolbar
        onCopyCell={handleCopyCell}
        onExportCSV={() => downloadFile(csvContent, 'result.csv', 'text/csv')}
        onExportJSON={() => downloadFile(jsonContent, 'result.json', 'application/json')}
        selectedCell={selectedCell}
      />

      <div className="min-h-0 flex-1 overflow-auto" ref={tableRef}>
        <div className="min-w-full text-xs">
          <div className="sticky top-0 z-10 flex bg-muted/50">
            <div className="flex w-12 shrink-0 items-center justify-center border-b px-2 py-1.5 text-muted-foreground">
              #
            </div>
            {columns.map((col, i) => (
              <div
                key={i}
                className="flex min-w-[80px] max-w-[200px] shrink-0 flex-col border-b px-2 py-1.5"
              >
                <span className="truncate font-medium" title={`${col.name} (${col.databaseType})`}>
                  {col.name}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {col.databaseType}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 flex w-full hover:bg-muted/30"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex w-12 shrink-0 items-center justify-center px-2 text-muted-foreground">
                    {virtualRow.index + 1}
                  </div>
                  {row.map((cell, cellIndex) => {
                    const isSelected =
                      selectedCell?.rowIndex === virtualRow.index &&
                      selectedCell?.columnIndex === cellIndex;
                    return (
                      <div
                        key={cellIndex}
                        className={`flex min-w-[80px] max-w-[200px] shrink-0 cursor-pointer items-center border-b px-2 py-1 ${
                          isSelected ? 'bg-primary/20' : ''
                        }`}
                        onClick={() => handleCellClick(virtualRow.index, cellIndex)}
                        title={formatCell(cell)}
                      >
                        {cell === null ? (
                          <span className="truncate italic text-muted-foreground">
                            {t('cell.null')}
                          </span>
                        ) : (
                          <span className="truncate">{formatCell(cell)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
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
