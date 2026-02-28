import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { auth, db } from "./firebase";

export const ACCOUNT_TYPES = [
  "ADMIN",
  "OC",
  "SMT_JCO",
  "SMT_1",
  "SMT_2",
  "WORKSHOP_OFFICER",
  "RI&I_1",
  "RI&I_2",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<void> {
  const snap = await getDocs(
    query(collection(db, "employees"), where("username", "==", username)),
  );
  if (snap.empty) {
    const err = new Error("No account found with this username");
    (err as unknown as { code: string }).code = "auth/user-not-found";
    throw err;
  }
  const email = (snap.docs[0].data() as { email: string }).email;
  await signInWithEmailAndPassword(auth, email, password);
}

export const signOut = () => firebaseSignOut(auth);

// Creates a Firebase Auth account without affecting the currently signed-in user.
// Firebase's createUserWithEmailAndPassword always signs in the new user on the
// primary auth instance, so we use a temporary secondary app and delete it after.
export async function createUser(email: string, password: string) {
  const secondaryApp = initializeApp(
    {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    },
    `secondary-${Date.now()}`,
  );
  const secondaryAuth = getAuth(secondaryApp);
  try {
    return await createUserWithEmailAndPassword(secondaryAuth, email, password);
  } finally {
    await firebaseSignOut(secondaryAuth);
    await deleteApp(secondaryApp);
  }
}
