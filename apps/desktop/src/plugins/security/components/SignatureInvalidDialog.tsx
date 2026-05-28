import { Button } from '@sqlgui/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sqlgui/ui';

export function SignatureInvalidDialog(props: {
  open: boolean;
  extensionName: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Invalid extension signature</DialogTitle>
          <DialogDescription>
            Extension <b>{props.extensionName}</b> has an invalid signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            This may mean the package was modified after publishing. Installation has been blocked.
          </p>

          {props.message ? (
            <pre className="rounded bg-muted p-2 text-xs">{props.message}</pre>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
