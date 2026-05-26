export interface RpcTransport {
  postMessage(message: unknown): void;
  addMessageListener(listener: (message: unknown) => void): () => void;
}

export function createWorkerTransport(): RpcTransport {
  return {
    postMessage(message: unknown) {
      globalThis.postMessage(message);
    },

    addMessageListener(listener: (message: unknown) => void) {
      const handler = (event: MessageEvent) => {
        listener(event.data);
      };

      globalThis.addEventListener('message', handler);

      return () => {
        globalThis.removeEventListener('message', handler);
      };
    },
  };
}
