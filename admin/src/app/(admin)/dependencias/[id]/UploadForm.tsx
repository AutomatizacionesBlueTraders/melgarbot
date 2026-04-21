"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadForm({ depId }: { depId: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("dependencia_id", String(depId));
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) {
      setMsg({
        ok: true,
        text: `Procesado: ${data.chunks} chunks vectorizados`,
      });
      setFile(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setMsg({ ok: false, text: data.error || "Error al procesar" });
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm"
          required
        />
        <button
          type="submit"
          disabled={busy || !file}
          className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Procesando…" : "Subir y vectorizar"}
        </button>
      </div>
      {msg && (
        <p
          className={`text-sm ${
            msg.ok ? "text-green-700" : "text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
      <p className="text-xs text-gray-400">
        Formatos: PDF, DOCX, TXT, MD. Extrae texto, genera chunks y los
        vectoriza con Gemini (768d).
      </p>
    </form>
  );
}
