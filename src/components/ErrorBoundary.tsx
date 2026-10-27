import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Names the part of the interface in the log line. */
  scope: string;
  fallback: (error: Error, retry: () => void) => ReactNode;
  children: ReactNode;
}

/**
 * Keeps a render error to the part of the interface it happened in, instead of
 * blanking the whole window (spec première version §3.4). The error goes to the
 * log through `console.error`.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(`[ui] ${this.props.scope}`, error, info.componentStack ?? "");
  }

  retry = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.retry) : this.props.children;
  }
}
