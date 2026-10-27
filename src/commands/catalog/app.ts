import { showAbout } from "@/app/about";
import { openLogDir } from "@/app/logs";
import { checkForUpdate } from "@/app/updates";
import { addProject } from "@/home/addProject";
import { closeWindow, minimizeWindow, toggleMaximizeWindow, windowStore } from "@/shell/windowState";
import { projectsStore } from "@/store/projects";
import type { Command } from "../command";

const always = () => true;

/** Projets, Fenêtre and Aide (spec fenêtre §7.3), the last sections of the palette. */
export const APP: readonly Command[] = [
  {
    id: "project.add",
    label: "Ajouter un projet",
    section: "Projets",
    keywords: ["projet", "dossier", "ajouter"],
    available: () => projectsStore.getState().view === "home",
    run: () => addProject(),
  },
  { id: "window.minimize", label: "Réduire", section: "Fenêtre", keywords: ["fenêtre", "réduire"], available: always, run: () => minimizeWindow() },
  {
    id: "window.maximize",
    label: () => (windowStore.getState().maximized ? "Restaurer" : "Agrandir"),
    section: "Fenêtre",
    keywords: ["fenêtre", "agrandir", "restaurer", "plein écran"],
    available: always,
    run: () => toggleMaximizeWindow(),
  },
  { id: "window.close", label: "Fermer OpenVibe", section: "Fenêtre", keywords: ["fenêtre", "fermer", "quitter"], available: always, run: () => closeWindow() },
  { id: "app.about", label: "À propos d'OpenVibe", section: "Aide", keywords: ["version", "aide", "à propos"], available: always, run: () => showAbout() },
  {
    id: "app.updates",
    label: "Rechercher les mises à jour",
    section: "Aide",
    keywords: ["mise à jour", "version", "nouvelle", "update", "aide"],
    available: always,
    run: () => checkForUpdate({ manual: true }),
  },
  {
    id: "app.logs",
    label: "Ouvrir le dossier des journaux",
    section: "Aide",
    keywords: ["journal", "journaux", "logs", "bug", "aide"],
    available: always,
    run: () => openLogDir(),
  },
];
