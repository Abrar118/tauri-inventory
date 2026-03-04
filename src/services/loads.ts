import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Load } from "@/types";

const COLLECTION = "loads";

export async function getLoads(): Promise<Load[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Load);
}

export async function addLoad(
  load: Omit<Load, "id" | "status" | "blr_count" | "ber_count"> & { quantity?: number },
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...load,
    quantity: load.quantity ?? 1,
    blr_count: 0,
    ber_count: 0,
    status: "pending",
  });
  return ref.id;
}

export async function approveLoad(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "active" });
}

export async function rejectLoad(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "rejected" });
}

export async function deleteLoad(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateLoad(
  id: string,
  data: Partial<Omit<Load, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}
