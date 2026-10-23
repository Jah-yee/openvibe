import { Plus, SquareTerminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NodeKind } from "./nodeElement";

const ITEMS: { kind: NodeKind; label: string; icon: typeof SquareTerminal }[] = [
  { kind: "terminal", label: "Terminal", icon: SquareTerminal },
];

export function InsertMenu({ onInsert }: { onInsert: (kind: NodeKind) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus /> Insérer
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ITEMS.map(({ kind, label, icon: Icon }) => (
          <DropdownMenuItem key={kind} onSelect={() => onInsert(kind)}>
            <Icon /> {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
