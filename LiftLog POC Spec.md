# LiftLog POC Spec

Nov 6, 2026 · @Zachary

## Overview

LiftLog is a personal lifting tracker for one Android phone. It works offline. It opens today's planned session with last performance filled in, progresses every exercise by fixed rules, and plans around injury guard rails. There is one user, with no accounts and no server. The app is called LiftLog; the name is easy to change later.

**Success criteria for the POC**

- One full 4-week 5/3/1 cycle is logged in the app instead of in chat notes.
- A planned set that goes as planned takes one tap to log. A normal session needs no typing.
- Every progression decision matches the Rules section, and unit tests prove it.
- Data survives app updates, and a backup export followed by an import restores everything.

**Design principles**

- Low friction: large tap targets that work one-handed with sweaty fingers, dark theme, pounds (lb) only.
- Last known performance for every exercise is always kept and shown.
- The app never changes the plan without asking. Training max changes and new guard rails are suggestions the user confirms.
- The rules are plain functions with tests. The screens only display what the rules decide.
- LiftLog does not diagnose. Pain logging changes training and can point the user to a professional. It never prescribes treatment.

**How to use this spec with Claude Code**

1. Export this doc as Markdown and add it to the project as `SPEC.md`.
2. Tell Claude Code: "Read SPEC.md. Write an implementation plan for Milestone 1 only, then build it with tests. If the code and the Rules section disagree, ask me before changing either."
3. Build one milestone at a time. Use each one at the gym before starting the next.

## Getting it on your phone

The app is an installable web app (a PWA) hosted free on GitHub Pages. Nothing has to be installed on a computer. Claude Code writes the code, GitHub hosts it, and Chrome on Android installs it like a normal app.

