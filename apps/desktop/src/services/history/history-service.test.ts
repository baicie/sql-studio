import { describe, expect, it } from 'vitest';
import { createHistoryService } from './history-service';
import type { HistoryStorage } from './history-service';

function createMemoryStorage(): HistoryStorage {
  const data = new Map<string, unknown>();

  return {
    getJSON<T>(key: string): T | null {
      return (data.get(key) as T | undefined) ?? null;
    },
    setJSON<T>(key: string, value: T): void {
      data.set(key, value);
    },
  };
}

describe('historyService', () => {
  it('keeps latest history at first position', () => {
    const service = createHistoryService(createMemoryStorage());

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 2',
      status: 'success',
      elapsedMs: 1,
      startedAt: 3,
      finishedAt: 4,
    });

    expect(service.getHistory()[0]?.sql).toBe('select 2');
  });

  it('can delete a history entry', () => {
    const service = createHistoryService(createMemoryStorage());

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    const [entry] = service.getHistory();
    service.deleteEntry(entry.id);

    expect(service.getHistory()).toHaveLength(0);
  });

  it('can clear all history', () => {
    const service = createHistoryService(createMemoryStorage());

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 2',
      status: 'success',
      elapsedMs: 1,
      startedAt: 3,
      finishedAt: 4,
    });

    service.clearHistory();

    expect(service.getHistory()).toHaveLength(0);
  });

  it('notifies subscribers on changes', () => {
    const service = createHistoryService(createMemoryStorage());
    let notifyCount = 0;

    service.subscribe(() => {
      notifyCount++;
    });

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    expect(notifyCount).toBe(1);

    const [entry] = service.getHistory();
    service.deleteEntry(entry.id);

    expect(notifyCount).toBe(2);

    service.clearHistory();

    expect(notifyCount).toBe(3);
  });

  it('limits history to MAX_HISTORY entries', () => {
    const service = createHistoryService(createMemoryStorage());

    for (let i = 0; i < 105; i++) {
      service.addEntry({
        connectionId: 'conn-1',
        connectionName: 'local',
        sql: `select ${i}`,
        status: 'success',
        elapsedMs: 1,
        startedAt: i,
        finishedAt: i + 1,
      });
    }

    expect(service.getHistory()).toHaveLength(100);
  });

  it('can unsubscribe', () => {
    const service = createHistoryService(createMemoryStorage());
    let notifyCount = 0;

    const unsubscribe = service.subscribe(() => {
      notifyCount++;
    });

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    expect(notifyCount).toBe(1);

    unsubscribe();

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 2',
      status: 'success',
      elapsedMs: 1,
      startedAt: 3,
      finishedAt: 4,
    });

    expect(notifyCount).toBe(1);
  });
});
