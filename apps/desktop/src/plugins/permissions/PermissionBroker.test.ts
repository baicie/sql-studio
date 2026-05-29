import { describe, expect, it, vi } from 'vitest';
import { permissionBroker } from './PermissionBroker';

vi.mock('./PermissionStorage', () => ({
  permissionStorage: {
    getGrant: vi.fn(() => null),
    getGrantedPermissions: vi.fn(() => []),
    updatePermissions: vi.fn(),
  },
}));

vi.mock('./PermissionPromptService', () => ({
  permissionPromptService: {
    requestPermissionGrant: vi.fn(async () => false),
    confirmDangerousOperation: vi.fn(async () => false),
  },
}));

vi.mock('./PluginAuditService', () => ({
  pluginAuditService: {
    record: vi.fn(),
  },
}));

describe('permissionBroker.getRequiredPermissions', () => {
  it('requires db.query.read for select SQL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: 'select * from users',
    });

    expect(required).toContain('db.query.read');
    expect(required).not.toContain('db.query.write');
  });

  it('requires both db.query.read and db.query.write for delete SQL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: 'delete from users where id = 1',
    });

    expect(required).toContain('db.query.read');
    expect(required).toContain('db.query.write');
  });

  it('requires both db.query.read and db.query.write for insert SQL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: "insert into users (name) values ('test')",
    });

    expect(required).toContain('db.query.read');
    expect(required).toContain('db.query.write');
  });

  it('requires both db.query.read and db.query.write for update SQL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: "update users set name = 'test' where id = 1",
    });

    expect(required).toContain('db.query.read');
    expect(required).toContain('db.query.write');
  });

  it('requires db.query.write for create table DDL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: 'create table test (id int)',
    });

    expect(required).toContain('db.query.read');
    expect(required).toContain('db.query.write');
  });

  it('returns network.fetch for unknown method', () => {
    const required = permissionBroker.getRequiredPermissions('some.unknown.method');

    expect(required).toContain('network.fetch');
  });

  it('returns empty array for known method with no required permissions', () => {
    const required = permissionBroker.getRequiredPermissions('commands.execute');

    expect(Array.isArray(required)).toBe(true);
    expect(required).not.toContain('network.fetch');
  });
});
