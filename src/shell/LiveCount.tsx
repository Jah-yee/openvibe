import { plural } from "@/lib/format";
import { useRunningCount } from "@/store/running";
import { useWorkspaces } from "@/store/workspaces";

/** "● 3 actifs": running agents of the whole project (spec habillage §5.2). */
export function LiveCount() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const running = useRunningCount(workspaces.map((w) => w.id));
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-full border border-ov-line bg-ov-surface px-3 font-mono text-xs text-ov-text shadow-ov">
      <span className="size-1.5 rounded-full bg-ov-live" />
      {plural(running, "actif", "actifs")}
    </div>
  );
}
