import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  runTransaction,
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

export async function markLoadCondition(
  id: string,
  mode: "blr" | "ber",
  count: number,
): Promise<Pick<Load, "quantity" | "blr_count" | "ber_count">> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Invalid condition count");
  }

  const ref = doc(db, COLLECTION, id);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Load not found");
    }

    const data = snap.data() as Load;
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
    };

    tx.update(ref, next);
    return next;
  });
}
