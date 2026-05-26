export type SignatureStatus = 'verified' | 'unsigned' | 'invalid' | 'untrusted' | 'unknown';

export interface PublisherKey {
  keyId: string;
  algorithm: 'ed25519';
  publicKey: string;
  createdAt: number;
}

export interface TrustedPublisher {
  publisher: string;
  displayName?: string;
  trusted: boolean;
  keys: PublisherKey[];
  trustedAt: number;
}

export interface PluginSignatureInfo {
  algorithm: 'ed25519';
  publisher: string;
  keyId: string;
  signature: string;
  signedAt: number;
}

export interface PluginChecksumFile {
  algorithm: 'sha256';
  files: Record<string, string>;
}

export interface PluginVerificationResult {
  status: SignatureStatus;
  publisher?: string;
  keyId?: string;
  message?: string;
  checksumsValid: boolean;
  signatureValid: boolean;
  publisherTrusted: boolean;
}
