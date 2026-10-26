import { arrive } from "@/canvas/arrive";

/** Text put at the cursor of a field as if typed: React's change handler sees it (a plain `value =` would not). */
export function insertIntoField(field: HTMLTextAreaElement, text: string) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setValue?.call(field, field.value.slice(0, start) + text + field.value.slice(end));
  field.setSelectionRange(start + text.length, start + text.length);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

/** How many frames the field is waited for: the arrival offers it the keyboard as long (canvas/arrive.ts). */
const FRAMES = 10;

/** « Coller » of an orchestrator's radial menu: the arrival gives its field the keyboard, then the text goes in. */
export async function pasteIntoOrchestrator(nodeId: string, text: string) {
  arrive(nodeId);
  for (let frame = 0; frame < FRAMES; frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const field = document.querySelector<HTMLTextAreaElement>(`[data-orchestrator="${nodeId}"] textarea`);
    if (field && document.activeElement === field) {
      insertIntoField(field, text);
      return;
    }
  }
}
