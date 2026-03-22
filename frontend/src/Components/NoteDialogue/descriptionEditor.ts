export type EditorSelectionResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function getLineBoundaries(value: string, start: number, end: number): { lineStart: number; lineEnd: number } {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const lineStart = value.lastIndexOf("\n", safeStart - 1) + 1;
  const lineEndCandidate = value.indexOf("\n", safeEnd);

  return {
    lineStart,
    lineEnd: lineEndCandidate === -1 ? value.length : lineEndCandidate,
  };
}

export function applyLinePrefix(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): EditorSelectionResult {
  const { lineStart, lineEnd } = getLineBoundaries(value, selectionStart, selectionEnd);
  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split("\n");
  const nextBlock = lines.map((line) => (line.trim() ? `${prefix}${line}` : line)).join("\n");
  const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;

  return {
    value: nextValue,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length,
  };
}
