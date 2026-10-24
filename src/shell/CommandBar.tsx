import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useCanvas } from "@/canvas/canvasStore";
import { isGroup } from "@/canvas/groups";
import { AGENTS } from "@/fleet/catalog";
import { CommandInput } from "@/fleet/CommandInput";
import { HINT_KEY, historyStore } from "@/fleet/history";
import { selectionTargets, targetAgents } from "@/fleet/targets";
import { getSetting, setSetting } from "@/ipc/db";
import { terminalOf, useNodes } from "@/store/nodes";
import { useWorkspaces } from "@/store/workspaces";

/** The bar under the chips (spec habillage §5.6, §12): a command for the workspace's agents. */
export function CommandBar() {
  const nodeIds = useCanvas((s) => s.nodeIds);
  const frames = useCanvas((s) => s.frames);
  const selectedIds = useCanvas((s) => s.view.selectedIds);
  const nodes = useNodes((s) => s.nodes);
  const projectId = useWorkspaces((s) => s.projectId);

  useEffect(() => {
    if (projectId) void historyStore.getState().load(projectId);
  }, [projectId]);

  const agents = useMemo(
    () =>
      targetAgents(
        nodeIds,
        (id) => {
          const payload = terminalOf(nodes[id]);
          return payload ? payload.name || AGENTS[payload.agent].label : undefined;
        },
        frames,
      ),
    [nodeIds, nodes, frames],
  );
  const groups = useMemo(() => frames.filter(isGroup), [frames]);
  const fallback = useMemo(
    () => selectionTargets(selectedIds, frames, agents.map((a) => a.id)),
    [selectedIds, frames, agents],
  );

  return (
    <div className="pointer-events-auto flex w-[560px] items-end gap-3 rounded-2xl bg-ov-command px-3 py-2 shadow-ov">
      <span className="ov-orb ov-orb-live mb-1.5 size-5 shrink-0" />
      <CommandInput
        agents={agents}
        groups={groups}
        fallback={fallback}
        placeholder="Écris une consigne · @ pour cibler…"
        emptyHint="Sélectionne des agents ou tape @"
      />
    </div>
  );
}

/** "Essaie « @tous lance les tests »", above the chips until dismissed (spec §12). */
export function CommandHint() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let alive = true;
    getSetting<boolean>(HINT_KEY).then(
      (dismissed) => alive && setShown(dismissed !== true),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!shown) return null;
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-ov-line bg-ov-surface-2 py-1 pl-3 pr-1 text-xs text-ov-text-2 shadow-ov">
      Essaie « @tous lance les tests »
      <button
        type="button"
        aria-label="Masquer l'indice"
        onClick={() => {
          setShown(false);
          void setSetting(HINT_KEY, true).catch(() => undefined);
        }}
        className="grid size-5 place-items-center rounded-full hover:bg-ov-card hover:text-ov-text"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
