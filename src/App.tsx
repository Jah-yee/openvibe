import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ping } from "@/ipc/app";

export default function App() {
  const check = async () => {
    try {
      toast.success(`Rust a répondu : ${await ping()}`);
    } catch (error) {
      toast.error(String(error));
    }
  };
  return (
    <div className="grid h-screen place-items-center">
      <Button onClick={check}>Tester l'IPC</Button>
      <Toaster theme="dark" />
    </div>
  );
}
