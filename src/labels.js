/** Split labels into complete lines, including long words without spaces. */
export function wrapLabel(text, maxLength = 22) {
  if (!Number.isInteger(maxLength) || maxLength < 1) throw new Error('maxLength must be positive.');
  const lines = [];
  let current = '';
  for (const word of text.trim().split(/\s+/u)) {
    if (!word) continue;
    const chunks = Array.from(word);
    while (chunks.length) {
      if (current && current.length + 1 + chunks.length <= maxLength) {
        current += ' ' + chunks.splice(0).join('');
      } else if (current) {
        lines.push(current);
        current = '';
      } else {
        current = chunks.splice(0, maxLength).join('');
        if (chunks.length) {
          lines.push(current);
          current = '';
        }
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}
