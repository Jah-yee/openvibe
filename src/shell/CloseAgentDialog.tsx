import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeNode } from "@/fleet/terminals";
import { useNodes } from "@/store/nodes";
import { uiStore, useUi } from "@/store/ui";

/** "Fermer Isis ?" before closing a running agent (spec habillage §7.5). */
export function CloseAgentDialog() {
  const closing = useUi((s) => s.closing);
  const name = useNodes((s) => (closing ? s.nodes[closing]?.payload.name : undefined)) || "cet agent";
  const close = () => uiStore.getState().setClosing(null);

  return (
    <Dialog open={closing !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fermer {name} ?</DialogTitle>
          <DialogDescription>{name} tourne encore. La fermer met fin à sa session.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            className="bg-ov-danger text-white hover:bg-ov-danger/90"
            onClick={() => {
              if (closing) removeNode(closing);
              close();
            }}
          >
            Fermer l'agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
