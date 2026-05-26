export function TrustPublisherDialog(props: {
  open: boolean;
  publisher: string;
  onTrust: () => void;
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
          <h2 className="text-lg font-semibold">Trust publisher?</h2>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Publisher <b>{props.publisher}</b> is not trusted yet.
          </p>
          <p>Only trust publishers if you understand the source of this plugin.</p>
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
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            onClick={props.onTrust}
          >
            Trust Publisher
          </button>
        </div>
      </div>
    </div>
  );
}
