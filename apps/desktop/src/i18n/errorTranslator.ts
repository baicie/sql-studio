import i18n from 'i18next';

export interface NativeErrorPayload {
  code?: string;
  message?: string;
  detail?: string;
}

export function translateError(error: unknown): string {
  const payload = normalizeErrorPayload(error);

  if (!payload.code) {
    return (
      payload.message ||
      i18n.t('error:unknown', {
        message: String(error),
      })
    );
  }

  const translated = i18n.t(`error:${payload.code}`, {
    defaultValue: '',
    message: payload.message,
    detail: payload.detail,
  });

  if (translated) {
    return translated;
  }

  return i18n.t('error:unknown', {
    message: payload.message || payload.code,
  });
}

function normalizeErrorPayload(error: unknown): NativeErrorPayload {
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (typeof error === 'string') {
    try {
      return JSON.parse(error);
    } catch {
      return {
        message: error,
      };
    }
  }

  if (typeof error === 'object' && error !== null) {
    return error as NativeErrorPayload;
  }

  return {
    message: String(error),
  };
}
