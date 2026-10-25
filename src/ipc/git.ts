import { call } from "./invoke";

export interface GitStatus {
  branch: string;
  changed: number;
}

/** Null outside a git repository or without git. */
export const gitStatus = (path: string) => call<GitStatus | null>("git_status", { path });
