import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeNodes } from "@/fleet/terminals";
import { useNodes } from "@/store/nodes";
import { uiStore, useUi } from "@/store/ui";

/**
 * "Fermer Isis ?" before closing a running agent (spec habillage §7.5), or
 * "Fermer 2 agents ?" when an undo or Suppr took several at once (retours J8b).
 */
export function CloseAgentDialog() {
  const closing = useUi((s) => s.closing);
  const nodes = useNodes((s) => s.nodes);
  const names = (closing?.agents ?? []).map((id) => nodes[id]?.payload.name || "Agent");
  const close = () => uiStore.getState().setClosing(null);
  const one = names.length <= 1;
  const name = names[0] ?? "cet agent";

  return (
    <Dialog open={closing !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{one ? `Fermer ${name} ?` : `Fermer ${names.length} agents ?`}</DialogTitle>
          <DialogDescription>
            {one
              ? `${name} tourne encore. La fermer met fin à sa session.`
              : `Ces agents tournent encore ; les fermer met fin à leur session : ${names.join(", ")}.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            className="bg-ov-danger text-white hover:bg-ov-danger/90"
            onClick={() => {
              if (closing) removeNodes(closing.remove);
              close();
            }}
          >
            {one ? "Fermer l'agent" : "Fermer les agents"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
