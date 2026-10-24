import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A floating pill of the shell: buttons of the top bar, chips (spec habillage §5). */
export function PillButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-ov-line bg-ov-surface px-3 text-[13px] font-medium text-ov-text shadow-ov transition-colors hover:bg-ov-card disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** A chip of the bottom row (spec habillage §5.6): dark fill, multicolor outline. */
export function ChipButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "ov-chip h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold text-ov-text shadow-ov hover:brightness-125",
        className,
      )}
      {...props}
    />
  );
}

/** A round icon button of the rails and controls; `active` fills it in orange. */
export function RoundButton({
  className,
  active,
  label,
  ...props
}: ComponentProps<"button"> & { active?: boolean; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-ov-text-2 transition-colors hover:bg-ov-card hover:text-ov-text [&_svg]:size-4",
        active && "bg-ov-accent text-white hover:bg-ov-accent hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
