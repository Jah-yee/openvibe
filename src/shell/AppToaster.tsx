import { Toaster } from "@/components/ui/sonner";
import { TOP_ROW_HEIGHT } from "./layout";

/**
 * The app's toasts. Those shown at the top (the offer to resume every
 * conversation) start below the top row, never over the window buttons (spec
 * fenêtre §4.3); the other sides keep sonner's default offset.
 */
export function AppToaster() {
  return <Toaster theme="dark" position="bottom-right" offset={{ top: TOP_ROW_HEIGHT + 8 }} />;
}
