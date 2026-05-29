/**
 * Native OS keychain credential store.
 *
 * Currently a stub. To be implemented in a future release:
 * - macOS: Keychain Services API
 * - Windows: Credential Manager
 * - Linux: libsecret / dbus-secret-service
 *
 * Until then, falls back to insecureCredentialStore.
 */
import { callNative } from '@/services/native/invoke';
import type { CredentialStore } from './credential-types';

export function createNativeCredentialStore(): CredentialStore {
  return {
    async save(connectionId, password) {
      await callNative<void>('credential_save', {
        request: {
          connection_id: connectionId,
          password,
        },
      });
    },

    async get(connectionId) {
      return await callNative<string | null>('credential_get', {
        connection_id: connectionId,
      });
    },

    async delete(connectionId) {
      await callNative<void>('credential_delete', {
        connection_id: connectionId,
      });
    },

    async has(connectionId) {
      const value = await this.get(connectionId);
      return value !== null;
    },

    async clear() {
      await callNative<void>('credential_clear');
    },
  };
}
