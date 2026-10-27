import { defineMessages } from "@/i18n";

/** App-level texts: toasts of the about, logs, updates and settings modules, and the start-up errors. */
export const appMessages = defineMessages(
  {
    loading: "Chargement…",
    hooksDown: "États des agents approximatifs : serveur local indisponible",
    aboutDescription: "Canvas d'agents local et open source.",
    logsFailed: "Impossible d'ouvrir le dossier des journaux",
    settingNotSaved: (error: string) => `Réglage non enregistré : ${error}`,
    upToDate: "OpenVibe est à jour.",
    updateCheckFailed: "Impossible de vérifier les mises à jour",
    startInterrupted: (message: string) => `démarrage interrompu (${message})`,
    projectsLoadFailed: (error: string) => `Impossible de charger les projets : ${error}`,
  },
  {
    loading: "Loading…",
    hooksDown: "Agent states are approximate: the local server is unavailable",
    aboutDescription: "A local, open source canvas for agents.",
    logsFailed: "Could not open the logs folder",
    settingNotSaved: (error: string) => `Setting not saved: ${error}`,
    upToDate: "OpenVibe is up to date.",
    updateCheckFailed: "Could not check for updates",
    startInterrupted: (message: string) => `start interrupted (${message})`,
    projectsLoadFailed: (error: string) => `Could not load the projects: ${error}`,
  },
);
