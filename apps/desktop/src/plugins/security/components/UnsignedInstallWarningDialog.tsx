export function UnsignedInstallWarningDialog(props: {
  open: boolean;
  extensionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm transition-opacity ${
        props.open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          props.onCancel();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-lg border bg-popover p-4 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Install unsigned extension?</h2>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Extension <b>{props.extensionName}</b> is not signed.
          </p>
          <p>
            Unsigned extensions may have been modified or may not come from a trusted publisher.
            Only install it if you trust the source.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={props.onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:opacity-90"
            onClick={props.onConfirm}
          >
            Install Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
