import type { Session } from "@/types";

const KEY = "she-access.session.v3";
const OLD_KEYS = ["she-access.session.v1", "she-access.session.v2"];

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      parsed &&
      typeof parsed.user?.id === "string" &&
      typeof parsed.user.name === "string" &&
      parsed.user.name.trim().length > 0
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
    OLD_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
