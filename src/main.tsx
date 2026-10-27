import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installLogging } from "./app/log";
import { startTheme } from "./app/theme";
import { trackTerminalFocus } from "./canvas/keyboardFocus";
import { installShortcuts } from "./commands/dispatch";
import { installRadial } from "./radial/install";
import "./index.css";

// First: what follows can already write to the log file.
installLogging();
startTheme(matchMedia("(prefers-color-scheme: dark)"));
// For the app's whole life (spec fenêtre §6.2, §8).
installShortcuts(window);
trackTerminalFocus(document);
installRadial(window);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
