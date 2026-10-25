// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { expect, it } from "vitest";
import { themeStore } from "@/app/theme";
import { AppToaster } from "./AppToaster";
import { TOP_ROW_HEIGHT } from "./layout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("starts the toasts shown at the top below the top row, clear of the window buttons", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<AppToaster />));
  // Like the offer to resume every conversation, shown at launch in the top-right corner.
  await act(async () => {
    toast.custom(() => <div>Reprendre toutes les conversations ?</div>, { position: "top-right", duration: Infinity });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  const top = host.querySelector<HTMLElement>('[data-sonner-toaster][data-y-position="top"]');
  expect(top).not.toBeNull();
  expect(parseFloat(top!.style.getPropertyValue("--offset-top"))).toBeGreaterThan(TOP_ROW_HEIGHT);
  await act(async () => root.unmount());
  host.remove();
});

it("follows the app's theme, live", async () => {
  themeStore.setState({ choice: "light", systemDark: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<AppToaster />));
  await act(async () => {
    toast("Consigne envoyée");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  const toaster = () => host.querySelector<HTMLElement>("[data-sonner-toaster]")!;
  expect(toaster().dataset.sonnerTheme).toBe("light");
  await act(async () => themeStore.setState({ choice: "dark" }));
  expect(toaster().dataset.sonnerTheme).toBe("dark");
  await act(async () => root.unmount());
  host.remove();
});
