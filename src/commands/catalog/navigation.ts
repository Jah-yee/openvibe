import { arrive } from "@/canvas/arrive";
import { overview, releaseToCanvas } from "@/canvas/canvasFocus";
import { canvasStore } from "@/canvas/canvasStore";
import { stepTerminal, terminalOrder } from "@/canvas/terminalOrder";
import { fitScene, zoomTo } from "@/canvas/viewActions";
import { agentsPanelStore, setAgentsPanel } from "@/fleet/agentsPanelState";
import { focusCommandBar } from "@/shell/commandBarFocus";
import { projectsStore } from "@/store/projects";
import type { Command, CommandContext } from "../command";
import { openPalette } from "../paletteState";

export const inProject = (ctx: CommandContext) => ctx.project;
const withTerminals = (ctx: CommandContext) => ctx.project && ctx.terminalCount > 0;
const always = () => true;

/** Ctrl+Tab and Ctrl+Maj+Tab (spec fenêtre §6.3): the next terminal in reading order, then the arrival (§6.4). */
function step(direction: 1 | -1, ctx: CommandContext) {
  const api = canvasStore.getState().api;
  if (!api) return;
  const target = stepTerminal(terminalOrder(api.getSceneElements()), ctx.terminalId, direction);
  if (target) arrive(target);
}

export const NAVIGATION: readonly Command[] = [
  { id: "terminal.next", label: "Terminal suivant", section: "Navigation", keywords: ["suivant", "terminal", "agent"], shortcut: "Ctrl+Tab", available: withTerminals, run: (ctx) => step(1, ctx) },
  { id: "terminal.previous", label: "Terminal précédent", section: "Navigation", keywords: ["précédent", "terminal", "agent"], shortcut: "Ctrl+Maj+Tab", available: withTerminals, run: (ctx) => step(-1, ctx) },
  { id: "palette.goTo", label: "Aller à…", section: "Navigation", keywords: ["chercher", "rechercher", "terminal", "groupe", "workspace", "projet"], shortcut: "Ctrl+P", available: always, run: (ctx) => openPalette("goTo", ctx) },
  { id: "canvas.overview", label: "Vue d'ensemble", section: "Navigation", keywords: ["ensemble", "tout", "voir", "agents"], shortcut: "Ctrl+Maj+A", available: inProject, run: () => overview() },
  { id: "canvas.release", label: "Rendre la main au canvas", section: "Navigation", keywords: ["canvas", "clavier", "dessin"], shortcut: "Maj+Échap", available: inProject, run: () => releaseToCanvas() },
  { id: "canvas.fit", label: "Ajuster à la scène", section: "Navigation", keywords: ["ajuster", "vue", "tout"], available: inProject, run: () => fitScene() },
  { id: "canvas.zoom100", label: "Zoom 100 %", section: "Navigation", keywords: ["zoom", "taille", "réelle"], available: inProject, run: () => zoomTo(1) },
  { id: "commandBar.focus", label: "Écrire une consigne", section: "Navigation", keywords: ["consigne", "commande", "barre"], available: inProject, run: () => void focusCommandBar() },
  {
    id: "agentsPanel.toggle",
    label: () => (agentsPanelStore.getState().open ? "Masquer le panneau Agents" : "Afficher le panneau Agents"),
    section: "Navigation",
    keywords: ["agents", "panneau", "flotte"],
    available: inProject,
    run: () => setAgentsPanel(!agentsPanelStore.getState().open),
  },
  { id: "project.home", label: "Accueil", section: "Navigation", keywords: ["projets", "accueil"], available: inProject, run: () => projectsStore.getState().goHome() },
  { id: "project.close", label: "Fermer le projet", section: "Navigation", keywords: ["fermer", "projet"], available: inProject, run: () => projectsStore.getState().close() },
  { id: "palette.functions", label: "Rechercher une fonction…", section: "Navigation", keywords: ["fonction", "commande", "action"], shortcut: "Ctrl+Maj+P", available: always, run: (ctx) => openPalette("functions", ctx) },
];
