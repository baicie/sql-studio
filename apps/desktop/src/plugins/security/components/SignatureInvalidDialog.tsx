export function SignatureInvalidDialog(props: {
  open: boolean;
  extensionName: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm transition-opacity ${
        props.open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          props.onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-lg border bg-popover p-4 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-destructive">Invalid extension signature</h2>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Extension <b>{props.extensionName}</b> has an invalid signature.
          </p>
          <p>
            This may mean the package was modified after publishing. Installation has been blocked.
          </p>

          {props.message ? (
            <pre className="rounded bg-muted p-2 text-xs">{props.message}</pre>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
