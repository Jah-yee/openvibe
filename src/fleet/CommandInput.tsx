import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, X } from "lucide-react";
import { useStore } from "zustand";
import type { SceneFrame } from "@/canvas/groups";
import { cn } from "@/lib/utils";
import { sendCommand } from "./broadcast";
import { browseHistory, historyStore } from "./history";
import {
  extractMentions,
  matchOptions,
  mentionAt,
  resolveTargets,
  targetKey,
  targetOptions,
  uniqueTargets,
  withoutMention,
  type Target,
  type TargetAgent,
  type TargetOption,
} from "./targets";

const MENU_SIZE = 8;
const MAX_HEIGHT_PX = 120;

/**
 * The field of the command bar and of an orchestrator (spec habillage §12, §13):
 * `@` targets in chips, Enter sends to them (or to `fallback`), ↑ ↓ recall.
 */
export function CommandInput(props: {
  agents: readonly TargetAgent[];
  groups: readonly SceneFrame[];
  /** Reached without `@`: the selection, or an orchestrator's agents. */
  fallback: readonly string[];
  placeholder: string;
  /** Why Envoyer is grey when nothing is targeted. */
  emptyHint: string;
  compact?: boolean;
}) {
  const { agents, groups, fallback, placeholder, emptyHint, compact = false } = props;
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [active, setActive] = useState(0);
  // Escape closes the list for the mention typed at that position.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [browsing, setBrowsing] = useState<{ index: number; draft: string } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const history = useStore(historyStore, (s) => s.entries);

  const options = useMemo(() => targetOptions(agents, groups), [agents, groups]);
  const labels = new Map(options.map((o) => [targetKey(o.target), o.label]));
  const chips = targets.filter((t) => labels.has(targetKey(t)));
  const mention = mentionAt(text, caret);
  const matches = mention && mention.start !== dismissedAt ? matchOptions(options, mention.query).slice(0, MENU_SIZE) : [];
  const typed = extractMentions(text, options);
  const allTargets = uniqueTargets([...chips, ...typed.targets]);
  const ids = resolveTargets(allTargets, { all: agents.map((a) => a.id), groups }, fallback);
  const canSend = typed.text.length > 0 && ids.length > 0;
  const nothingTargeted = allTargets.length === 0 && fallback.length === 0;

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [text]);

  const edit = (value: string, at: number) => {
    setText(value);
    setCaret(at);
    setActive(0);
    setBrowsing(null);
  };

  const insert = (option: TargetOption) => {
    if (!mention) return;
    setTargets(uniqueTargets([...chips, option.target]));
    const next = withoutMention(text, mention.start, caret);
    edit(next.text, next.caret);
    requestAnimationFrame(() => field.current?.setSelectionRange(next.caret, next.caret));
  };

  const send = () => {
    if (!canSend) return;
    historyStore.getState().add(text);
    setTargets(allTargets);
    edit("", 0);
    void sendCommand(ids, typed.text);
  };

  const recall = (direction: "up" | "down") => {
    const index = browseHistory(history, browsing?.index ?? null, direction);
    const draft = browsing?.draft ?? text;
    const value = index === null ? draft : history[index];
    setText(value);
    setCaret(value.length);
    setBrowsing(index === null ? null : { index, draft });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (matches.length > 0 && mention) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : matches.length - 1;
        setActive((i) => (i + step) % matches.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insert(matches[Math.min(active, matches.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissedAt(mention.start);
        return;
      }
    }
    const element = e.currentTarget;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key === "ArrowUp" && !element.value.slice(0, element.selectionStart).includes("\n")) {
      e.preventDefault();
      recall("up");
    } else if (e.key === "ArrowDown" && browsing && !element.value.slice(element.selectionEnd).includes("\n")) {
      e.preventDefault();
      recall("down");
    } else if (e.key === "Backspace" && element.selectionEnd === 0 && chips.length > 0) {
      setTargets(chips.slice(0, -1));
    }
  };

  return (
    <div className="relative flex min-w-0 flex-1 items-end gap-2">
      {matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-xl border border-ov-line bg-ov-surface-2 py-1 shadow-ov"
        >
          {matches.map((option, i) => (
            <li
              key={`${targetKey(option.target)}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(option);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-1 text-xs",
                i === active ? "bg-ov-hover text-ov-text" : "text-ov-text-2",
              )}
            >
              <span className="font-mono text-ov-text">{option.label}</span>
              <span className="ml-auto truncate">{option.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {text.trim() && nothingTargeted && <p className="text-[11px] text-ov-text-2">{emptyHint}</p>}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {chips.map((target) => (
            <span
              key={targetKey(target)}
              className="flex h-6 items-center gap-1 rounded-full bg-ov-accent-soft pl-2 pr-1 font-mono text-[11px] text-ov-text"
            >
              {labels.get(targetKey(target))}
              <button
                type="button"
                aria-label={`Retirer ${labels.get(targetKey(target))}`}
                onClick={() => setTargets(chips.filter((c) => targetKey(c) !== targetKey(target)))}
                className="grid size-4 place-items-center rounded-full text-ov-text-2 hover:text-ov-text"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <textarea
            ref={field}
            rows={1}
            value={text}
            placeholder={chips.length > 0 ? "" : placeholder}
            onChange={(e) => edit(e.target.value, e.target.selectionStart)}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            className={cn(
              "min-w-[8rem] flex-1 resize-none bg-transparent py-1 text-ov-text outline-none placeholder:text-ov-text-2",
              compact ? "text-xs" : "text-[13px]",
            )}
          />
        </div>
      </div>
      <button
        type="button"
        aria-label="Envoyer"
        title={canSend ? "Envoyer" : nothingTargeted ? emptyHint : "Écris une consigne"}
        disabled={!canSend}
        onClick={send}
        className={cn(
          "grid shrink-0 place-items-center rounded-full",
          compact ? "size-7" : "size-8",
          canSend ? "bg-ov-accent text-white" : "bg-ov-card text-ov-text-2",
        )}
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  );
}
