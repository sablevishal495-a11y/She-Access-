import { useCallback, useState } from "react";
import { clearSession, loadSession, saveSession } from "@/services/api/session";
import type { Session } from "@/types";

/** Name -> dashboard. The name is stored on this device only. */
export function useAuthFlow() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [lastName, setLastName] = useState("");

  const login = useCallback((name: string) => {
    const next: Session = { user: { id: `local-${Date.now()}`, name } };
    saveSession(next);
    setSession(next);
    setLastName(name);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return { session, lastName, login, logout };
}
