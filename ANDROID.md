# SHE-ACCESS – Android app

The Android project lives in `android/` (Capacitor 7). The web app is unchanged.

## Build the APK (Android Studio)
1. `npm install`
2. `npm run build`
3. `npx cap sync android`
4. `npx cap open android` -> Build > Build APK(s)

## Build from the command line
Needs JDK 21 and the Android SDK:
`cd android && ./gradlew assembleDebug`
APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Build in the cloud (no setup)
Push this project to GitHub, then open Actions > "Build Android APK" > Run workflow.
Download the APK from the run's Artifacts.

After any web code change: `npm run build && npx cap sync android`.
