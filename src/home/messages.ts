import { defineMessages, plural } from "@/i18n";

/** The home screen's texts (spec première version §7.1). */
export const homeMessages = defineMessages(
  {
    title: "Projets",
    add: "Ajouter un projet",
    none: "Aucun projet",
    noneHint: "Un projet est un dossier de dépôt : tes agents y démarrent et la puce git le suit.",
    pickFolder: "Dossier du projet",
    addFailed: (error: string) => `Ajout impossible : ${error}`,
    card: {
      newFolder: "Nouveau dossier du projet",
      removeConfirm: (name: string) =>
        `Retirer « ${name} » de la liste ? Ses workspaces seront supprimés et ses agents arrêtés. Le dossier n'est pas touché.`,
      removeTitle: "Retirer le projet",
      removeOk: "Retirer",
      cancel: "Annuler",
      actions: "Actions du projet",
      rename: "Renommer",
      changeFolder: "Changer de dossier",
      removeFromList: "Retirer de la liste",
      missing: "Dossier introuvable",
      workspaces: (count: number) => plural("fr", count, "workspace", "workspaces"),
      liveAgents: (count: number) => plural("fr", count, "agent actif", "agents actifs"),
      openFailed: (error: string) => `Ouverture impossible : ${error}`,
      renameFailed: (error: string) => `Renommage impossible : ${error}`,
      changeFailed: (error: string) => `Changement impossible : ${error}`,
      removeFailed: (error: string) => `Retrait impossible : ${error}`,
    },
  },
  {
    title: "Projects",
    add: "Add a project",
    none: "No projects",
    noneHint: "A project is a repository folder: your agents start there and the git chip follows it.",
    pickFolder: "Project folder",
    addFailed: (error: string) => `Could not add the project: ${error}`,
    card: {
      newFolder: "New project folder",
      removeConfirm: (name: string) =>
        `Remove "${name}" from the list? Its workspaces will be deleted and its agents stopped. The folder is not touched.`,
      removeTitle: "Remove the project",
      removeOk: "Remove",
      cancel: "Cancel",
      actions: "Project actions",
      rename: "Rename",
      changeFolder: "Change folder",
      removeFromList: "Remove from the list",
      missing: "Folder not found",
      workspaces: (count: number) => plural("en", count, "workspace", "workspaces"),
      liveAgents: (count: number) => plural("en", count, "active agent", "active agents"),
      openFailed: (error: string) => `Could not open the project: ${error}`,
      renameFailed: (error: string) => `Could not rename: ${error}`,
      changeFailed: (error: string) => `Could not change the folder: ${error}`,
      removeFailed: (error: string) => `Could not remove the project: ${error}`,
    },
  },
);
