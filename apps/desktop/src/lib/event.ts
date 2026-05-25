import type { Disposable } from './disposable';
import { toDisposable } from './disposable';

export type Listener<T> = (event: T) => void;

export class Emitter<T> implements Disposable {
  private readonly _listeners = new Set<Listener<T>>();

  event(listener: Listener<T>): Disposable {
    this._listeners.add(listener);

    return toDisposable(() => {
      this._listeners.delete(listener);
    });
  }

  fire(event: T) {
    for (const listener of this._listeners) {
      listener(event);
    }
  }

  dispose() {
    this._listeners.clear();
  }
}
