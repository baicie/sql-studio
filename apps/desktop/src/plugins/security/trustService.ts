import { callNative } from '@/services/native/invoke';
import type { TrustedPublisher } from './types';

export const trustService = {
  listTrustedPublishers() {
    return callNative<TrustedPublisher[]>('extension_list_trusted_publishers');
  },

  trustPublisher(publisher: TrustedPublisher) {
    return callNative<void>('extension_trust_publisher', {
      publisher,
    });
  },

  revokePublisher(publisher: string) {
    return callNative<void>('extension_revoke_publisher', {
      publisher,
    });
  },
};
