import { openLogDir } from "@/app/logs";
import { relaunchTerminal } from "@/nodes/terminal/registry";
import { nodesStore } from "@/store/nodes";

/**
 * Over an orchestrator refused for lack of OpenVibe's tools (spec première
 * version §4.1, spec orchestrateur §9): why, and a new attempt.
 */
export function ToolsUnavailable({ nodeId, message }: { nodeId: string; message: string }) {
  const retry = () => {
    const record = nodesStore.getState().nodes[nodeId];
    const session = record?.kind === "orchestrator" ? record.payload.session : undefined;
    if (session) void relaunchTerminal(nodeId, session, session.claudeSessionId ? "resume" : "new");
  };
  return (
    <div role="alert" className="absolute inset-0 z-10 grid place-items-center bg-ov-terminal p-4">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <p className="text-[13px] font-semibold text-ov-text">Outils OpenVibe indisponibles</p>
        <p className="text-[12px] text-ov-text-2">{message}</p>
        <p className="text-[12px] text-ov-text-2">Sans eux, l'orchestrateur pourrait modifier ta branche : il ne démarre pas.</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          <button
            type="button"
            onClick={retry}
            className="h-7 rounded-[8px] border border-ov-line px-2.5 text-[12px] text-ov-text transition-colors hover:bg-ov-hover"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => void openLogDir()}
            className="h-7 rounded-[8px] border border-ov-line px-2.5 text-[12px] text-ov-text transition-colors hover:bg-ov-hover"
          >
            Ouvrir le dossier des journaux
          </button>
        </div>
      </div>
    </div>
  );
}
