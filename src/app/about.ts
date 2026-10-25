import { getVersion } from "@tauri-apps/api/app";
import { toast } from "sonner";

/** « À propos d'OpenVibe » of the settings menu and the palette. */
export async function showAbout() {
  const version = await getVersion();
  toast(`OpenVibe ${version}`, { description: "Canvas d'agents local et open source." });
}
