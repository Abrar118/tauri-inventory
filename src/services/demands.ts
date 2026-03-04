import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Demand } from "@/types";

const COLLECTION = "demands";

export async function getDemands(): Promise<Demand[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Demand);
}

export async function addDemand(
  demand: Omit<Demand, "id" | "demanded_at" | "fulfilled" | "fulfilled_at">,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...demand,
    demanded_at: new Date().toISOString(),
    fulfilled: false,
    fulfilled_at: null,
  });
  return ref.id;
}

export async function updateDemand(
  id: string,
  data: Partial<Omit<Demand, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteDemand(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
