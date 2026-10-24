# Tea Party

An iPhone app that gets young people in Greater Boston involved in local government a few minutes at a time: weekly challenges pulled from real city agendas, photo reports that follow Boston's real 311 system, and tea leaves that unlock deals at local spots.

Built for Hackachusetts (October 2026). The full write-up is in [PROJECT.md](PROJECT.md).

## Run it in 3 steps

You need [Node.js](https://nodejs.org) 20+ and a Mac with Xcode (for the iOS Simulator), or an iPhone.

```bash
# 1. Install
npm install

# 2. Add your Anthropic key (only needed for the AI photo check)
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# 3. Start
npx expo start
```

Then press `i` to open the iOS Simulator, or scan the QR code with your iPhone camera.

That's it. The app runs in demo mode by default with a seeded user and this week's real challenges, so there's no account to set up.

## Optional

```bash
npx expo run:ios            # native dev build, for the camera and maps on a real device
npm test                    # property-based tests (fast-check)
npm run challenges:weekly   # regenerate challenges from live agendas (needs ANTHROPIC_API_KEY)
```

Set `EXPO_PUBLIC_CHALLENGES_MODE=live` in `.env` to load the latest generated week instead of the demo week.

## Where things live

```
src/app/          screens (Expo Router: each file is a route)
src/components/   UI by feature: trail, report, rewards, challenge flows
src/lib/          app logic and tests
scripts/agendas/  weekly pipeline: scrape agendas → Claude → challenges
data/             generated challenges, digests, agenda cache, 311 snapshot
design/           design system, tokens, assets, mockups
docs/             original brief and the hand-written demo week
.kiro/            Kiro specs, hooks, and custom agents
```
