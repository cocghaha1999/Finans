# Cloud Functions for Installments (Taksit)

This folder contains a scheduled Cloud Function that processes due credit card installment plans daily and posts a `harcama` entry into `users/{uid}/cards/{cardId}/entries`, then advances the plan and recalculates `currentDebt` and `minimumPayment`.

## What it does
- Runs daily at 03:00 Europe/Istanbul
- Scans all users and their `cards` subcollection
- For each card, checks `installmentPlans` array; for any plan with `remaining > 0` and `nextDate <= today`, it:
  - Adds a `harcama` entry dated `nextDate`
  - Increments `currentDebt` and updates `minimumPayment`
  - Decrements `remaining`, increments `posted`, and advances `nextDate` by one month (or sets it to null if finished)

## Local development
1. Install Firebase CLI and login
2. Install deps
3. Start emulators

```powershell
# From repo root
cd functions
pnpm i ; pnpm build
# Or: npm i ; npm run build
firebase emulators:start --only functions
```

## Deploy
```powershell
# From repo root
cd functions
pnpm i ; pnpm deploy
# Or: npm i ; npm run deploy
```

## Notes
- Keep the client runner guarded by `NEXT_PUBLIC_ENABLE_LOCAL_TAKSIT_RUNNER=false` in production to avoid double posting.
- Ensure Firestore Security Rules allow the function service account to write to `users/*/cards/*` and `entries`.
