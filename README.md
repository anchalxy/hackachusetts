# Tea Party

A civic app for Boston-area neighbors: weekly challenges built from real city meeting agendas, 311 reports you can track, and tea leaves you earn and trade for local deals.

## Try it on your phone with Expo Go

You need [Node.js](https://nodejs.org) (LTS) on your computer and the **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)). Expo Go must support SDK 58; update it from the app store if it says the project is incompatible.

1. Clone and install:

   ```bash
   git clone https://github.com/anchalxy/hackachusetts.git
   cd hackachusetts
   npm install
   ```

2. Start the dev server:

   ```bash
   npx expo start
   ```

3. Open it on your phone:
   - **iPhone:** scan the QR code in the terminal with the Camera app.
   - **Android:** open Expo Go and tap **Scan QR code**.

Your phone and computer need to be on the same Wi-Fi network. If the app won't connect (campus or public Wi-Fi often blocks this), run `npx expo start --tunnel` instead.

You don't need an `.env` file to run the app. Without one, it starts in demo mode with a built-in set of example challenges.

## Good to know

- Allow location and camera when asked. Reporting issues and checking in on challenges use them.
- Expo Go has limited notification support (no remote push on Android). The rest of the app works normally there.
- Live mode (`EXPO_PUBLIC_CHALLENGES_MODE=live` in `.env`) loads the latest generated week from `/api/challenges`. It's only needed if you're running the challenge pipeline.

## Developer commands

```bash
npx expo start          # dev server (press i / a for iOS simulator / Android emulator)
npx expo lint           # lint
npx tsc --noEmit        # typecheck
npm test                # property-based tests (Jest + fast-check)
npm run challenges:weekly   # fetch agendas → generate challenges → track updates → send digests
```

Routes live in `src/app/` ([Expo Router](https://docs.expo.dev/router/introduction)). The weekly challenge pipeline lives in `scripts/agendas/` and needs `ANTHROPIC_API_KEY` in `.env`.
