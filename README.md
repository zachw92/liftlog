# LiftLog

Personal lifting tracker. Offline PWA on a phone. One user, no accounts, no server.

See `LiftLog POC Spec.md` for the full specification. This README covers how to
run and deploy the app.

## Status

Milestone 1 in progress (project bootstrap + engines).

## Local development

```bash
npm install
npm run dev        # Vite dev server
npm test           # Vitest, blocks deploy on failure
npm run build      # Type-check + production build into dist/
npm run preview    # Serve the built app
```

Node 20+ required.

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs the test
suite, builds the app, and publishes `dist/` to GitHub Pages. A failing test
blocks the deploy.

One-time setup (already done for this repo):
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. Watch Actions for a green check.
3. Open `https://zachw92.github.io/liftlog/` in Chrome on Android.
4. **⋮ → Install app** → allow persistent storage.

When the app updates, you'll see an "Update ready — reload" banner — it will
never reload mid-set.

## Project layout

```
src/
  engine/        pure rule functions, no React or Dexie (TDD)
  data/          Dexie schema, seed, repo, backup
  screens/       Setup, Home, Session, History, Settings
  components/    SetRow, ExerciseCard, FeelButtons, Stepper, Banner
  App.tsx  main.tsx
```

Engines are the source of truth. Screens only display what engines decide.

## Privacy

GitHub Pages on the free plan requires a public repo, so the **code** is
public. Your **lifting data** is stored only in IndexedDB on your phone and
never touches the repo. Backup exports save to local files you control.
