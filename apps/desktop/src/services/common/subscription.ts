type Listener = () => void;

function createSubscription() {
  const listeners = new Set<Listener>();

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

export { createSubscription };
