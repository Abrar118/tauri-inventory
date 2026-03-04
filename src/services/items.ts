import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Item } from "@/types";

const COLLECTION = "items";

export async function getItems(): Promise<Item[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Item);
}

export async function addItem(
  item: Omit<Item, "id" | "status" | "blr_count" | "ber_count" | "created_at" | "unservicable_count" | "lost_count"> & {
    unservicable_count?: number;
    lost_count?: number;
  },
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...item,
    unservicable_count: item.unservicable_count ?? 0,
    lost_count: item.lost_count ?? 0,
    blr_count: 0,
    ber_count: 0,
    status: "pending",
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
  data: Partial<Omit<Item, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function markItemCondition(
  id: string,
  mode: "blr" | "ber" | "unservicable" | "lost",
  count: number,
): Promise<
  Pick<Item, "quantity" | "blr_count" | "ber_count" | "unservicable_count" | "lost_count">
> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Invalid condition count");
  }

  const ref = doc(db, COLLECTION, id);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Item not found");
    }

    const data = snap.data() as Item;
    const currentQty = Number(data.quantity ?? 0);
    if (count > currentQty) {
      throw new Error("Condition count exceeds available quantity");
    }

    const next = {
      quantity: currentQty - count,
      blr_count:
        mode === "blr"
          ? Number(data.blr_count ?? 0) + count
          : Number(data.blr_count ?? 0),
      ber_count:
        mode === "ber"
          ? Number(data.ber_count ?? 0) + count
          : Number(data.ber_count ?? 0),
      unservicable_count:
        mode === "unservicable"
          ? Number(data.unservicable_count ?? 0) + count
          : Number(data.unservicable_count ?? 0),
      lost_count:
        mode === "lost"
          ? Number(data.lost_count ?? 0) + count
          : Number(data.lost_count ?? 0),
    };

    tx.update(ref, next);
    return next;
  });
}
