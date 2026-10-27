import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { useStore } from "zustand";
import type { SceneFrame } from "@/canvas/groups";
import { useLang, useMessages } from "@/i18n";
import { useNativeKeyDown } from "@/lib/useNativeKeyDown";
import { cn } from "@/lib/utils";
import { sendCommand } from "./broadcast";
import { fleetMessages } from "./messages";
import { browseHistory, historyStore } from "./history";
import { commandAt, isKnownCommand, isSlashCommand, matchCommands } from "./slashCommands";
import {
  extractMentions,
  keptDismissal,
  matchOptions,
  mentionAt,
  mentionParts,
  partTargets,
  resolveTargets,
  targetKey,
  targetOptions,
  uniqueTargets,
  withoutMention,
  type Target,
  type TargetAgent,
} from "./targets";

const MENU_SIZE = 8;
const MAX_HEIGHT_PX = 120;

/** A line of the list above the field: a target, or a command of the agents' CLI. */
interface Suggestion {
  key: string;
  label: string;
  detail: string;
  pick: () => void;
}

/** Escape keeps the list closed while the same `@` mention or `/command` is typed. */
function keptClosed(dismissedAt: number | null, text: string, caret: number): number | null {
  if (dismissedAt === null) return null;
  return keptDismissal(dismissedAt, text, caret) ?? (commandAt(text, caret)?.start === dismissedAt ? dismissedAt : null);
}

/**
 * The field of the command bar and of an orchestrator (spec habillage §12, §13):
 * `@` targets in chips (`@athena/zeus` for several), `/` the agents' commands,
 * Enter sends to them (or to `fallback`), ↑ ↓ recall.
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
  const t = useMessages(fleetMessages).command;
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [active, setActive] = useState(0);
  // Escape closes the list for the mention typed at that position.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [browsing, setBrowsing] = useState<{ index: number; draft: string } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const history = useStore(historyStore, (s) => s.entries);

  // The « @tous » / "@all" label and the details follow the language.
  const lang = useLang();
  const options = useMemo(() => targetOptions(agents, groups), [agents, groups, lang]);
  const labels = new Map(options.map((o) => [targetKey(o.target), o.label]));
  const chips = targets.filter((t) => labels.has(targetKey(t)));
  const mention = mentionAt(text, caret);
  const parts = mention ? mentionParts(mention.query) : null;
  const command = mention ? null : commandAt(text, caret);
  const menuStart = mention?.start ?? command?.start ?? null;
  // A recalled command keeps its list closed: ↑ goes on through the history.
  const shown = menuStart !== null && menuStart !== dismissedAt && browsing === null;
  const fullCommand = command !== null && isKnownCommand(`/${command.query}`);
  const suggestions: Suggestion[] = !shown
    ? []
    : parts
      ? matchOptions(options, parts.query)
          .slice(0, MENU_SIZE)
          .map((option, i) => ({
            key: `${targetKey(option.target)}-${i}`,
            label: option.label,
            detail: option.detail,
            pick: () => insertTargets([...partTargets(parts.typed, options), option.target]),
          }))
      : matchCommands(command?.query ?? "")
          .slice(0, MENU_SIZE)
          .map((found) => ({ key: found.name, label: found.name, detail: found.hint, pick: () => insertCommand(found.name) }));
  const typed = extractMentions(text, options);
  const allTargets = uniqueTargets([...chips, ...typed.targets]);
  const ids = resolveTargets(allTargets, { all: agents.map((a) => a.id), groups }, fallback);
  // A command for a mistyped target must not go to the selection instead.
  const unknown = isSlashCommand(typed.text) ? /(?:^|\s)(@[^\s@,;:.!?…]+)/.exec(typed.text)?.[1] : undefined;
  const canSend = typed.text.length > 0 && ids.length > 0 && unknown === undefined;
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
    setDismissedAt((dismissed) => keptClosed(dismissed, value, at));
  };

  const moveCaret = (at: number) => requestAnimationFrame(() => field.current?.setSelectionRange(at, at));

  const insertTargets = (picked: readonly Target[]) => {
    if (!mention) return;
    setTargets(uniqueTargets([...chips, ...picked]));
    const next = withoutMention(text, mention.start, caret);
    edit(next.text, next.caret);
    moveCaret(next.caret);
  };

  const insertCommand = (name: string) => {
    if (!command) return;
    const value = `${text.slice(0, command.start)}${name} ${text.slice(caret)}`;
    const at = command.start + name.length + 1;
    edit(value, at);
    moveCaret(at);
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

  const onKeyDown = (e: KeyboardEvent) => {
    if (suggestions.length > 0 && menuStart !== null) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : suggestions.length - 1;
        setActive((i) => (i + step) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && !fullCommand)) {
        e.preventDefault();
        suggestions[Math.min(active, suggestions.length - 1)].pick();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissedAt(menuStart);
        return;
      }
    }
    const element = e.currentTarget as HTMLTextAreaElement;
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
  // In an orchestrator the field sits inside the canvas, which must not see its keys.
  useNativeKeyDown(field, onKeyDown);

  return (
    <div className="relative flex min-w-0 flex-1 items-end gap-2">
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          className={cn(
            "absolute bottom-full left-0 z-10 mb-2 overflow-hidden rounded-xl border border-ov-line bg-ov-surface-2 py-1 shadow-ov",
            parts ? "w-64" : "w-96 max-w-full",
          )}
        >
          {suggestions.map((suggestion, i) => (
            <li
              key={suggestion.key}
              role="option"
              aria-selected={i === active}
              title={suggestion.detail}
              onMouseDown={(e) => {
                e.preventDefault();
                suggestion.pick();
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-1 text-xs",
                i === active ? "bg-ov-hover text-ov-text" : "text-ov-text-2",
              )}
            >
              <span className="shrink-0 font-mono text-ov-text">{suggestion.label}</span>
              <span className="ml-auto truncate">{suggestion.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {text.trim() && nothingTargeted && <p className="text-[11px] text-ov-text-2">{emptyHint}</p>}
        {unknown && <p className="text-[11px] text-ov-text-2">{t.unknownTarget(unknown)}</p>}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {chips.map((target) => (
            <span
              key={targetKey(target)}
              className="flex h-6 items-center gap-1 rounded-full bg-ov-accent-soft pl-2 pr-1 font-mono text-[11px] text-ov-text"
            >
              {labels.get(targetKey(target))}
              <button
                type="button"
                aria-label={t.remove(labels.get(targetKey(target)) ?? "")}
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
            className={cn(
              "min-w-[8rem] flex-1 resize-none bg-transparent py-1 text-ov-text outline-none placeholder:text-ov-text-2",
              compact ? "text-xs" : "text-[13px]",
            )}
          />
        </div>
      </div>
      <button
        type="button"
        aria-label={t.send}
        title={canSend ? t.send : nothingTargeted ? emptyHint : t.writeInstruction}
        disabled={!canSend}
        onClick={send}
        className={cn(
          "flex shrink-0 items-center justify-center gap-1.5 font-semibold",
          compact ? "size-7 rounded-[8px]" : "h-8 rounded-[10px] px-3 text-[12.5px]",
          canSend ? "bg-ov-accent text-ov-on-accent" : "bg-ov-field text-ov-text-3",
        )}
      >
        <ArrowUp className="size-4" />
        {!compact && t.send}
      </button>
    </div>
  );
}
