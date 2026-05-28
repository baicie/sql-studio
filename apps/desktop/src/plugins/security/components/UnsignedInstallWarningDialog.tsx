import { Button } from '@sqlgui/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sqlgui/ui';

export function UnsignedInstallWarningDialog(props: {
  open: boolean;
  extensionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install unsigned extension?</DialogTitle>
          <DialogDescription>
            Extension <b>{props.extensionName}</b> is not signed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Unsigned extensions may have been modified or may not come from a trusted publisher.
            Only install it if you trust the source.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.onConfirm}>
            Install Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
