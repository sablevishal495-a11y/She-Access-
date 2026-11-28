import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import { LoginScreen, useAuthFlow } from "@/features/auth";
import { DashboardScreen } from "@/features/machines";
import { initBackButton } from "@/lib/backButton";
import { requestUserLocation } from "@/services/userLocation";

export default function App() {
  const auth = useAuthFlow();

  useEffect(() => {
    const removeBackButton = initBackButton();
    if (Capacitor.isNativePlatform()) {
      void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
    }
    // Ask for location right away, so the dashboard can show the nearest machines first.
    void requestUserLocation();
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

  if (auth.session) return <DashboardScreen key="dashboard" session={auth.session} onLogout={auth.logout} />;
  return <LoginScreen key="login" initialName={auth.lastName} onSubmit={auth.login} />;
}
