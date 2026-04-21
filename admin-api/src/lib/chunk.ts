const CHUNK_SIZE = 900;
const OVERLAP = 200;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if (buf.length + p.length + 2 <= CHUNK_SIZE) {
      buf = buf ? `${buf}\n\n${p}` : p;
      continue;
    }
    if (buf) {
      chunks.push(buf);
      const tail = buf.slice(-OVERLAP);
      buf = tail + "\n\n" + p;
    } else {
      buf = p;
    }

    while (buf.length > CHUNK_SIZE) {
      const slice = buf.slice(0, CHUNK_SIZE);
      const cutAt = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("\n"),
      );
      const end = cutAt > CHUNK_SIZE * 0.6 ? cutAt + 1 : CHUNK_SIZE;
      chunks.push(buf.slice(0, end).trim());
      buf = buf.slice(Math.max(0, end - OVERLAP));
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter((c) => c.length > 30);
}
