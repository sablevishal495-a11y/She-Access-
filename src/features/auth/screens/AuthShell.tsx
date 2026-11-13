import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/shared/Logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__photo" aria-hidden="true" />
      <div className="auth-shell__shade" aria-hidden="true" />
      <div className="auth-shell__inner">
        <header className="auth-shell__header">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <Wordmark className="text-white" />
          </div>
        </header>
        <div className="auth-shell__body">
          <div className="w-full max-w-[550px]">{children}</div>
        </div>
      </div>
    </main>
  );
}