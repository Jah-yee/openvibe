import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startTheme } from "./app/theme";
import "./index.css";

startTheme(matchMedia("(prefers-color-scheme: dark)"));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
