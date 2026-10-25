import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startTheme } from "./app/theme";
import { trackTerminalFocus } from "./canvas/keyboardFocus";
import { installShortcuts } from "./commands/dispatch";
import "./index.css";

startTheme(matchMedia("(prefers-color-scheme: dark)"));
// For the app's whole life (spec fenêtre §6.2, §8).
installShortcuts(window);
trackTerminalFocus(document);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
