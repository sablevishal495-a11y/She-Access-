import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sheaccess.app",
  appName: "SHE-ACCESS",
  webDir: "dist",
  backgroundColor: "#ffffff",
  android: {
    // Keep the web view out of the status / navigation bars on Android 15+.
    adjustMarginsForEdgeToEdge: "auto",
    // HTTPS only: never load insecure content.
    allowMixedContent: false,
    // Turn off Chrome remote debugging of the web view in shipped builds.
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // The app hides the splash as soon as the UI is ready (see App.tsx);
      // this timeout is only a safety net.
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
    },
    StatusBar: {
      style: "LIGHT", // dark icons on a light background
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
  },
};

export default config;
