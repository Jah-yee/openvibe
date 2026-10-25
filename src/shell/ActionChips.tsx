import { pauseAll, resumeAll, workspaceTerminalIds } from "@/fleet/broadcast";
import { ComposeGroup } from "@/fleet/ComposeGroup";
import { launchFour, newConsole } from "@/fleet/quickActions";
import { ChipButton } from "./ui";

/** Chips above the command bar (spec habillage §5.6). */
export function ActionChips() {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <ChipButton onClick={newConsole}>Nouvelle console</ChipButton>
      <ChipButton onClick={launchFour}>Lancer 4</ChipButton>
      <ComposeGroup trigger={<ChipButton>Groupe</ChipButton>} />
      <ChipButton onClick={() => void pauseAll(workspaceTerminalIds())}>Tout mettre en pause</ChipButton>
      <ChipButton onClick={() => void resumeAll(workspaceTerminalIds())}>Tout reprendre</ChipButton>
    </div>
  );
}