1. **Make a GitHub account** at github.com. The free plan is enough.
2. **Create an empty project.** On GitHub, tap **+** → **New repository**. Name it `liftlog`, set it to **Public**, tick **Add a README**, and tap **Create repository**.
3. **Open Claude Code**, either on the web at claude.ai/code or in the Claude desktop app. Connect your GitHub account when it asks, then choose the `liftlog` repository.
4. **Give it the spec.** Export this doc as Markdown, attach it, and send the prompt from the Overview.
5. **Ask for deployment:** "Set up deployment to GitHub Pages with a GitHub Actions workflow. Tell me exactly what to click in GitHub settings." In the repository on GitHub, go to **Settings** → **Pages** → **Build and deployment** → **Source: GitHub Actions**.
6. **Merge the work.** If Claude Code opens a pull request, open it on GitHub and tap **Merge pull request**. Then check the **Actions** tab. After a minute or two, a green check means the site is live.
7. **Install on Android.** In Chrome, open `https://<your-github-username>.github.io/liftlog/`. Tap the **⋮** menu → **Install app** (on some phones it's **Add to Home screen** → **Install**). Open LiftLog from the home screen. When it asks to keep your data stored, allow it.
8. **Change things** by asking Claude Code and merging again. The next time you open the app, it shows "Update ready" with a reload button.
9. **Back up** from Settings → **Export backup**. That saves a `.json` file to Downloads. Put a copy in Google Drive.

**Privacy:** on a free GitHub account, a project published to Pages must be public, so anyone can see the code. Your lifting data never leaves your phone and is never in the repository. If you later want the code private too, Cloudflare Pages or Netlify can host a private repository for free.

## Build milestones

The app is usable at the gym after Milestone 1. Build the milestones in order. Each one ends with all tests passing, a deploy, and at least one real session logged.

1. **M1: Log sessions.** First-run setup. Home screen with cycle, week, and day cards. Session screen with main-lift sets calculated from the TMs and accessories. One-tap set logging, long-press to edit, undo of the last tap, and Bad/Fine/Great feel buttons. The accessory engine runs on Finish. Advancing week and cycle, with the training-max confirmation at the end of a cycle. History. Warm-up checklist card. Settings with backup export/import and the persistent-storage request. Install as a PWA, offline support, update prompt.
   - Done when: a Week 3 session can be logged start to finish in airplane mode, and the next session's targets match the Rules section.
2. **M2: Plan editor and library.** Exercise library (about 70 exercises with tags). Add/remove/reorder per day, supersets, active/inactive items. Muscle-group suggestions ranked and filtered by guard rails. Guard-rail management. Coverage check and pull:push warning. In-session exercise swap.
   - Done when: adding a blocked exercise is prevented unless overridden, and removing every hamstring exercise shows a coverage warning.
3. **M3: Game layer and progress.** XP, overall and per-muscle levels, PR detection and celebration, milestones with progress bars, barrier notes, per-exercise history charts, e1RM trend for main lifts.
   - Done when: logging a set above the e1RM PR line triggers the celebration and the correct XP.
4. **M4: Body map.** Front/back outline with tappable regions, pain logging, region history, red-flag rules, and the "Add a guard rail?" flow.
   - Done when: a red-flag log shows the referral message and suggests no exercises.

## Screens and flows

There are eight screens. The Session screen is the one used most and should get the most polish.

**First-run setup (M1).** The app asks for the current week and which day cards are already done this week. It confirms each lift's max as entered in the old blackironbeast.com calculator (pre-filled: press 120, bench 215, squat 265, deadlift 345). The TM is 90% of that number. It asks for persistent storage.

**Home (M1, game parts M3).**

- Header: "Cycle N · Week W – 5s / 3s / 1s / Deload", plus the level and XP bar and the main milestone bar (e.g., "Bench → 225: e1RM 192").
- Weeks 1–3: four day cards (Bench, Deadlift, OHP, Squat). Each card shows its main lift's top set and a check mark once done this week.
- Week 4: cards for Corrective A and Corrective B, plus a collapsed "Deload lift days (optional)" with the four days at deload percentages.
- "Resume session" banner if a session was left unfinished. Backup nudge if 14+ days have passed since the last export.
- When every card for the week is done, the header offers "Start next week". After Week 4 it opens the cycle-complete screen (see Rules).

**Session (M1).**

- Collapsible warm-up checklist at the top (static text from the seed, not tracked).
- Main-lift block: warm-up and working sets, each a row showing "weight × reps". Tap = done as planned (row turns green). Tap again = undo. Long-press = edit weight and reps with steppers. The + set opens a rep stepper set to its minimum and shows "Reps to beat: N" (see Rules).
- Accessories: one card per exercise with weight × target reps × sets, filled in from the engine. Same tap/long-press behaviour. Unilateral exercises show L and R rows, with the lead side first.
- After the last set of an exercise, three buttons appear: Bad / Fine / Great. Default is Fine if none is picked.
- Superset exercises are grouped and labelled A1/A2.
- Guard-rail notes appear on the exercise card (modify = note, caution = yellow tag).
- "Swap" on any accessory (M2): suggestions for the same muscle group, filtered by guard rails. Choose "Just today" or "Replace in plan".
- Autosaves after every tap. "Finish" runs the engines and shows a summary of next session's targets per exercise. PRs and XP join the summary in M3.

**Plan editor (M2).** A list per day. Add, remove, reorder, group into a superset, and toggle active/inactive. Per item: sets, rep range, weight step, unit (reps/seconds/steps), mode (progress/hold), unilateral and lead side, note. "Add" → pick a muscle group → ranked library list. Blocked exercises are hidden, with a "Show blocked" toggle and "Add anyway" requiring a reason. Coverage banner at the top.

**Body map (M4).** Front and back outline with tappable regions. Each region opens its log form, its history, and its guard rails.

**Progress (M3).** Per-exercise history chart (top-set weight and reps), e1RM trend for the four main lifts, PR list newest first, levels per muscle group, milestones.

**Settings (M1).** Training maxes, Week 3 progress threshold (3 reps), rounding increment (5 lb, always up), weight steps by equipment, important muscle groups, pull:push target, round-number list, backup export/import.

**History (M1).** Past sessions, newest first. Open one to see or edit its sets. Saving an edit re-runs the engines from that session forward.

## Rules

This section is the source of truth. Each rule lives in its own engine module as plain functions, and each has the tests listed under Testing.

### 5/3/1 engine

TM = 90% of the entered max, stored unrounded (e.g., 193.5). Each set weight = TM × percentage, always rounded UP to the next 5 lb (125.8 → 130). A weight already on a multiple of 5 stays put, using a small tolerance for floating-point error. This reproduces Z's blackironbeast.com sheet exactly. Weeks 1–3 start with warm-ups at 40% × 5, 50% × 5, 60% × 3 of the TM. Week 4 is only its three deload sets. No set is ever below 45 lb (the empty bar).

| Week | Set 1 | Set 2 | Set 3 |
| --- | --- | --- | --- |
| 1 (5s) | 65% × 5 | 75% × 5 | 85% × 5+ |
| 2 (3s) | 70% × 3 | 80% × 3 | 90% × 3+ |
| 3 (5/3/1) | 75% × 5 | 85% × 3 | 95% × 1+ |
| 4 (deload) | 40% × 5 | 50% × 5 | 60% × 5 |

- **Current cycle:** calculated from the TMs, the same as every later cycle. The seeded sheet is the expected output and doubles as a test.
- **e1RM** = weight × reps × 0.0333 + weight, shown rounded to 1 lb.
- **Reps to beat** on a + set = the smallest whole number of reps whose e1RM is higher than the lift's all-time best e1RM. Example: best OHP e1RM 116.65 (100 × 5), so the 105 × 1+ set needs 4.
- **Cycle complete** (after Week 4): for each lift, compare each + set with its minimum (5, 3, 1).
  - All minimums hit, and the Week 3 + set reached the progress threshold (Settings, default 3 reps) → suggest TM + 5 lb (bench, OHP) or + 10 lb (squat, deadlift). The threshold stops progression off a grinding single.
  - Any minimum missed, or the Week 3 + set below the threshold → suggest holding the TM.
  - A miss in two cycles in a row → suggest TM × 0.9, stored unrounded like any TM.
  - The user confirms each lift: Accept, pick another option, or type a TM. Nothing changes without confirmation. The user can override any suggestion, e.g., hold after a + set where the right side lagged.

### Accessory engine (double progression, feel sets the jump)

Each plan item has: sets, rep range (repMin–repMax, default 10–15), weight step, unit (reps, seconds, or steps), mode (progress or hold), and current state (weight, target, badStreak).

- **Success** = every working set reached the target.
- Success + **Great** → target + 3. Success + **Fine** → target + 1. Targets are capped at repMax.
- Checked first: success at repMax + Fine or Great → next weight = weight + step, target = repMin, badStreak = 0.
- **Bad**, or any set below target → target unchanged, badStreak + 1.
- badStreak reaches 2 → weight − step (never below the smallest step), target unchanged, badStreak = 0.
- Any success resets badStreak to 0. No state yet (first log): weight = the weight used, target = reps on the weakest set, capped at repMax.
- **Hold mode** (correctives): weight and target never change. Logging still earns XP.
- **Deload week:** no state changes for any exercise.
- **Seconds unit** (hangs, holds): Great + 10 s, Fine + 5 s. At repMax the app holds there and shows "Ready for a harder variation?" It does not change load.
- **Steps unit** (carries): set repMin = repMax (e.g., 50 steps per side). A clean session with Fine or Great therefore moves straight to the next weight.
- **Bodyweight items** (no weight): at repMax they hold and show "Add load or a harder variation?"
- **Unilateral items:** the lead side (the weaker side) is logged first and drives progression. Each other-side set's target = the reps the lead side did in that set. Optional extra lead-side sets. Both sides are stored for L-vs-R comparison. Sets are counted per side. Default lead side: R for upper-body items (the shoulder in rehab), L for lower-body items (the weaker glute med).
- **Default weight steps:** cable 5 lb, selectorized machine 10 lb, dumbbell 5 lb, barbell 10 lb, plate-loaded 10 lb. All editable.

Worked example: lat pulldown, 3 sets, 10–15, step 5.

| Session | Did | Feel | Next |
| --- | --- | --- | --- |
| 1 | 100 × 10, 10, 10 | Fine | 100 × 11 |
| 2 | 100 × 11, 11, 11 | Great | 100 × 14 |
| 3 | 100 × 14, 14, 14 | Great | 100 × 15 (capped) |
| 4 | 100 × 15, 15, 15 | Fine | 105 × 10 |
| 5 | 105 × 10, 10, 9 | Fine | 105 × 10 (missed, streak 1) |
| 6 | 105 × 10, 10, 10 | Bad | 100 × 10 (streak 2 → drop) |

### Guard rails

A guard rail = {id, region, tags\[\], action, note, exceptExerciseIds\[\], active}. Every library exercise has stressTags\[\]. A rail applies to an exercise when any tag overlaps and the exercise isn't in the exception list.

- **block:** hidden from suggestions. Adding it needs "Add anyway" plus a typed reason, which is stored.
- **modify:** the note shows on the exercise card in the editor and in the session.
- **caution:** yellow tag with the note.

Stress-tag vocabulary for the POC: `overhead-loaded`, `shoulder-wide-flare`, `shoulder-horizontal-abduction-end-range`, `knee-single-leg-elevated`, `knee-extension-loaded`, `knee-deep-flexion-loaded`, `knee-loaded`, `spine-axial-heavy`, `spinal-flexion-loaded`, `grip-intensive`.

Claude Code drafts the library in `seed.ts`: every seeded exercise plus common alternatives for each muscle group, about 70 in total, with every Exercise field filled. Assign stress tags conservatively: when unsure, add the tag.

### Body map and red flags

- **Regions, front:** neck, chest, abdomen; and L/R shoulder, elbow, wrist/hand, hip front, quad, knee, shin, ankle/foot.
- **Regions, back:** upper back, low back; and L/R shoulder blade, glute, hamstring, calf.
- **Pain log:** {date, region, type (sharp, dull, ache, tingling/numbness), rating 0–10, context (during an exercise → which one, at rest, after the session), note}.
- **Red flags** (any one): type sharp or tingling/numbness; rating 7 or higher; ratings for the same region rising across three logs in a row. A red flag shows: "This is worth getting checked by a physical therapist or doctor. LiftLog won't suggest exercises for it." The region is marked until the user clears it.
- After a non-red-flag log, the app offers "Add a guard rail for this region?" with tags suggested from a region→tags map (e.g., knee → `knee-single-leg-elevated`, `knee-deep-flexion-loaded`; shoulder → `overhead-loaded`, `shoulder-wide-flare`). Pain logs never change the plan on their own.

### Coverage check

- Weekly sets per muscle group = planned working sets where the group is primary (1 each) or secondary (0.5 each). Warm-up sets don't count.
- Default important groups: chest, lats, upper back, rear delts, side delts, biceps, triceps, quads, hamstrings, glutes, glute med, core, low back. Any group at 0 is flagged.
- Each exercise has one pattern: push (presses, chest flyes, triceps), pull (rows, pulldowns, face pulls, rear-delt work, Y raises, pull-aparts, biceps), or other (legs, core, carries, lateral raises).
- **Pull:push** = pull sets ÷ push sets for the planned week, with a target in Settings (default 2.0). Below target shows a warning. Main lifts count as their 3 working sets; inactive items don't count. With the seeded plan this comes to 24 pull ÷ 26 push ≈ 0.92, so the warning will show from day one. That's the check doing its job.

### Game layer

- **XP:** 10 per completed working set, +5 if the set beat its target. Only the first 5 sets per exercise per session count. Hold-mode sets earn the same XP.
- **PR bonuses:** rep PR (most reps at a weight) +25, weight PR (heaviest weight for at least repMin reps; for main lifts, at least 1 rep) +50, e1RM PR (main lifts only) +100.
- **Muscle XP:** each set's XP goes 100% to primary muscles and 50% to secondary ones.
- **Levels:** going from level L−1 to L costs 100 × L XP. The same curve is used for the overall level and each muscle level.
- **Milestones:** {lift, targetWeight, kind: e1RM or actual}. Progress = best value ÷ target. Reaching one triggers a full-screen celebration.
- **Barrier note:** round numbers default to 135, 185, 200, 225, 250, 275, 300, 315, 350, 365, 400, 405. A planned main-lift set that reaches one of these for the first time ever on that lift shows: "New round number: 200. Your best so far is 195. It's 5 lb."

## Data model and storage

All data is stored in IndexedDB on the phone through Dexie, under a schema version with migrations. Weights are stored in lb as numbers. Dates are ISO strings.

| Entity | Key fields |
| --- | --- |
| Exercise | id, name, equipment, primaryMuscles\[\], secondaryMuscles\[\], pattern (push/pull/other), stressTags\[\], unit, defaultStep, isMainLift |
| PlanDay | id, name, order, kind (lift/corrective), mainLiftId?, warmupChecklist\[\], items\[\] |
| PlanItem | id, exerciseId, sets, repMin, repMax, step, unit, mode (progress/hold), unilateral, leadSide?, extraLeadSets, supersetGroup?, note, active |
| ExerciseState | planItemId, weight, target, badStreak, updatedAt |
| MainLift | id (bench/deadlift/ohp/squat), enteredMax, tm (0.9 × enteredMax at setup, then incremented each cycle), increment |
| CycleState | cycle, week (1–4), daysDone\[\], tmHistory\[\] |
| Session | id, date, planDayId, cycle, week, status (open/finished); its sets are the SetLogs with this sessionId |
| SetLog | sessionId, exerciseId, planItemId, setIndex, side?, weight, reps, target, isWarmup, isPlusSet, done, at |
| ExerciseFeel | sessionId, planItemId, feel (bad/fine/great) |
| GuardRail | id, region, tags\[\], action (block/modify/caution), note, exceptExerciseIds\[\], active |
| PainLog | id, date, region, type, rating, context, exerciseId?, note, redFlag |
| Milestone | id, liftId, targetWeight, kind (e1RM/actual), achievedAt? |
| XpEvent | id, sessionId, amount, reason, muscles\[\] |
| Override | id, date, exerciseId, railId, reason |
| Meta | schemaVersion, lastBackupAt, settings |

- **History is never lost.** SetLogs are append-only. Editing a set during an open session replaces that set's log. Finished sessions can be edited from History, and the engines then re-run from that session forward.
- **Persistent storage:** call `navigator.storage.persist()` on first run and show the result in Settings.
- **Backup:** Export writes one JSON file, `{schemaVersion, exportedAt, data}`, containing every table. Import validates the schema version, shows counts, and replaces all data after confirmation. A round trip must reproduce identical data.
- **Undo:** the last set tap in a session can be undone. Finish can be reopened until the next session starts.

## Tech stack and architecture

The stack is React with TypeScript, built with Vite, and runs as an offline PWA on GitHub Pages. The rule engines are kept separate from the UI and the database so they can be tested on their own.

- **App:** React 18, TypeScript (strict), Vite, Tailwind CSS. Hash routing (works on GitHub Pages without server config). Vite `base` set to `/liftlog/`.
- **PWA:** `vite-plugin-pwa` with a web manifest (name, icons, `display: standalone`, dark theme colour) and a service worker that precaches the app shell. Use `registerType: 'prompt'` so updates show an "Update ready" reload button instead of reloading mid-set.
- **Storage:** Dexie over IndexedDB.
- **Charts (M3):** Recharts.
- **Body map (M4):** hand-drawn inline SVG, one path per region with the region id as its element id.
- **Tests:** Vitest for everything in `src/engine`, using the cases under Testing.
- **Deploy:** a GitHub Actions workflow that runs the tests, builds, and deploys to Pages on every push to `main`. A failing test blocks the deploy.

**Folder layout**

```
src/
  engine/        pure functions only: no React, no Dexie, no dates from the clock
    rounding.ts  e1rm.ts  fiveThreeOne.ts  accessory.ts
    guardRails.ts  coverage.ts  game.ts  bodyMap.ts
  data/          db.ts (Dexie schema + migrations), seed.ts, backup.ts, repo.ts
  screens/       Home, Session, PlanEditor, BodyMap, Progress, Settings, Setup, History
  components/    SetRow, ExerciseCard, FeelButtons, Stepper, Banner, BodyOutline
  App.tsx  main.tsx
```

**Boundaries**

- Engines take plain objects and return plain objects (e.g., `nextAccessoryState(state, setLogs, feel, isDeload) → state`). The current date is passed in, never read inside an engine.
- `data/repo.ts` is the only code that touches Dexie. Screens call repo functions and engine functions and never write to the database directly.
- On Finish, the session screen gathers the session's logs, calls the engines, and saves the results in one transaction: new ExerciseStates, XpEvents, PRs, and milestone updates.

## Seed data

The first install loads Z's current program, so M1 is usable on day one. Everything here can be edited in the app. Items with "light" or no weight start empty. Their first logged session sets the baseline, which becomes the target (capped at repMax).

### Main lifts: current-cycle sheet (expected engine output)

Sets are listed as reps × lb. A + marks the AMRAP set.

| Lift | Week 1 | Week 2 | Week 3 | Week 4 (deload) |
| --- | --- | --- | --- | --- |
| Bench | 5×80, 5×100, 3×120, 5×130, 5×150, 5+×165 | 5×80, 5×100, 3×120, 3×140, 3×155, 3+×175 | 5×80, 5×100, 3×120, 5×150, 3×165, 1+×185 | 5×80, 5×100, 5×120 |
| Deadlift | 5×125, 5×160, 3×190, 5×205, 5×235, 5+×265 | 5×125, 5×160, 3×190, 3×220, 3×250, 3+×280 | 5×125, 5×160, 3×190, 5×235, 3×265, 1+×295 | 5×125, 5×160, 5×190 |
| OHP | 5×45, 5×55, 3×65, 5×75, 5×85, 5+×95 | 5×45, 5×55, 3×65, 3×80, 3×90, 3+×100 | 5×45, 5×55, 3×65, 5×85, 3×95, 1+×105 | 5×45, 5×55, 5×65 |
| Squat | 5×100, 5×120, 3×145, 5×160, 5×180, 5+×205 | 5×100, 5×120, 3×145, 3×170, 3×195, 3+×215 | 5×100, 5×120, 3×145, 5×180, 3×205, 1+×230 | 5×100, 5×120, 5×145 |

Entered maxes from blackironbeast.com: press 120, bench 215, squat 265, deadlift 345. TMs at 90%: OHP 108, bench 193.5, squat 238.5, deadlift 310.5. Every number in the sheet above follows from these TMs with round-up rounding. Keep the TMs as entered: this cycle is a deliberate reduced block, and the cycle-end rule decides Cycle 2. Main-lift history to seed for PRs: deadlift 280 × 3, OHP 100 × 5, squat 230 × 1, bench 180 × 2 (recent) and 195 × 1 (older all-time best).

### Day 1: Bench

| Exercise | Start | Sets | Range | Step | Mode / notes |
| --- | --- | --- | --- | --- | --- |
| Face pull with external rotation | 50 × 15 | 3 | 15–15 | 5 | hold; elbows at shoulder height, 1 s hold |
| Seated cable row, neutral V-bar | 120 × 10 | 3 | 10–15 | 5 | 3 s hold |
| Cable crossover, high to low | 50/side × 12 | 3 | 10–15 | 5 |  |
| Cable lateral raise, unilateral | 20 × 12 | 3 | 10–15 | 5 | lead side R |
| Zottman curl | 15 × 10 | 3 | 10–12 | 2.5 | DB deep in palm; end the set when the grip opens |
| Cable overhead triceps extension | 45 × 10 | 3 | 10–15 | 5 |  |
| Pec deck | 120 × 12 | 3 | 10–15 | 10 | guard rail 3 |
| Wrist curl + reverse wrist curl (superset) | light × 15 | 2 | 15–20 | 2.5 | inactive until the right-forearm check clears |

### Day 2: Deadlift

| Exercise | Start | Sets | Range | Step | Mode / notes |
| --- | --- | --- | --- | --- | --- |
| Seated quad extension | 110 × 10 | 3 | 10–12 | 10 | guard rail 5 |
| Seated hamstring curl | 110 × 10 | 3 | 10–12 | 10 |  |
| Hanging leg raise | BW × 10 | 3 | 10–15 | — | bodyweight |
| Barbell hip thrust | 135 × 10 | 3 | 10–15 | 10 | bar rolls onto the pelvis: use a thicker pad or a machine |
| Cable hip abduction | 20 × 15 | 3 + 1 lead | 15–20 | 5 | unilateral, lead side L, 1 extra lead set |
| Active dead hang | baseline | 3 | 30–90 s | — | seconds; shoulder blades set; inactive until the forearm check clears |

### Day 4: OHP

| Exercise | Start | Sets | Range | Step | Mode / notes |
| --- | --- | --- | --- | --- | --- |
| Face pull with external rotation | 50 × 15 | 3 | 15–15 | 5 | hold |
| Unilateral kneeling lat pulldown | 60 × 10 | 3 | 10–12 | 5 | lead side R |
| Bilateral cable lat pulldown | 110 × 10 | 3 | 10–12 | 5 |  |
| Pec deck | 120 × 12 | 3 | 10–15 | 10 | guard rail 3 |
| Cable lateral raise, unilateral | 20 × 12 | 3 | 10–15 | 5 | lead side R |
| Cable overhead triceps extension | 45 × 10 | 3 | 10–15 | 5 |  |
| Chest-supported Y raise | 7.5 × 12 | 3 | 12–12 | 2.5 | hold; slow eccentric, reach through thumbs |
| Zottman curl | 17.5 × 10 | 3 | 10–12 | 2.5 | same grip notes as Day 1 |
| Landmine press | light | 3 | 10–12 | — | hold; reach and protract at the top |
| OHP half reps from sticking point | light | 2 | 8–10 | — | hold; motor pattern, not load |

### Day 5: Squat

| Exercise | Start | Sets | Range | Step | Mode / notes |
| --- | --- | --- | --- | --- | --- |
| Barbell RDL | 145 × 8 | 3 | 8–10 | 10 |  |
| Leg press, plate-loaded | 250 × 12 | 3 | 12–15 | 10 | superset A1 |
| Half-kneeling cable Pallof press | 30 × 10 | 3 per side | 10–15 | 5 | superset A2; unilateral, lead side L; anti-rotation, press out and hold 2 s |
| Goblet reverse lunge, floor level | 35 × 8 | 3 per side | 8–12 | 5 | superset B1; unilateral, lead side L; step back, never off a box (rail 4); rail 6 applies |
| Side plank with top-leg raise | BW × 20 s | 3 per side | 20–45 s | — | superset B2; seconds; lead side L; glute med and lateral core |
| Suitcase carry | 70 × 50 steps | 3 | 50–50 steps | 10 | superset C1; unilateral, lead side R; move up only if there's no grip slip |
| Back extension | BW × 15 | 3 | 15–20 | — | superset C2; bodyweight |
| Ab wheel rollout from knees | BW × 8 | 3 | 8–12 | — | inactive (optional); anti-extension; stop before the low back arches |

Core work is split by what it resists: the Pallof press resists rotation, the suitcase carry resists side-bending, and the ab wheel resists arching. The lunge and side plank target the left glute med and knee tracking. Supersets keep the session about the same length. Start loads are estimates, and the first logged session sets the real baseline.

### Deload: Corrective A and B (all hold mode)

- **A:** face pull with external rotation 50 × 15 × 3, chest-supported Y raise 7.5 × 12 × 3, unilateral kneeling lat pulldown (light) × 12 × 3, banded clamshell × 15/side × 3, bottoms-up KB press (light) × 8 × 3.
- **B:** band pull-apart × 15 × 3, chest-supported Y raise 7.5 × 12 × 3, bilateral lat pulldown (light) × 12 × 3, cable hip abduction 20 × 15 × 3 (lead L), landmine press (light) × 10 × 3, wall sit 45 s × 4.
- Target: out in 45 minutes.

### Warm-up checklists

- **Lower days:** 10 min incline walk; leg swings, 10 each leg, front-back and side-side; dowel hip hinge; bodyweight squat × 10; groiners; static hip-flexor stretch; wall sit 2 × 30–45 s; knee sleeves on.
- **Upper days:** 10 min incline walk, or band work if no treadmill is free.

### Guard rails

| # | Region | Rule | Tags | Action | Exceptions |
| --- | --- | --- | --- | --- | --- |
| 1 | R shoulder | No loaded overhead pressing beyond OHP programming | overhead-loaded | block | OHP, OHP half reps, bottoms-up KB press |
| 2 | R shoulder | No wide, flared-elbow pressing | shoulder-wide-flare | block |  |
| 3 | R shoulder | Pec deck: adjusted start position, restricted range | shoulder-horizontal-abduction-end-range | modify |  |
| 4 | L knee | No single-leg work on an elevated surface | knee-single-leg-elevated | block |  |
| 5 | L knee | Quad extension stops at 90° | knee-extension-loaded | modify |  |
| 6 | L knee | Sleeves on; knees out from the first inch; watch tracking | knee-loaded | caution |  |
| 7 | Low back | Belt on top sets (deadlift required, squat optional); cue "push the floor away" | spine-axial-heavy | modify |  |

### Milestones and settings

- Milestone: Bench 225, kind e1RM.
- Pull:push target 2.0. Rounding 5 lb. Round-number list as in Rules.

## Testing and acceptance

Every engine rule has a Vitest test written before the code (test-first). The deploy workflow blocks on any failure. The cases below are the minimum.

**Engine tests**

- Rounding (always up to 5): 57.5 → 60, 56 → 60, 74.75 → 75, 125.8 → 130, and 238.5 × 0.65 = 155.025 → 160, while an exact 155 stays 155.
- e1RM: 100 × 5 → 116.65; 280 × 3 → 307.97.
- Reps to beat: best e1RM 116.65, 105 lb → 4.
- 5/3/1 from a TM: TM 115, Week 1 → 75 × 5, 90 × 5, 100 × 5+; warm-ups 50, 60, 70.
- Entered maxes 120 / 215 / 265 / 345 reproduce every number in the seeded sheet, all four weeks, all four lifts.
- Cycle complete: all minimums hit → +5 bench and OHP, +10 squat and deadlift; one miss → hold; bench Week 3 + set 185 × 2 → hold (below threshold), 185 × 3 → +5; misses in two cycles → TM × 0.9 (193.5 → 174.15).
- Accessory: the six-session lat pulldown table in Rules reproduces exactly.
- Accessory: hold mode never changes; deload week never changes; the weight never drops below one step.
- Accessory: a unilateral lead-side miss repeats the target even if the other side hit it.
- Accessory: steps unit, 70 × 50 clean + Fine → 80 × 50.
- Accessory: no state yet + first log 12 reps on a 10–15 range → target 12.
- Guard rails: an elevated split squat is blocked by rail 4; OHP passes rail 1 through its exception; pec deck gets rail 3's note.
- Coverage: the seeded plan returns pull:push = 24 ÷ 26 ≈ 0.92 and a warning; removing both hamstring exercises flags hamstrings.
- Game: a 7-set exercise earns XP for 5 sets; an e1RM PR adds 100; muscle XP splits 100/50.
- Barrier: bench best 195, planned 200 → note shown; planned 200 again after 200 has been lifted → no note.
- Body map: rating 7 → red flag; ratings 3, 4, 5 in a row for one region → red flag; dull 3 → no flag and a guard-rail offer.
- Backup: export → import → every table is identical.

**Gym acceptance checklist (M1)**

- [ ] Installs from Chrome and opens from the home screen with no browser bar.
- [ ] A full session works in airplane mode.
- [ ] A session with every set as planned needs only taps (no typing).
- [ ] Killing the app mid-session and reopening it resumes the session with all taps intact.
- [ ] Next-session targets after Finish match a hand calculation from Rules.
- [ ] Export backup saves a file; importing it on a fresh install restores everything.

## Out of scope

The POC leaves out anything not needed for one person to run one cycle.

**Not in the POC:** accounts and cloud sync, social features, trainer/client mode, rest timer, nutrition, Whoop or other recovery inputs, AI coaching, Play Store release, kg units.

**Later ideas, in rough order of value**

1. A home-dailies checklist: wall sits, clamshells, steel mace, with streaks.
2. Trainer mode: one trainer, several client profiles, each with its own guard rails and plan. This is the possible commercial angle.
3. Recovery input (Whoop colour or a 1–3 readiness tap) that switches the day's accessories to a lighter 3-set version.
4. A rest timer that starts automatically after each tapped set.
5. Paused deadlift as a suggested supplemental lift when + sets keep slowing at the knee.
