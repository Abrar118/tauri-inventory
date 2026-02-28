import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Entry } from "@/types";

const COLLECTION = "entries";

export async function getEntries(): Promise<Entry[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Entry);
}

export async function addEntry(entry: Omit<Entry, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...entry,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEntry(
  id: string,
  data: Partial<Omit<Entry, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}
