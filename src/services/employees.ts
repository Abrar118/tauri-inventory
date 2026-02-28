import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Employee } from "@/types";

const COLLECTION = "employees";

export async function getEmployees(): Promise<Employee[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Employee);
}

export async function addEmployee(
  employee: Omit<Employee, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), employee);
  return ref.id;
}

export async function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteEmployee(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateLastSeen(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    last_seen: new Date().toISOString(),
  });
}
