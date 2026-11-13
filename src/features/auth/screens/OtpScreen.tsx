import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { DEMO_OTP, config, isDemoMode } from "@/config";
import { formatPhone } from "@/lib/stock";
import { toUserMessage } from "@/services/api/api";
import { cn } from "@/utils/cn";
import { AuthShell } from "./AuthShell";

interface Props {
  phone: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}

const LENGTH = config.otpLength;
const emptyDigits = () => Array<string>(LENGTH).fill("");

export default function OtpScreen({ phone, onVerify, onResend, onBack }: Props) {
  const [digits, setDigits] = useState<string[]>(emptyDigits);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState<number>(config.otpResendSeconds);
  const [shake, setShake] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submitting = useRef(false);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  async function submit(code: string) {
    if (code.length !== LENGTH || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await onVerify(code);
    } catch (err) {
      setError(toUserMessage(err, "We couldn't verify the code. Please try again."));
      setDigits(emptyDigits());
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      inputs.current[0]?.focus();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function applyDigits(next: string[], focusIndex: number) {
    setDigits(next);
    setError("");
    setInfo("");
    inputs.current[Math.min(focusIndex, LENGTH - 1)]?.focus();
    if (next.every(Boolean)) void submit(next.join(""));
  }

  function fillFrom(start: number, raw: string, base: string[]) {
    const chars = raw.replace(/\D/g, "").split("");
    if (chars.length === 0) return;
    const next = [...base];
    let position = start;
    for (const char of chars) {
      if (position >= LENGTH) break;
      next[position++] = char;
    }
    applyDigits(next, position);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      const target = next[index] ? index : Math.max(0, index - 1);
      next[target] = "";
      setDigits(next);
      setError("");
      inputs.current[target]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    if (!busy) fillFrom(0, event.clipboardData.getData("text"), emptyDigits());
  }

  async function handleResend() {
    if (seconds > 0 || resending || busy) return;
    setResending(true);
    setError("");
    try {
      await onResend();
      setSeconds(config.otpResendSeconds);
      setDigits(emptyDigits());
      setInfo("A fresh code is ready.");
      inputs.current[0]?.focus();
    } catch (err) {
      setError(toUserMessage(err, "We couldn't resend the code. Please try again."));
    } finally {
      setResending(false);
    }
  }

  const code = digits.join("");
  const remaining = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <AuthShell>
      <div className="auth-enter">
        <button type="button" onClick={onBack} className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
        </button>
        <h1 className="auth-headline auth-headline--otp">
          A quick check, <em>then you're on your way.</em>
        </h1>
        <p className="auth-description mt-4">
          Enter the {LENGTH}-digit code for <span className="font-semibold text-white">{formatPhone(phone)}</span>.
        </p>
      </div>

      <form
        className="auth-form-enter mt-9 max-w-[430px]"
        onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(code); }}
      >
        <div className={cn("grid grid-cols-6 gap-2 sm:gap-3", shake && "animate-shake")} role="group" aria-label="Verification code">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputs.current[index] = element; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={LENGTH}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${index + 1} of ${LENGTH}`}
              aria-invalid={!!error}
              value={digit}
              readOnly={busy}
              onChange={(event) => {
                if (busy) return;
                const value = event.target.value;
                if (!/\d/.test(value)) {
                  const next = [...digits];
                  next[index] = "";
                  setDigits(next);
                  return;
                }
                fillFrom(index, value, digits);
              }}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              onFocus={(event) => event.target.select()}
              className={cn("auth-otp-digit", error && "auth-otp-digit--error")}
            />
          ))}
        </div>
        <p role={error ? "alert" : "status"} aria-live="polite" className={cn("mt-3 min-h-5 text-sm", error ? "text-[#ffb8bd]" : "text-white/80")}>
          {error || info}
        </p>

        {isDemoMode && (
          <p className="mt-1 text-sm text-white/75">
            Demo code: <strong className="font-mono text-base tracking-[0.16em] text-white">{DEMO_OTP}</strong> <span className="text-white/55">(no SMS sent)</span>
          </p>
        )}

        <Button type="submit" loading={busy} disabled={code.length !== LENGTH} className="mt-6 h-14 justify-between px-5">
          <span>{busy ? "Verifying" : "Verify and continue"}</span>
          {!busy && <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />}
        </Button>

        <div className="mt-6 text-sm text-white/75">
          {seconds > 0 ? (
            <p>Need a new code? Resend in <span className="font-semibold tabular-nums text-white">{remaining}</span></p>
          ) : (
            <button type="button" onClick={() => void handleResend()} disabled={resending} className="font-semibold text-white underline underline-offset-4 transition hover:text-brand-200 disabled:opacity-50">
              {resending ? "Sending a new code" : "Resend code"}
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}