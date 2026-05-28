import { Button } from '@sqlgui/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sqlgui/ui';

export function TrustPublisherDialog(props: {
  open: boolean;
  publisher: string;
  onTrust: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trust publisher?</DialogTitle>
          <DialogDescription>
            Publisher <b>{props.publisher}</b> is not trusted yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Only trust publishers if you understand the source of this plugin.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button onClick={props.onTrust}>Trust Publisher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
