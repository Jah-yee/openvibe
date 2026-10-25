import { ArrowLeft, Settings, X } from "lucide-react";
import { projectsStore } from "@/store/projects";
import { LiveCount } from "./LiveCount";
import { ProjectPicker } from "./ProjectPicker";
import { SettingsMenu } from "./SettingsMenu";
import { PillButton, RoundButton } from "./ui";
import { WindowControls } from "./WindowControls";
import { WorkspaceTabs } from "./WorkspaceTabs";

/** Floating pills over the canvas, no band (spec habillage §5.2). */
export function TopBar() {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-start justify-between gap-4">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2">
        <PillButton onClick={() => projectsStore.getState().goHome()}>
          <ArrowLeft /> Accueil
        </PillButton>
        <ProjectPicker />
        <WorkspaceTabs />
        <PillButton onClick={() => void projectsStore.getState().close()}>
          <X /> Fermer
        </PillButton>
      </div>
      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        <LiveCount />
        <SettingsMenu
          trigger={
            <RoundButton label="Réglages" className="border border-ov-line bg-ov-surface shadow-ov">
              <Settings />
            </RoundButton>
          }
        />
        <WindowControls />
      </div>
    </div>
  );
}
