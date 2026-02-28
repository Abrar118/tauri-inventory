import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Vehicle } from "@/types";

const COLLECTION = "vehicles";

export async function getVehicles(): Promise<Vehicle[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
}

export async function addVehicle(
  vehicle: Omit<Vehicle, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...vehicle,
    status: "pending",
  });
  return ref.id;
}

export async function approveVehicle(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "active" });
}

export async function rejectVehicle(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "rejected" });
}

export async function deleteVehicle(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateVehicle(
  id: string,
  data: Partial<Omit<Vehicle, "id">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}
