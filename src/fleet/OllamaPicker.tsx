import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { listOllamaModels, type OllamaLaunch, type OllamaMode } from "@/ipc/pty";
import { cn } from "@/lib/utils";

type Models = { models: string[] } | { error: string } | null;

/** Model and mode of an Ollama agent (spec habillage §8.1). */
export function OllamaPicker(props: { aiderAvailable: boolean; onBack: () => void; onPick: (ollama: OllamaLaunch) => void }) {
  const { aiderAvailable, onBack, onPick } = props;
  const [models, setModels] = useState<Models>(null);
  const [mode, setMode] = useState<OllamaMode>(aiderAvailable ? "code" : "chat");

  useEffect(() => {
    listOllamaModels().then(
      (list) => setModels({ models: list }),
      (error: unknown) => setModels({ error: String(error) }),
    );
  }, []);

  const modeButton = (value: OllamaMode, label: string, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? "aider introuvable dans le PATH" : undefined}
      onClick={() => setMode(value)}
      className={cn(
        "flex-1 rounded-lg border border-transparent bg-ov-card py-1.5 text-xs disabled:opacity-40",
        mode === value && "border-ov-accent bg-ov-accent-soft",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="grid gap-3 p-1">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs text-ov-text-2 hover:text-ov-text">
        <ArrowLeft className="size-3.5" /> Ollama
      </button>
      <div className="flex gap-1.5">
        {modeButton("code", "Agent de code", !aiderAvailable)}
        {modeButton("chat", "Discussion")}
      </div>
      <div className="grid max-h-56 gap-0.5 overflow-auto">
        {models === null && <p className="px-2 py-1 text-xs text-ov-text-2">Lecture des modèles…</p>}
        {models && "error" in models && <p className="px-2 py-1 text-xs text-ov-danger">Ollama ne répond pas : {models.error}</p>}
        {models && "models" in models && models.models.length === 0 && (
          <p className="px-2 py-1 text-xs text-ov-text-2">
            Aucun modèle — lance <span className="font-mono">ollama pull &lt;modèle&gt;</span>
          </p>
        )}
        {models &&
          "models" in models &&
          models.models.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => onPick({ model, mode })}
              className="rounded-lg px-2 py-1.5 text-left font-mono text-xs text-ov-text hover:bg-ov-hover"
            >
              {model}
            </button>
          ))}
      </div>
    </div>
  );
}
