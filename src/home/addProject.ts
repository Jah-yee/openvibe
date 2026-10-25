import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { projectsStore } from "@/store/projects";

/** « Ajouter un projet » of the home screen and the palette: a folder, picked in Windows' dialog. */
export async function addProject() {
  const picked = await open({ directory: true, title: "Dossier du projet" });
  if (typeof picked !== "string") return;
  await projectsStore
    .getState()
    .add(picked)
    .catch((error: unknown) => toast.error(`Ajout impossible : ${String(error)}`));
}
