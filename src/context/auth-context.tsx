import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { updateLastSeen } from "@/services/employees";
import type { AuthUser } from "@/types";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

interface EmployeeProfile {
  name: string;
  rank: string;
  username: string;
  accountType: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: EmployeeProfile | null;
  accountType: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = () => {
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startHeartbeat = (employeeId: string) => {
    stopHeartbeat();
    // Fire immediately, then on every interval
    updateLastSeen(employeeId).catch(() => {});
    heartbeatRef.current = setInterval(() => {
      updateLastSeen(employeeId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
        try {
          const snap = await getDocs(
            query(
              collection(db, "employees"),
              where("email", "==", firebaseUser.email)
            )
          );
          if (!snap.empty) {
            const docId = snap.docs[0].id;
            const data = snap.docs[0].data() as {
              name?: string;
              rank?: string;
              username?: string;
              account_type?: string;
            };
            setProfile({
              name: data.name ?? "",
              rank: data.rank ?? "",
              username: data.username ?? "",
              accountType: data.account_type ?? "",
            });
            startHeartbeat(docId);
          } else {
            setProfile(null);
          }
        } catch {
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        stopHeartbeat();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      stopHeartbeat();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, accountType: profile?.accountType ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
