import { useCallback, useEffect, useState } from "react";
import { config, isMockApi } from "@/config";
import { useBackHandler } from "@/lib/backButton";
import { revokeSession, sendOtp, setUnauthorizedHandler, verifyOtp } from "@/services/api/api";
import { clearSession, loadSession, saveSession } from "@/services/api/session";
import type { Session } from "@/types";

export interface PendingOtp { phone: string; requestId: string; }
const toE164 = (national: string) => `${config.countryCode}${national}`;

/** Login (phone) -> OTP -> session. Screens stay presentational. */
export function useAuthFlow() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [lastPhone, setLastPhone] = useState("");

  const logout = useCallback(() => {
    if (!isMockApi && loadSession()) void revokeSession().catch(() => {});
    clearSession();
    setSession(null);
    setPending(null);
  }, []);

  const enterDemo = useCallback(() => {
    if (!isMockApi) return;
    const guest: Session = {
      token: "demo-guest",
      user: { id: "demo-guest" },
      demo: true,
    };
    saveSession(guest);
    setSession(guest);
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); return () => setUnauthorizedHandler(null); }, [logout]);
  useBackHandler(() => { setPending(null); return true; }, !session && !!pending);

  const requestOtp = useCallback(async (phone: string) => {
    const { requestId } = await sendOtp(toE164(phone));
    setLastPhone(phone); setPending({ phone, requestId });
  }, []);
  const resendOtp = useCallback(async () => {
    if (!pending) return; const { requestId } = await sendOtp(toE164(pending.phone));
    setPending({ ...pending, requestId });
  }, [pending]);
  const verify = useCallback(async (otp: string) => {
    if (!pending) return;
    const next = await verifyOtp({ phone: toE164(pending.phone), otp, requestId: pending.requestId });
    saveSession(next); setSession(next); setPending(null);
  }, [pending]);
  const backToLogin = useCallback(() => setPending(null), []);

  return { session, pending, lastPhone, logout, enterDemo, requestOtp, resendOtp, verify, backToLogin, toE164 };
}
