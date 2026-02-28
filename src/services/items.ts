import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Item } from "@/types";

const COLLECTION = "items";

export async function getItems(): Promise<Item[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
}

export async function addItem(item: Omit<Item, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...item,
    status: "pending",
    blr: false,
    ber: false,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function approveItem(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "active" });
}

export async function rejectItem(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "rejected" });
}

export async function updateItem(
  id: string,
  data: Partial<Omit<Item, "id">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
