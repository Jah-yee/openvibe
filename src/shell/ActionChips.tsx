import { toast } from "sonner";
import { canvasStore } from "@/canvas/canvasStore";
import { agentsStore } from "@/fleet/agentsStore";
import { defaultAgent } from "@/fleet/catalog";
import { defaultLaunchOptions, launchAgent } from "@/fleet/launchAgent";
import { viewportCenter } from "@/fleet/placement";

/** Chips above the command bar (spec habillage §5.6); plan B adds the fleet ones. */
export function ActionChips() {
  const newConsole = () => {
    const agent = defaultAgent(agentsStore.getState().agents);
    const center = viewportCenter(canvasStore.getState().view);
    void launchAgent(agent, defaultLaunchOptions(), center).catch((error: unknown) =>
      toast.error(`Lancement impossible : ${String(error)}`),
    );
  };
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <button
        type="button"
        onClick={newConsole}
        className="ov-chip h-8 rounded-full px-3.5 text-[13px] font-semibold text-ov-text shadow-ov hover:brightness-125"
      >
        Nouvelle console
      </button>
    </div>
  );
}
