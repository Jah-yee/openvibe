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
import { listPresets, listShells, type Preset, type PresetInfo, type ShellKind } from "@/ipc/pty";
import type { TerminalPayload } from "@/nodes/types";
import { defaultTitle, newTerminalPayload, PRESET_LABELS, SHELL_LABELS } from "./launch";

interface LaunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunch: (payload: TerminalPayload) => void;
}

/** Folder, preset, shell and title of a new terminal (spec §6.5). */
export function LaunchDialog({ open: isOpen, onOpenChange, onLaunch }: LaunchDialogProps) {
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [shells, setShells] = useState<ShellKind[]>([]);
  const [cwd, setCwd] = useState("");
  const [preset, setPreset] = useState<Preset>("claude");
  const [shell, setShell] = useState<ShellKind>("default");
  const [command, setCommand] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    void listPresets().then((list) => {
      setPresets(list);
      setPreset((current) => (list.find((p) => p.id === current)?.available ? current : "shell"));
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

  const canLaunch = cwd.trim() !== "" && (preset !== "custom" || command.trim() !== "");

  const launch = () => {
    onLaunch(newTerminalPayload({ title, cwd: cwd.trim(), preset, command, shell }));
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
              <Label>Préréglage</Label>
              <Select value={preset} onValueChange={(value) => setPreset(value as Preset)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={!p.available}>
                      {PRESET_LABELS[p.id]}
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
          {preset === "custom" && (
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
              placeholder={defaultTitle(preset, cwd)}
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
