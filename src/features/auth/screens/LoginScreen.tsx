import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { config } from "@/config";
import { cn } from "@/utils/cn";
import { AuthShell } from "./AuthShell";

interface Props {
  initialName?: string;
  onSubmit: (name: string) => void;
}

export default function LoginScreen({ initialName = "", onSubmit }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2) {
      setError("Please enter your name.");
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <AuthShell>
      <div className="auth-enter">
        <h1 className="auth-brand">SHE<span>-</span>ACCESS</h1>
        <h2 className="auth-headline">
          Find care, <em>not a detour.</em>
        </h2>
        <p className="auth-description">
          Find sanitary napkin vending machines nearby. Check stock and price before you go.
        </p>
      </div>

      <div className="auth-form-enter mt-9 max-w-[430px] sm:mt-11">
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="name" className="mb-2.5 block text-sm font-semibold text-white">
            Your name
          </label>
          <div className={cn("auth-phone-field", error && "auth-phone-field--error")}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              placeholder="e.g. Priya"
              maxLength={config.nameMaxLength}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              onFocus={(event) => {
                // Wait for the keyboard to open, then bring the field and button into view.
                const form = event.currentTarget.form;
                setTimeout(() => form?.scrollIntoView({ behavior: "smooth", block: "end" }), 350);
              }}
              aria-invalid={!!error}
              aria-describedby="name-help"
              className="h-full min-w-0 flex-1 bg-transparent px-4 text-[17px] font-medium text-[#202944] outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          <p id="name-help" role={error ? "alert" : undefined} className={cn("mt-2 min-h-5 text-xs leading-relaxed", error ? "text-[#ffb8bd]" : "text-white/70")}>
            {error || "No phone number or password needed."}
          </p>
          <Button type="submit" className="mt-4 h-14 justify-between px-5">
            <span>Continue</span>
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
