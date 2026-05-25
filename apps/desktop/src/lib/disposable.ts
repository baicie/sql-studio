export interface Disposable {
  dispose: () => void;
}

export class DisposableStore implements Disposable {
  private readonly _disposables = new Set<Disposable>();
  private _disposed = false;

  add<T extends Disposable>(disposable: T): T {
    if (this._disposed) {
      disposable.dispose();
      return disposable;
    }

    this._disposables.add(disposable);
    return disposable;
  }

  dispose() {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    for (const disposable of this._disposables) {
      disposable.dispose();
    }

    this._disposables.clear();
  }
}

export function toDisposable(dispose: () => void): Disposable {
  return { dispose };
}
