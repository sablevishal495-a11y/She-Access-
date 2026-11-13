import { isMockApi } from "@/config";
import type { Session } from "@/types";

const KEY = "she-access.session.v2";

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      parsed &&
      typeof parsed.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed.user?.id === "string" &&
      (parsed.demo ? isMockApi : typeof parsed.user.phone === "string" && parsed.user.phone.length > 0) &&
      (!isMockApi || parsed.token.startsWith("demo-"))
    ) {
      return parsed as Session;
    }
  } catch {
    /* corrupted storage: treat as logged out */
  }
  return null;
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable: session lasts until the app closes */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("she-access.session.v1");
  } catch {
    /* ignore */
  }
}
