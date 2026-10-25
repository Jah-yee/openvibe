import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Labelled = { label: string };

/** A button of the floating rails (spec identité §5.4, §5.5): 36 × 34, the active one in the accent. */
export function ToolButton({ label, active = false, className, ...props }: ComponentProps<"button"> & Labelled & { active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative grid h-[34px] w-9 shrink-0 place-items-center rounded-[9px] text-ov-text-2 transition-colors hover:bg-ov-hover hover:text-ov-text [&_svg]:size-4",
        active && "bg-ov-accent-soft text-ov-accent hover:bg-ov-accent-soft hover:text-ov-accent",
        className,
      )}
      {...props}
    />
  );
}

/** A small icon button of panels, tabs and bars. */
export function IconButton({ label, className, ...props }: ComponentProps<"button"> & Labelled) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-[6px] text-ov-text-2 transition-colors hover:bg-ov-hover hover:text-ov-text [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/** The main action of a screen or a popover (spec identité §4.4: radius 10). */
export function AccentButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] bg-ov-accent px-3.5 text-[13px] font-semibold text-ov-on-accent transition-[filter] hover:brightness-110 disabled:opacity-40 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
