/**
 * Abstraction for secure credential storage.
 *
 * MVP: Defaults to insecure localStorage fallback.
 * Future: Should be backed by OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret).
 */
export interface CredentialStore {
  save(connectionId: string, password: string): Promise<void>;
  get(connectionId: string): Promise<string | null>;
  delete(connectionId: string): Promise<void>;
  has(connectionId: string): Promise<boolean>;
  clear(): Promise<void>;
}
