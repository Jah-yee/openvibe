import { Network } from "lucide-react";
import { FleetPanel } from "@/fleet/FleetPanel";
import { uiStore, useUi } from "@/store/ui";
import { RoundButton } from "./ui";

/** The vertical pill on the right (spec habillage §5.5); its only entry for now is the fleet. */
export function RightRail() {
  const open = useUi((s) => s.fleetOpen);
  return (
    <>
      <nav className="pointer-events-auto absolute right-4 top-1/2 z-30 flex w-11 -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-ov-line bg-ov-surface py-2 shadow-ov">
        <RoundButton label="Flotte" active={open} onClick={() => uiStore.getState().setFleetOpen(!open)}>
          <Network />
        </RoundButton>
      </nav>
      {open && <FleetPanel />}
    </>
  );
}
