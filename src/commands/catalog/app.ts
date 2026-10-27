import { showAbout } from "@/app/about";
import { openLogDir } from "@/app/logs";
import { checkForUpdate } from "@/app/updates";
import { addProject } from "@/home/addProject";
import { setLanguage } from "@/i18n/settings";
import { closeWindow, minimizeWindow, toggleMaximizeWindow, windowStore } from "@/shell/windowState";
import { projectsStore } from "@/store/projects";
import type { Command } from "../command";
import { command, sectionNamed } from "./define";
import { catalog } from "./messages";

const always = () => true;
const projects = sectionNamed((s) => s.projects);
const windowSection = sectionNamed((s) => s.window);
const help = sectionNamed((s) => s.help);

/** Projets, Fenêtre and Aide (spec fenêtre §7.3), the last sections of the palette. */
export const APP: readonly Command[] = [
  command("project.add", { section: projects, available: () => projectsStore.getState().view === "home", run: () => addProject() }),
  command("window.minimize", { section: windowSection, available: always, run: () => minimizeWindow() }),
  command("window.maximize", {
    label: () => (windowStore.getState().maximized ? catalog().restore : catalog().maximize),
    section: windowSection,
    available: always,
    run: () => toggleMaximizeWindow(),
  }),
  command("window.close", { section: windowSection, available: always, run: () => closeWindow() }),
  command("app.about", { section: help, available: always, run: () => showAbout() }),
  command("app.updates", { section: help, available: always, run: () => checkForUpdate({ manual: true }) }),
  command("app.logs", { section: help, available: always, run: () => openLogDir() }),
  // Three lines rather than one cycling « Langue » line: each is found by its own words and does one thing.
  command("language.fr", { section: help, available: always, run: () => setLanguage("fr") }),
  command("language.en", { section: help, available: always, run: () => setLanguage("en") }),
  command("language.system", { section: help, available: always, run: () => setLanguage("system") }),
];
