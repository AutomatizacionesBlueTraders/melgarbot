"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createDependencia(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) return;
  const slug = slugify(name);
  await pool.query(
    `INSERT INTO dependencias (slug, name, description) VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO NOTHING`,
    [slug, name, description],
  );
  revalidatePath("/dependencias");
}

export async function updateDependencia(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const active = formData.get("active") === "on";
  if (!id || !name) return;
  await pool.query(
    `UPDATE dependencias SET name = $2, description = $3, active = $4 WHERE id = $1`,
    [id, name, description, active],
  );
  revalidatePath("/dependencias");
  revalidatePath(`/dependencias/${id}`);
}

export async function deleteDependencia(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await pool.query(`DELETE FROM dependencias WHERE id = $1`, [id]);
  revalidatePath("/dependencias");
  redirect("/dependencias");
}

export async function deleteDocument(formData: FormData) {
  const id = Number(formData.get("doc_id"));
  const depId = Number(formData.get("dep_id"));
  if (!id) return;
  await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);
  revalidatePath(`/dependencias/${depId}`);
}
