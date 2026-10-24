import { useStore } from "zustand";
import { countsText } from "@/fleet/groupSummary";
import { screenRectOf } from "@/fleet/placement";
import { ROLES } from "@/fleet/roles";
import { terminalStatusStore } from "@/store/terminalStatus";
import { useCanvas, type CanvasView } from "../canvasStore";
import { isGroup, type SceneGroup } from "../groups";

/** The label sits on the frame's top edge, 16 px from its corner, like a tab (spec §11.4). */
const LABEL_INSET = 16;
const LABEL_HEIGHT = 24;

/**
 * Group labels, above the canvas. Excalidraw's own frame name stays below as
 * the handle that selects, drags and renames the frame: excalidraw.css gives
 * it the label's font and place, and it is made transparent here.
 *
 * `.excalidraw` makes no stacking context, so its layers compete with ours:
 * at z-index 3, placed before Excalidraw in the DOM, the labels cover frame
 * names and nodes (2) but stay under its text editor (3) and its panels (4).
 */
export function GroupLabels() {
  const frames = useCanvas((s) => s.frames);
  const view = useCanvas((s) => s.view);
  const statuses = useStore(terminalStatusStore, (s) => s.statuses);
  const groups = frames.filter(isGroup);
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      <style>{groups.map((g) => `.excalidraw [id$="-frame-name-${g.id}"]{color:transparent!important}`).join("\n")}</style>
      {groups.map((group) =>
        group.id === view.editingFrame ? null : (
          <GroupLabel
            key={group.id}
            group={group}
            view={view}
            working={group.memberIds.filter((id) => statuses[id]?.state === "running").length}
          />
        ),
      )}
    </div>
  );
}

function GroupLabel({ group, view, working }: { group: SceneGroup; view: CanvasView; working: number }) {
  const rect = screenRectOf(group, view);
  const role = ROLES[group.group.role];
  return (
    <div
      className="absolute flex items-center rounded-t-lg border border-b-0 bg-ov-surface pr-1.5 text-[11px] whitespace-nowrap"
      style={{
        // One pixel left so the name lines up with the native one under it, despite the border.
        left: rect.x + LABEL_INSET - 1,
        top: rect.y - LABEL_HEIGHT,
        height: LABEL_HEIGHT,
        borderColor: `color-mix(in srgb, ${role.color} 60%, transparent)`,
      }}
    >
      <span className="grid w-7 shrink-0 place-items-center">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: role.color }} />
      </span>
      <span className="font-semibold tracking-[0.08em] text-ov-text uppercase">{group.name}</span>
      <span className="ml-2 font-mono text-ov-text-2">{countsText(group.memberIds.length, working)}</span>
    </div>
  );
}
