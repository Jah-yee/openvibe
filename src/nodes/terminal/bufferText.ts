/** The part of an xterm buffer text extraction reads (lets tests use a fake). */
export interface TextBuffer {
  readonly length: number;
  getLine(y: number): { translateToString(trimRight?: boolean): string } | undefined;
}

/** The last `lines` lines of a buffer as plain text, without the empty rows under the output. */
export function bufferText(buffer: TextBuffer, lines: number): string {
  if (lines <= 0) return "";
  const rows: string[] = [];
  for (let y = 0; y < buffer.length; y++) rows.push(buffer.getLine(y)?.translateToString(true) ?? "");
  while (rows.length > 0 && !rows[rows.length - 1].trim()) rows.pop();
  return rows.slice(-lines).join("\n");
}
