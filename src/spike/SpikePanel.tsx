import { useEffect, useState } from "react";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Button } from "@/components/ui/button";
import { createNodeElement, nodeKindOf } from "@/canvas/nodeElement";
import { diagnostics, log, useDiagnostics } from "./diagnostics";
import { installDropInterceptor, SNIPPET_MIME } from "./dropInterceptor";
import { getSpikeTerminal, short, spikeEntries } from "./registry";

// Throwaway (milestone 2 prototype): tools to check the go/no-go criteria of
// spec §15 by hand. Deleted once the decision is recorded.
export function SpikePanel({ api, container }: { api: ExcalidrawImperativeAPI; container: HTMLElement }) {
  const lines = useDiagnostics((s) => s.lines);
  const blockKeys = useDiagnostics((s) => s.blockKeyPropagation);
  const fps = useFps();

  useEffect(
    () =>
      installDropInterceptor(
        container,
        api,
        (nodeId, text) => {
          getSpikeTerminal(nodeId).term.paste(text);
          log(`[${short(nodeId)}] snippet collé ✔ (aucune Entrée envoyée)`);
        },
        () => log("dépôt hors d'un terminal : ignoré"),
      ),
    [api, container],
  );

  // A tool change while typing in a terminal means an Excalidraw shortcut leaked.
  useEffect(() => {
    let tool = api.getAppState().activeTool.type;
    return api.onChange((_elements, appState) => {
      if (appState.activeTool.type !== tool) {
        tool = appState.activeTool.type;
        log(`outil Excalidraw → ${tool}`);
      }
    });
  }, [api]);

  const addTerminals = (count: number) => {
    const { scrollX, scrollY, zoom, width, height } = api.getAppState();
    const origin = { x: width / 2 / zoom.value - scrollX, y: height / 2 / zoom.value - scrollY };
    const added = Array.from({ length: count }, (_, i) =>
      createNodeElement("terminal", { x: origin.x + (i % 5) * 760, y: origin.y + Math.floor(i / 5) * 480 }),
    );
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...added],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  };

  const flood = () => {
    const until = performance.now() + 5000;
    const tick = () => {
      for (const { term } of spikeEntries().values()) {
        for (let i = 0; i < 20; i++) term.write(`\x1b[3${i % 7}m${"█".repeat(60)} ${i}\x1b[0m\r\n`);
      }
      if (performance.now() < until) requestAnimationFrame(tick);
      else log("flood terminé");
    };
    requestAnimationFrame(tick);
  };

  const listBindings = () => {
    const elements = api.getSceneElements();
    const byId = new Map(elements.map((e) => [e.id, e]));
    const arrows = elements.filter((e) => e.type === "arrow");
    if (arrows.length === 0) log("aucune flèche");
    for (const arrow of arrows) {
      if (arrow.type !== "arrow") continue;
      const describe = (id: string | undefined) => {
        const target = id ? byId.get(id) : undefined;
        return target ? `${nodeKindOf(target) ?? target.type}:${short(target.id)}` : "libre";
      };
      log(`flèche ${short(arrow.id)} : ${describe(arrow.startBinding?.elementId)} → ${describe(arrow.endBinding?.elementId)}`);
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-16 left-3 z-10 w-80 rounded-md border bg-card/95 p-2 text-xs shadow-lg">
      <div className="mb-2 flex items-center justify-between font-semibold">
        <span>Prototype jalon 2</span>
        <span className={fps < 40 ? "text-destructive" : "text-green-400"}>{fps} img/s</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        <Button size="sm" variant="outline" onClick={() => addTerminals(10)}>+10 terminaux</Button>
        <Button size="sm" variant="outline" onClick={flood}>Flood 5 s</Button>
        <Button size="sm" variant="outline" onClick={listBindings}>Liaisons</Button>
        <Button
          size="sm"
          variant={blockKeys ? "default" : "outline"}
          onClick={() => diagnostics.getState().setBlockKeyPropagation(!blockKeys)}
        >
          Bloquer touches : {blockKeys ? "oui" : "non"}
        </Button>
      </div>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData(SNIPPET_MIME, "echo depuis le glisser-déposer")}
        className="mb-2 cursor-grab rounded border border-dashed p-1 text-center"
      >
        ⇢ Glisse-moi sur un terminal
      </div>
      <ol className="max-h-48 overflow-auto font-mono">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}

function useFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let handle = requestAnimationFrame(function frame(now) {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      handle = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(handle);
  }, []);
  return fps;
}
