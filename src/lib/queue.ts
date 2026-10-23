/**
 * Runs async tasks one after the other, in call order. Tauri runs async commands
 * concurrently, so writes that must reach Rust in order go through a queue. A
 * failed task rejects its own promise but does not stop the queue.
 */
export function createQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task);
    tail = run.catch(() => undefined);
    return run;
  };
}
