import { Smartphone } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setRemoteControl, useRemoteLink, type RemoteLink } from "./remoteControl";

/** What the phone icon says. */
export function remoteLabel(link: RemoteLink | undefined, wanted: boolean, running: boolean): string {
  if (link?.state === "on") return "Remote Control actif";
  if (link?.state === "connecting") return "Remote Control : connexion…";
  if (link?.state === "pending") return "Remote Control à la fin de son tour";
  if (link?.state === "error") return `Remote Control : ${link.error ?? "échec"}`;
  if (wanted) return running ? "Remote Control demandé" : "Remote Control au prochain démarrage";
  return "Remote Control";
}

function run(nodeId: string, on: boolean) {
  void setRemoteControl(nodeId, on).then((result) => {
    if (result && "error" in result) toast.error(`Remote Control : ${result.error}`);
  });
}

/** Remote Control of one Claude session, in its header (spec maj §2). */
export function RemoteButton({ nodeId, wanted, running }: { nodeId: string; wanted: boolean; running: boolean }) {
  const link = useRemoteLink(nodeId);
  const label = remoteLabel(link, wanted, running);
  const url = link?.url;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          data-remote={link?.state ?? (wanted ? "wanted" : "off")}
          className={cn(
            "grid size-5 place-items-center rounded hover:bg-ov-card [&_svg]:size-3.5",
            link?.state === "on" ? "text-ov-accent" : link?.state === "error" ? "text-ov-danger" : wanted ? "text-ov-text" : "text-ov-text-2 hover:text-ov-text",
            (link?.state === "connecting" || link?.state === "pending") && "animate-pulse",
          )}
        >
          <Smartphone />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {wanted ? (
          <>
            <DropdownMenuItem onSelect={() => run(nodeId, false)}>Couper Remote Control</DropdownMenuItem>
            {link?.state === "error" && <DropdownMenuItem onSelect={() => run(nodeId, true)}>Réessayer</DropdownMenuItem>}
          </>
        ) : (
          <DropdownMenuItem onSelect={() => run(nodeId, true)}>Activer Remote Control</DropdownMenuItem>
        )}
        {url && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(url).then(() => toast("Lien copié"))}>Copier le lien</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void openUrl(url)}>Ouvrir dans le navigateur</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
