import type { RpcNotification, RpcRequest, RpcResponse } from '@sqlgui/api';

export interface RpcTransport {
  postMessage(message: unknown): void;
  addMessageListener(listener: (message: unknown) => void): () => void;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export class RpcClient {
  private seq = 0;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(private readonly transport: RpcTransport) {
    this.transport.addMessageListener((message) => {
      this.handleMessage(message);
    });
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    const id = String(++this.seq);

    const request: RpcRequest = {
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.transport.postMessage({
        type: 'rpc:request',
        request,
      });
    });
  }

  notify(method: string, params?: unknown): void {
    const notification: RpcNotification = {
      method,
      params,
    };

    this.transport.postMessage({
      type: 'rpc:notification',
      notification,
    });
  }

  private handleMessage(message: unknown): void {
    if (!isRpcResponseMessage(message)) return;

    const response = message.response;
    const pending = this.pending.get(response.id);

    if (!pending) return;

    this.pending.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message || response.error.code || 'RPC Error'));
      return;
    }

    pending.resolve(response.result);
  }
}

function isRpcResponseMessage(
  value: unknown,
): value is { type: 'rpc:response'; response: RpcResponse } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: string }).type === 'rpc:response'
  );
}
