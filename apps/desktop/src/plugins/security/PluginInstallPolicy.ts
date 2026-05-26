import type { SignatureStatus } from './types';

export interface InstallPolicyDecision {
  allow: boolean;
  allowUnsigned?: boolean;
  allowUntrusted?: boolean;
  allowInvalidSignature?: boolean;
  reason?: string;
}

export class PluginInstallPolicy {
  decide(status: SignatureStatus): InstallPolicyDecision {
    if (status === 'verified') {
      return { allow: true };
    }

    if (status === 'unsigned') {
      return {
        allow: false,
        allowUnsigned: false,
        reason: 'Extension package is unsigned.',
      };
    }

    if (status === 'untrusted') {
      return {
        allow: false,
        allowUntrusted: false,
        reason: 'Extension publisher is not trusted.',
      };
    }

    if (status === 'invalid') {
      return {
        allow: false,
        allowInvalidSignature: false,
        reason: 'Extension signature is invalid.',
      };
    }

    return {
      allow: false,
      reason: 'Unable to verify extension package.',
    };
  }
}

export const pluginInstallPolicy = new PluginInstallPolicy();
