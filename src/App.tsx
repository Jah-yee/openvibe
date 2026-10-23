import { Toaster } from "@/components/ui/sonner";
import { Canvas } from "@/canvas/Canvas";

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main className="min-w-0 flex-1">
        <Canvas />
      </main>
      <Toaster theme="dark" />
    </div>
  );
}
