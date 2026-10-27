import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAgents } from "@/fleet/agentsStore";
import { LaunchOptionsForm } from "@/fleet/LaunchOptionsForm";
import type { LaunchOptions } from "@/fleet/launchAgent";
import type { TerminalPayload } from "@/nodes/types";
import { nodesStore } from "@/store/nodes";
import { useMessages } from "@/i18n";
import { nodesMessages } from "@/nodes/messages";

/** Folder, shell, title and command of one terminal, used at its next launch. */
export function TerminalOptionsDialog(props: { nodeId: string; payload: TerminalPayload; onClose: () => void }) {
  const { nodeId, payload, onClose } = props;
  const t = useMessages(nodesMessages).options;
  const shells = useAgents((s) => s.shells);
  const [value, setValue] = useState<LaunchOptions>({
    cwd: payload.cwd,
    shell: payload.shell,
    title: payload.title,
    command: payload.command,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title(payload.name || t.thisTerminal)}</DialogTitle>
        </DialogHeader>
        <LaunchOptionsForm value={value} shells={shells.length ? shells : [payload.shell]} onChange={setValue} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            onClick={() => {
              nodesStore.getState().update(nodeId, {
                cwd: value.cwd.trim() || payload.cwd,
                shell: value.shell,
                title: value.title.trim() || payload.title,
                command: value.command.trim(),
              });
              onClose();
            }}
          >
            {t.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
