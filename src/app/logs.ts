import { toast } from "sonner";
import { call } from "@/ipc/invoke";

/** « Ouvrir le dossier des journaux » of the palette, the settings menu and the error screens. */
export async function openLogDir() {
  try {
    await call<void>("open_log_dir");
  } catch (error) {
    toast.error("Impossible d'ouvrir le dossier des journaux", { description: error instanceof Error ? error.message : String(error) });
  }
}
