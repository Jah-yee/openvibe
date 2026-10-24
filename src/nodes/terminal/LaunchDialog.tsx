import { useEffect, useState } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AGENTS } from "@/fleet/catalog";
import { listAgents, listShells, type AgentId, type AgentInfo, type ShellKind } from "@/ipc/pty";
import type { TerminalPayload } from "@/nodes/types";
import { defaultTitle, newTerminalPayload, SHELL_LABELS } from "./launch";

interface LaunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunch: (payload: TerminalPayload) => void;
}

/** Folder, agent, shell and title of a new terminal (spec §6.5). */
export function LaunchDialog({ open: isOpen, onOpenChange, onLaunch }: LaunchDialogProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [shells, setShells] = useState<ShellKind[]>([]);
  const [cwd, setCwd] = useState("");
  const [agent, setAgent] = useState<AgentId>("claude");
  const [shell, setShell] = useState<ShellKind>("default");
  const [command, setCommand] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    void listAgents().then((list) => {
      const usable = list.filter((a) => a.id !== "ollama");
      setAgents(usable);
      setAgent((current) => (usable.find((a) => a.id === current)?.available ? current : "shell"));
    });
    void listShells().then((list) => {
      setShells(list);
      setShell(list[0] ?? "default");
    });
    void homeDir().then((home) => setCwd((current) => current || home));
  }, [isOpen]);

  const browse = async () => {
    const picked = await open({ directory: true, defaultPath: cwd || undefined, title: "Dossier de travail" });
    if (typeof picked === "string") setCwd(picked);
  };

  const canLaunch = cwd.trim() !== "" && (agent !== "custom" || command.trim() !== "");

  const launch = () => {
    onLaunch(newTerminalPayload({ title, cwd: cwd.trim(), agent, command, shell }));
    setTitle("");
    setCommand("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau terminal</DialogTitle>
          <DialogDescription>Le terminal hérite de ton environnement : connexion Claude, PATH, profil du shell.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="launch-cwd">Dossier</Label>
            <div className="flex gap-2">
              <Input id="launch-cwd" value={cwd} onChange={(e) => setCwd(e.target.value)} />
              <Button type="button" variant="outline" onClick={browse} aria-label="Parcourir">
                <FolderOpen />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Agent</Label>
              <Select value={agent} onValueChange={(value) => setAgent(value as AgentId)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={!p.available}>
                      {AGENTS[p.id].label}
                      {!p.available && " (introuvable)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Shell</Label>
              <Select value={shell} onValueChange={(value) => setShell(value as ShellKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shells.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SHELL_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {agent === "custom" && (
            <div className="grid gap-1.5">
              <Label htmlFor="launch-command">Commande</Label>
              <Input id="launch-command" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npm run dev" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="launch-title">Titre</Label>
            <Input
              id="launch-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle(agent, cwd)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={launch} disabled={!canLaunch}>
            Lancer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
