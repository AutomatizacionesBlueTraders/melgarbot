import mammoth from "mammoth";

export async function extractText(
  buf: Buffer,
  filename: string,
  mimeType?: string,
): Promise<string> {
  const name = filename.toLowerCase();
  const mt = (mimeType || "").toLowerCase();

  if (name.endsWith(".pdf") || mt === "application/pdf") {
    return await extractPdf(buf);
  }
  if (
    name.endsWith(".docx") ||
    mt ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const r = await mammoth.extractRawText({ buffer: buf });
    return r.value;
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || mt.startsWith("text/")) {
    return buf.toString("utf8");
  }
  throw new Error(
    `Formato no soportado: ${filename}. Permitidos: PDF, DOCX, TXT, MD.`,
  );
}

async function extractPdf(buf: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    if (text.trim()) parts.push(text);
  }
  await doc.destroy();
  return parts.join("\n\n");
}
