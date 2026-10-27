import type { ReactElement } from "react";
import { ArrowDownCircle, Download, FileText, ImageDown, Info, Upload } from "lucide-react";
import { showAbout } from "@/app/about";
import { openLogDir } from "@/app/logs";
import { checkForUpdate, setAutoUpdates, useUpdates } from "@/app/updates";
import { readThemeChoice, setThemeChoice, setTransparency, useThemeSettings } from "@/app/theme";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCurrentPng, exportCurrentScene, importIntoScene } from "./sceneActions";

/** Gear menu: what Excalidraw's hidden main menu used to offer (spec habillage §5.2), opened from `trigger`. */
export function SettingsMenu({
  trigger,
  side = "bottom",
  align = "end",
}: {
  trigger: ReactElement;
  side?: "bottom" | "left";
  align?: "start" | "end";
}) {
  const { choice, transparency } = useThemeSettings();
  const autoUpdates = useUpdates((s) => s.auto);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-56">
        <DropdownMenuLabel className="ov-label">Thème</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={choice} onValueChange={(value) => void setThemeChoice(readThemeChoice(value))}>
          <DropdownMenuRadioItem value="system">Système</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Clair (Ivoire)</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Sombre (Argile)</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuCheckboxItem checked={transparency} onCheckedChange={(on) => void setTransparency(on === true)}>
          Effets de transparence
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={exportCurrentScene}>
          <Download /> Exporter la scène…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={importIntoScene}>
          <Upload /> Importer une scène…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportCurrentPng}>
          <ImageDown /> Exporter en PNG…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={autoUpdates} onCheckedChange={(on) => void setAutoUpdates(on === true)}>
          Rechercher les mises à jour automatiquement
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem onSelect={() => void checkForUpdate({ manual: true })}>
          <ArrowDownCircle /> Rechercher les mises à jour
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void showAbout()}
        >
          <Info /> À propos d'OpenVibe
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void openLogDir()}>
          <FileText /> Ouvrir le dossier des journaux
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
