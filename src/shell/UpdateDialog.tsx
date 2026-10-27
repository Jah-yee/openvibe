import { ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { installUpdate, updatesStore, useUpdates } from "@/app/updates";
import { useNodes } from "@/store/nodes";
import { isRunning, terminalStatusStore } from "@/store/terminalStatus";

/** « Version x disponible » in the title bar, once a check found one (spec première version §6.4). */
export function UpdateChip() {
  const available = useUpdates((s) => s.available);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={() => updatesStore.setState({ dialogOpen: true })}
      className="flex h-6 items-center gap-1 rounded-full bg-ov-accent-soft px-2 text-[11px] font-medium text-ov-accent hover:brightness-110"
    >
      <ArrowDownCircle className="size-3.5" />
      Version {available.version} disponible
    </button>
  );
}

/** What an update will stop, then download, save and install. */
export function UpdateDialog() {
  const { available, dialogOpen, progress } = useUpdates((s) => s);
  const nodes = useNodes((s) => s.nodes);
  useStore(terminalStatusStore, (s) => s.statuses);
  const running = Object.entries(nodes)
    .filter(([id]) => isRunning(id))
    .map(([, record]) => record.payload.name || ("title" in record.payload ? record.payload.title : "") || "Agent");
  const close = () => updatesStore.setState({ dialogOpen: false });
  const busy = progress !== null;
  const install = () =>
    void installUpdate().catch((error: unknown) => {
      updatesStore.setState({ progress: null });
      toast.error("La mise à jour a échoué", { description: error instanceof Error ? error.message : String(error) });
    });

  return (
    <Dialog open={dialogOpen && available !== null} onOpenChange={(open) => !open && !busy && close()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OpenVibe {available?.version}</DialogTitle>
          <DialogDescription>
            {running.length > 0
              ? `Ces agents seront arrêtés ; leurs conversations Claude pourront être reprises au redémarrage : ${running.join(", ")}.`
              : "OpenVibe va se fermer le temps de l'installation, puis redémarrer."}
          </DialogDescription>
        </DialogHeader>
        {available?.notes && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-ov-card p-2 text-[12px] text-ov-text-2">{available.notes}</pre>}
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Plus tard
          </Button>
          <Button onClick={install} disabled={busy}>
            {busy ? `Téléchargement… ${Math.round((progress ?? 0) * 100)} %` : "Installer et redémarrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
