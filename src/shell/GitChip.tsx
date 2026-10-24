import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { gitStatus, type GitStatus } from "@/ipc/git";
import { useProjects } from "@/store/projects";

const POLL_MS = 5000;

/** "⑂ main 7": branch and changed files of the project folder (spec habillage §5.6). */
export function GitChip() {
  const path = useProjects((s) => s.projects.find((p) => p.id === s.activeId)?.path);
  const [status, setStatus] = useState<GitStatus | null>(null);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    const read = () =>
      gitStatus(path).then(
        (next) => alive && setStatus(next),
        () => alive && setStatus(null),
      );
    void read();
    const timer = setInterval(() => void read(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path]);

  // An empty span keeps the zoom control on the right of the bottom row.
  if (!status) return <span />;
  return (
    <div
      title={path}
      className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-full border border-ov-line bg-ov-surface px-3 font-mono text-xs text-ov-text shadow-ov"
    >
      <GitBranch className="size-3.5 text-ov-text-2" />
      {status.branch}
      {status.changed > 0 && (
        <span className="rounded-full bg-ov-accent px-1.5 text-[10px] text-white">{status.changed}</span>
      )}
    </div>
  );
}
