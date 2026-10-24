import { getVersion } from "@tauri-apps/api/app";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Download, ImageDown, Info, Settings, Upload } from "lucide-react";
import { toast } from "sonner";
import { canvasStore } from "@/canvas/canvasStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/store/workspaces";
import { exportPng, exportScene, importScene } from "./sceneFiles";
import { RoundButton } from "./ui";

function run(action: (api: ExcalidrawImperativeAPI) => Promise<boolean>, failure: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  action(api).catch((error: unknown) => toast.error(`${failure} : ${String(error)}`));
}

/** Gear menu: what Excalidraw's hidden main menu used to offer (spec habillage §5.2). */
export function SettingsMenu() {
  const name = useWorkspaces((s) => s.workspaces.find((w) => w.id === s.activeId)?.name ?? "scene");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <RoundButton label="Réglages" className="border border-ov-line bg-ov-surface shadow-ov">
          <Settings />
        </RoundButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => run((api) => exportScene(api, name), "Export impossible")}>
          <Download /> Exporter la scène…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(importScene, "Import impossible")}>
          <Upload /> Importer une scène…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run((api) => exportPng(api, name), "Export impossible")}>
          <ImageDown /> Exporter en PNG…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            void getVersion().then((version) =>
              toast(`OpenVibe ${version}`, { description: "Canvas d'agents local et open source." }),
            )
          }
        >
          <Info /> À propos d'OpenVibe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
