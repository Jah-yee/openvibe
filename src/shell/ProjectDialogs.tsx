import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CloseAgentDialog } from "./CloseAgentDialog";
import { CloseGroupDialog } from "./CloseGroupDialog";

/** The project's confirmation dialogs: one that fails to render shows nothing, the project stays (spec première version §3.4). */
export function ProjectDialogs() {
  return (
    <>
      <ErrorBoundary scope="close agent dialog" fallback={() => null}>
        <CloseAgentDialog />
      </ErrorBoundary>
      <ErrorBoundary scope="close group dialog" fallback={() => null}>
        <CloseGroupDialog />
      </ErrorBoundary>
    </>
  );
}
