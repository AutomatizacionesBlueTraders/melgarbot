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
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const data = await pdfParse(buf);
  return data.text;
}
