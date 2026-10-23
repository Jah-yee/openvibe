import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <div className="grid h-screen place-items-center">
      <Button>OpenVibe</Button>
      <Toaster theme="dark" />
    </div>
  );
}
