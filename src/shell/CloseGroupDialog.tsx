import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCanvas } from "@/canvas/canvasStore";
import { closeGroup } from "@/fleet/groups";
import { livingAgents } from "@/fleet/groupSummary";
import { useNodes } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { uiStore, useUi } from "@/store/ui";

/** "Fermer le groupe Backend ?" listing the agents still running (spec habillage §11.4). */
export function CloseGroupDialog() {
  const groupId = useUi((s) => s.closingGroup);
  const group = useCanvas((s) => s.frames.find((f) => f.id === groupId) ?? null);
  const nodes = useNodes((s) => s.nodes);
  const statuses = useStore(terminalStatusStore, (s) => s.statuses);
  const living = group
    ? livingAgents(group.memberIds, (id) => nodes[id]?.payload.name || "Agent", (id) => statuses[id]?.state === "running")
    : [];
  const close = () => uiStore.getState().setClosingGroup(null);

  return (
    <Dialog open={groupId !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fermer le groupe {group?.name} ?</DialogTitle>
          <DialogDescription>
            Ces agents tournent encore ; fermer le groupe met fin à leur session : {living.join(", ")}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            className="bg-ov-danger text-white hover:bg-ov-danger/90"
            onClick={() => {
              if (groupId) closeGroup(groupId);
              close();
            }}
          >
            Fermer le groupe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
