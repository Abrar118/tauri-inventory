import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Asset } from "@/types";

const COLLECTION = "catalog";

export async function getAssets(): Promise<Asset[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Asset));
}

export async function addAsset(asset: Omit<Asset, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...asset,
    status: "pending",
  });
  return ref.id;
}

export async function approveAsset(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "active" });
}

export async function rejectAsset(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "rejected" });
}

export async function deleteAsset(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateAsset(
  id: string,
  data: Partial<Omit<Asset, "id">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}
