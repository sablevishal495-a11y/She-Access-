import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { config, isDemoMode, isMockApi } from "@/config";
import { toUserMessage } from "@/services/api/api";
import { cn } from "@/utils/cn";
import { AuthShell } from "./AuthShell";

interface Props {
  initialPhone?: string;
  onSubmit: (phone: string) => Promise<void>;
  onExplore: () => void;
}

const PHONE_PATTERN = /^[6-9]\d{9}$/;

export default function LoginScreen({ initialPhone = "", onSubmit, onExplore }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!PHONE_PATTERN.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onSubmit(phone);
    } catch (err) {
      setError(toUserMessage(err, "We couldn't send the code. Please try again."));
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-enter">
        <h1 className="auth-brand">SHE<span>-</span>ACCESS</h1>
        <h2 className="auth-headline">
          Find care, <em>not a detour.</em>
        </h2>
        <p className="auth-description">
          Find sanitary pad vending machines nearby. Check stock and price before you go.
        </p>
      </div>

      <div className="auth-form-enter mt-9 max-w-[430px] sm:mt-11">
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="phone" className="mb-2.5 block text-sm font-semibold text-white">
            Your mobile number
          </label>
          <div className={cn("auth-phone-field", error && "auth-phone-field--error")}>
            <span className="auth-phone-prefix">{config.countryCode}</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              maxLength={config.phoneLength}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, "").slice(0, config.phoneLength));
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby="phone-help"
              className="h-full min-w-0 flex-1 bg-transparent px-4 text-[17px] font-medium tracking-[0.04em] text-[#202944] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
            />
          </div>
          <p id="phone-help" role={error ? "alert" : undefined} className={cn("mt-2 min-h-5 text-xs leading-relaxed", error ? "text-[#ffb8bd]" : "text-white/70")}>
            {error || (isDemoMode ? "Use any valid number to try the demo. No SMS is sent." : "We will send a one-time code. No password needed.")}
          </p>
          <Button type="submit" loading={busy} className="mt-4 h-14 justify-between px-5">
            <span>{busy ? "Sending code" : "Send verification code"}</span>
            {!busy && <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />}
          </Button>
        </form>

        {isMockApi && (
          <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/50 underline-offset-4 transition hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore the demo <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-white/60">Sample locations and stock only</span>
          </div>
        )}
      </div>
    </AuthShell>
  );
}