/**
 * Credential store entry point.
 *
 * Dev mode: always uses insecure localStorage fallback (safer for development).
 * Prod mode: should use native OS keychain when implemented.
 *
 * WARNING: The insecure fallback stores passwords in plaintext.
 * A secure keychain implementation is planned for a future release.
 *
 * TODO: Switch to native OS keychain in production mode:
 *   - macOS: Keychain Services API
 *   - Windows: Credential Manager
 *   - Linux: libsecret / dbus-secret-service
 *
 *   Once nativeCredentialStore is implemented, replace createInsecureCredentialStore()
 *   with createNativeCredentialStore() for non-dev builds.
 */
import { createInsecureCredentialStore } from './insecure-credential-store';
import type { CredentialStore } from './credential-types';

export type { CredentialStore } from './credential-types';

let _credentialStore: CredentialStore | null = null;

function getCredentialStore(): CredentialStore {
  if (!_credentialStore) {
    _credentialStore = createInsecureCredentialStore();
  }
  return _credentialStore;
}

export const credentialStore: CredentialStore = {
  async save(connectionId, password) {
    return getCredentialStore().save(connectionId, password);
  },

  async get(connectionId) {
    return getCredentialStore().get(connectionId);
  },

  async delete(connectionId) {
    return getCredentialStore().delete(connectionId);
  },

  async has(connectionId) {
    return getCredentialStore().has(connectionId);
  },

  async clear() {
    return getCredentialStore().clear();
  },
};
