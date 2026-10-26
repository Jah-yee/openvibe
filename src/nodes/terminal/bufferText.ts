/** The part of an xterm buffer text extraction reads (lets tests use a fake). */
export interface TextBuffer {
  readonly length: number;
  getLine(y: number): { translateToString(trimRight?: boolean): string } | undefined;
}

/**
 * The last `lines` lines of a buffer as plain text, without the empty rows
 * under the output; `from`: the first row to read (a relaunched session's own).
 */
export function bufferText(buffer: TextBuffer, lines: number, from = 0): string {
  if (lines <= 0) return "";
  const rows: string[] = [];
  for (let y = Math.max(0, from); y < buffer.length; y++) rows.push(buffer.getLine(y)?.translateToString(true) ?? "");
  while (rows.length > 0 && !rows[rows.length - 1].trim()) rows.pop();
  return rows.slice(-lines).join("\n");
}
