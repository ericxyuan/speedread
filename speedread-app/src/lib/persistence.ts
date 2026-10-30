import { openDB } from "idb";
import type { ReadingDocument } from "../types";
let databasePromise: ReturnType<typeof openDB> | undefined;
const database = () =>
  (databasePromise ??= openDB("speedread", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("documents"))
        db.createObjectStore("documents", { keyPath: "id" });
      if (!db.objectStoreNames.contains("positions"))
        db.createObjectStore("positions");
    },
  }));
export async function allDocuments(): Promise<ReadingDocument[]> {
  const db = await database();
  const docs: ReadingDocument[] = await db.getAll("documents");
  return (
    await Promise.all(
      docs.map(async (d) => ({
        ...d,
        position: (await db.get("positions", d.id)) ?? d.position,
      })),
    )
  ).sort((a, b) => b.opened - a.opened);
}
export async function saveProgress(id: string, position: number) {
  const db = await database();
  await db.put("positions", position, id);
}
export async function saveDocument(doc: ReadingDocument) {
  const db = await database();
  await db.put("documents", doc);
}
export async function deleteDocument(id: string) {
  const db = await database();
  await db.delete("documents", id);
  await db.delete("positions", id);
}
export async function clearDocuments() {
  const db = await database();
  await db.clear("documents");
  await db.clear("positions");
}
