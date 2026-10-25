import { useEffect, useState, type ComponentProps } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Whether the window is maximized, read again after every resize: the button, a double-click on the strip, Win+Up, snapping. */
function useMaximized(): boolean {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let alive = true;
    const read = () =>
      void appWindow.isMaximized().then(
        (value) => alive && setMaximized(value),
        () => undefined,
      );
    read();
    const unlisten = appWindow.onResized(read);
    return () => {
      alive = false;
      void unlisten.then((stop) => stop());
    };
  }, []);
  return maximized;
}

function perform(action: () => Promise<void>, failure: string) {
  void action().catch((error: unknown) => toast.error(`${failure} : ${String(error)}`));
}

function WindowButton({ label, danger, className, ...props }: ComponentProps<"button"> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "grid h-[38px] w-[46px] shrink-0 place-items-center text-ov-text-2 transition-colors hover:bg-ov-hover hover:text-ov-text [&_svg]:size-4",
        danger && "hover:bg-[#C42B1C] hover:text-white",
        className,
      )}
      {...props}
    />
  );
}

/** Réduire, Agrandir / Restaurer, Fermer OpenVibe, Windows-style in the title bar's corner (spec identité §5.1). */
export function WindowControls() {
  const maximized = useMaximized();
  const appWindow = getCurrentWindow();
  return (
    <div className="flex shrink-0 items-stretch">
      <WindowButton label="Réduire" onClick={() => perform(() => appWindow.minimize(), "Réduction impossible")}>
        <Minus />
      </WindowButton>
      <WindowButton
        label={maximized ? "Restaurer" : "Agrandir"}
        onClick={() =>
          perform(() => appWindow.toggleMaximize(), maximized ? "Restauration impossible" : "Agrandissement impossible")
        }
      >
        {maximized ? <Copy /> : <Square />}
      </WindowButton>
      {/* close, not destroy: onCloseRequested saves first (src/app/close.ts). */}
      <WindowButton label="Fermer OpenVibe" danger onClick={() => perform(() => appWindow.close(), "Fermeture impossible")}>
        <X />
      </WindowButton>
    </div>
  );
}
