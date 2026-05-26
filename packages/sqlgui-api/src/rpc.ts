export interface RpcRequest {
  id: string;
  method: string;
  params?: unknown;
}

export interface RpcResponse {
  id: string;
  result?: unknown;
  error?: RpcError;
}

export interface RpcNotification {
  method: string;
  params?: unknown;
}

export interface RpcError {
  code: string;
  message: string;
  data?: unknown;
}

export type RpcMessage =
  | {
      type: 'rpc:request';
      request: RpcRequest;
    }
  | {
      type: 'rpc:response';
      response: RpcResponse;
    }
  | {
      type: 'rpc:notification';
      notification: RpcNotification;
    };
