import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Repair } from "@/types";

const COLLECTION = "repairs";

export async function getRepairs(): Promise<Repair[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Repair);
}

export async function addRepair(repair: Omit<Repair, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), repair);
  return ref.id;
}

export async function updateRepair(
  id: string,
  data: Partial<Omit<Repair, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}
