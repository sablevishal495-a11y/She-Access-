import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import { LoginScreen, OtpScreen, useAuthFlow } from "@/features/auth";
import { DashboardScreen } from "@/features/machines";
import { initBackButton } from "@/lib/backButton";

export default function App() {
  const auth = useAuthFlow();

  useEffect(() => {
    const removeBackButton = initBackButton();
    if (Capacitor.isNativePlatform()) {
      void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
    }
    return removeBackButton;
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const signedIn = !!auth.session;
    void (async () => {
      await StatusBar.setStyle({ style: signedIn ? Style.Light : Style.Dark });
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: signedIn ? "#ffffff" : "#151b33" });
      }
    })().catch(() => {});
  }, [auth.session]);

  let screen: React.ReactNode;
  if (auth.session) screen = <DashboardScreen key="dashboard" session={auth.session} onLogout={auth.logout} />;
  else if (auth.pending) screen = <OtpScreen key="otp" phone={auth.toE164(auth.pending.phone)} onVerify={auth.verify} onResend={auth.resendOtp} onBack={auth.backToLogin} />;
  else screen = <LoginScreen key="login" initialPhone={auth.lastPhone} onSubmit={auth.requestOtp} onExplore={auth.enterDemo} />;

  return screen;
}
