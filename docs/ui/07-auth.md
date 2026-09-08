# 07 — Authentication: login, register, verification, password reset

Covers every unauthenticated entry point into the storefront. Grounded in the real auth stack: `users` collection auth config, custom `/api/auth/login` endpoint, and the identifier-verification plugin (6-digit OTP + one-click magic link).

## Purpose & routes

All routes are locale-prefixed. Every route is **guest-only**: an authenticated visitor is redirected to `?next` (or `/{locale}/account`).

| Route | Purpose |
| :--- | :--- |
| `/{locale}/auth/login` | Sign in with **email or phone + password** |
| `/{locale}/auth/register` | Create a customer account (identifier adapts to `AUTH_REQUIRED_IDENTIFIER`) |
| `/{locale}/auth/verify` | Verify email/phone: OTP entry (`InputOTP`), magic-link interstitial, `?token=` deep link |
| `/{locale}/auth/forgot-password` | Request a password-reset email |
| `/{locale}/auth/reset-password` | Set a new password with `?token=` from the reset email |

Auth-guard contract (shared with `01-app-shell.md`):

- Guest visiting an auth-only route (`/account/*`) → redirect `/{locale}/auth/login?next={original-path}`.
- Authenticated user visiting any `/auth/*` route → redirect to `next` or `/{locale}/account`.
- Header account icon: guest → `/auth/login?next=...`; authed → `/account`. Footer shows "Sign in / Register" only for guests, "My account" only for authed users.
- `next` is always validated as a local path (must start with `/`) before redirecting.
- Session = JWT from the API (`tokenExpiration: 7200` — 2 hours, `packages/backend/src/collections/users/index.ts`). Store the token for `Authorization: Bearer` calls plus a storefront-scoped cookie; the backend deliberately does **not** set a `payload-token` cookie on login (`packages/backend/src/endpoints/auth-login.ts`).

## Wireframe

Auth pages are a single centered card (`max-w-md`), identical on desktop and mobile (card goes full-width, `px-4`, below the compact header).

```
        ┌────────────────────────────────────────────┐
        │  logo            en | bn        🌙  🛒     │   ← app header (01)
        └────────────────────────────────────────────┘
                     ┌──────────────────┐
                     │     Welcome back │
                     │  Sign in to ...  │
                     │                  │
                     │  Identifier      │   ← email or phone (one field)
                     │  ┌────────────┐  │
                     │  │            │  │
                     │  └────────────┘  │
                     │  Password    👁  │
                     │  ┌────────────┐  │
                     │  │            │  │
                     │  └────────────┘  │
                     │  [     Login   ] │   ← full-width, Spinner when pending
                     │                  │
                     │  Forgot password?│   ← link → /auth/forgot-password
                     │  ─────── or ─────│
                     │  Create account  │   ← link → /auth/register
                     └──────────────────┘
        ┌────────────────────────────────────────────┐
        │  footer (01)                               │
        └────────────────────────────────────────────┘
```

Verify page — OTP mode (phone always; email when `EMAIL_VERIFICATION_STRATEGY=otp`):

```
        ┌────────────────────────────────────────────┐
        │        Verify your phone / email           │
        │  We sent a 6-digit code to +8801•••4321    │
        │                                            │
        │        ┌───┬───┬───┬───┬───┬───┐           │
        │        │ 4 │ 8 │ 2 │ _ │ _ │ _ │           │   ← InputOTP, maxLength 6
        │        └───┴───┴───┴───┴───┴───┘           │
        │        [        Verify          ]          │
        │        Resend (43s)    Use another number  │
        └────────────────────────────────────────────┘
```

Verify page — magic-link interstitial (email, `EMAIL_VERIFICATION_STRATEGY=link`):

```
        ┌────────────────────────────────────────────┐
        │              ✉ (Mail icon)                 │
        │            Check your inbox                │
        │  We sent a verification link to            │
        │  rah•••@example.com                        │
        │  The link expires in 30 minutes.           │
        │                                            │
        │  [ Resend link ]         Change email      │
        │  ────────────────────────────────────────  │
        │  Have a code? Enter it manually            │   ← expands the OTP form
        └────────────────────────────────────────────┘
```

## Sections

### 1. Login (`/auth/login`)

- `Card` with `CardHeader` (title + description), `CardContent` form, `CardFooter` links.
- Single **identifier** `Field` (`Input`, `type="text"`, `inputMode="email"`, `autoComplete="username"`). One field accepts either email or phone — the backend detects format and routes to email or username login (`packages/backend/src/endpoints/auth-login.ts`).
- **Password** `Field` (`Input type="password"`) with eye toggle (`Button variant="ghost" size="icon"` inside `InputGroup`), `autoComplete="current-password"`.
- Submit `Button type="submit"` full-width: pending → `disabled` + `Spinner` + `data-icon="inline-start"`.
- `Forgot password?` link below the form → `/auth/forgot-password`.
- Footer: `Create account` link → `/auth/register?next=...` (preserves `next`).
- On success: store token + user, `toast.success`, redirect to `next` || `/{locale}/account`.
- **Verified-email login gate** (only when `AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true`): a `403` response with message *"Email address is not verified. Please verify your email before logging in."* renders an inline `Alert` with a **Verify now** button that prefills the identifier and routes to `/auth/verify`. Default is `false` (gate off).
- After 5 failed attempts the account locks for 10 minutes (`maxLoginAttempts: 5`, `lockTime: 600000` ms, `packages/backend/src/collections/users/index.ts`) — surface the API error message verbatim in the form `Alert variant="destructive"`.
- **No social login buttons.** `SOCIAL_LOGIN_ENABLED` exists in `.env.example` but the OAuth plugin is not registered in `payload.config.ts` ("Phase 1 prep"). Do not render dead UI.

### 2. Register (`/auth/register`)

Form fields **depend on `AUTH_REQUIRED_IDENTIFIER`** (`packages/backend/src/lib/auth-config.ts`; public value also mirrored in `NEXT_PUBLIC_AUTH_REQUIRED_IDENTIFIER`):

| Mode | Required | Optional |
| :--- | :--- | :--- |
| `email` | email | — |
| `phone` | phone | — |
| `either` (default) | one of email/phone — chosen with a 2-option `ToggleGroup type="single"` (Email / Phone) above the fields | the other identifier, behind a collapsed "Add {email/phone} too (optional)" |

- Additional fields: **password** + **confirm password** (min 8 chars, zod), optional `firstName`, `lastName` (`Field` row, `FieldGroup` wraps the form).
- Phone input: `type="tel"`; the API rejects phone identifiers shorter than 10 chars on verification sends, and phone values are stored trimmed — validate length ≥ 10 client-side.
- Do **not** render a username field: `username` is the server-computed login identifier (`beforeValidate` hook, `packages/backend/src/collections/users/index.ts`) and is read-only.
- Submit → `POST /api/users` (public create: `access.create: () => true`). On success the backend auto-sets `username`; immediately sign in via `POST /api/auth/login` with the chosen identifier + password to obtain the JWT.
- Then redirect to `/auth/verify?identifier=<email|phone>&value=<identifier>&next=...` and auto-send the first code/link. Server validation failures from the hook (*"Email is required."*, *"At least one of email or phone is required."*) map onto the corresponding `Field` as `data-invalid` + `aria-invalid`.

### 3. Verify (`/auth/verify`)

Query contract: `?identifier=email|phone&value=<identifier>&next=<path>`; plus `?token=<token>` mode (deep link). One page, four states:

1. **OTP entry** — used for phone (always) and for email when `EMAIL_VERIFICATION_STRATEGY=otp`.
   - `InputOTP` with `maxLength={6}` (backend OTP is 6 digits: `OTP_DIGITS = 6` in `packages/backend/src/plugins/verification/lib/generate-code.ts`; `EMAIL_VERIFICATION_OTP_LENGTH=6`, `PHONE_VERIFICATION_OTP_LENGTH=6`, phone length bounded 4–8 by env — the UI ships 6).
   - Numeric groups, paste support, auto-submit when the 6th digit lands; disable + `Spinner` inside the Verify button while pending.
   - Submit: `POST /api/auth/verify-phone { code, phone }` or `POST /api/auth/verify-email { code, email }`.
   - `400` responses render the exact API message in an `Alert variant="destructive"`: *"Invalid or expired verification code."* / *"Verification code has expired. Please request a new one."*
2. **Magic-link interstitial** — email + `EMAIL_VERIFICATION_STRATEGY=link` (default). `Mail` icon, masked identifier, expiry copy: the link is valid for `EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES` (default 30). "Resend link" button + "Change email" back-link + a collapsible "Enter a code instead" that reveals state 1.
3. **`?token=` deep link** — on mount, `POST /api/auth/verify-email { token }`; success → success card + redirect; `400` (*"Invalid or expired verification link."*) → destructive Alert with "Request a new link" (fires `send-verification`).
4. **Success** — toast + `CheckCircle` card; redirect to `next` if present, else `/{locale}/account` when the visitor holds a session, else `/{locale}/auth/login?next=` (verification flags don't create a session).

Resend mechanics (`POST /api/auth/send-verification { identifierType, identifier }`, `packages/backend/src/plugins/verification/endpoints/send-verification.ts`):

- **Cooldown:** one code per identifier per 60 s. On `429 { error, retryAfter: 60 }` disable the Resend button and run a visible countdown ("Resend (43s)"). Keep `lastSentAt` per identifier in `sessionStorage` so refreshes don't allow hammering.
- **Rolling window:** 10 requests / 10 min per identifier **and** per IP (`VERIFICATION_RATE_LIMIT_*`); window `429`s render the API message as an `Alert` (no countdown — wait it out).
- Phone OTP expiry is `PHONE_VERIFICATION_OTP_EXPIRY` (default 300 s); email OTP `EMAIL_VERIFICATION_OTP_EXPIRY` (default 300 s) — show "codes expire in 5 minutes" hint.
- **Dev adapter hint:** `PHONE_VERIFICATION_PROVIDER=console` sends no SMS — the code is logged server-side only in non-production (`packages/backend/src/plugins/verification/adapters/phone-console.ts`). In non-production builds show a `text-muted-foreground` hint: "Development: the code is printed in the API console." Never in production.

### 4. Forgot password (`/auth/forgot-password`)

- Single email `Field` + submit → `POST /api/users/forgot-password { email }` (Payload built-in auth endpoint on the `users` collection).
- Always render the same neutral success card ("If an account exists for {email}, a reset link is on its way.") — never reveal whether the account exists.
- Button pending state per form conventions; then link back to `/auth/login`.

### 5. Reset password (`/auth/reset-password?token=`)

- Missing `token` → immediately render destructive Alert + link to `/auth/forgot-password`.
- Form: new password + confirm (`zod` equality) → `POST /api/users/reset-password { token, password }`.
- Success → toast + redirect `/auth/login?next=` (user signs in with the new password).
- Invalid/expired token (`400`) → destructive Alert + "Request a new link".
- Integration note: the reset email is generated by the backend; its link template must point at `/{storefront}/en/auth/reset-password?token=` for this page to receive tokens. Flag to the coordinator during wiring.

### 6. Verification-gated behaviors elsewhere

| Gate | Env | Behavior |
| :--- | :--- | :--- |
| Login block | `AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true` | `403` on login with unverified email → login-page Alert + "Verify now" (default `false`) |
| Checkout block | `REQUIRE_VERIFIED_FOR_CHECKOUT=true` | `process-checkout` rejects logged-in users with **both** `emailVerified` and `phoneVerified` false (`403` *"Account identifiers are not verified…"*, `packages/backend/src/lib/process-checkout.ts`) → account area shows a persistent verify banner (see `08-account.md`) |

Changing an identifier always resets its verified flag server-side (`packages/backend/src/lib/user-verification-reset.ts`) — the profile UI must re-launch verification after such a change (08).

## shadcn components

```bash
npx shadcn@latest add card button input input-group input-otp field label \
  toggle-group alert separator spinner sonner skeleton checkbox
```

| Need | Component |
| :--- | :--- |
| Auth card | `Card` + `CardHeader/Title/Description/Content/Footer` |
| Forms (all) | `Field` + `FieldGroup`; `data-invalid` on `Field`, `aria-invalid` on control, `FieldDescription` as error slot |
| Password reveal | `InputGroup` + `InputGroupAddon` (eye `Button variant="ghost" size="icon"`) |
| Identifier choice in `either` mode | `ToggleGroup type="single"` (exactly 2 options) |
| 6-digit code | `InputOTP` (`maxLength={6}`, numeric) |
| Destructive/server errors | `Alert variant="destructive"` above the submit button |
| Pending submit | `Button disabled` + `Spinner` + `data-icon="inline-start"` |
| Skeletons while session check runs | `Skeleton` mirroring the card |
| Toasts (sign-in success, code sent) | `sonner` |

## Interactions & states

- **Loading:** page-level `Skeleton` card while `GET /api/users/me` decides guest-only redirect; buttons disable+`Spinner` while pending.
- **Field errors:** client `zod` first (`aria-invalid` + `FieldDescription`); server messages from the API replace/augment them.
- **Server errors:** `Alert variant="destructive"` above the form (login 401/403/429, register 400, verify 400/429, reset 400).
- **Empty:** n/a (no lists on auth pages).
- **Toasts:** `toast.success` on login/register/verification/reset success; `toast.error` for failed sends (resend `502` — *"Failed to send verification code."* / *"Failed to send verification email."*).
- **Redirect discipline:** every submit that ends in navigation honors `next` (local paths only); authed users never see auth pages.
- **Cooldown persistence:** resend countdown survives navigation within the session (`sessionStorage`, keyed by identifier).

## Data & API

| Call | Purpose | Source |
| :--- | :--- | :--- |
| `POST /api/auth/login` `{ identifier, password }` → `{ user, token }` | Login (email-format identifier → email login, else username) | `packages/backend/src/endpoints/auth-login.ts` |
| `POST /api/users` | Register (public create; hook enforces identifier rule, auto-`username`) | `packages/backend/src/collections/users/index.ts`, `packages/backend/src/lib/auth-config.ts` |
| `GET /api/users/me`, `POST /api/users/refresh`, `POST /api/users/logout` | Session bootstrap/refresh/teardown (Payload built-ins; JWT 2 h, 5-attempt lockout 10 min) | `packages/backend/src/collections/users/index.ts` (`auth` block) |
| `POST /api/users/forgot-password` `{ email }` | Request reset email | Payload built-in auth route on `users` |
| `POST /api/users/reset-password` `{ token, password }` | Consume reset token | Payload built-in auth route on `users` |
| `POST /api/auth/send-verification` `{ identifierType: 'email'\|'phone', identifier }` | Send OTP or magic link; 60 s cooldown (`429 { retryAfter: 60 }`), 10 req/10 min per identifier+IP | `packages/backend/src/plugins/verification/endpoints/send-verification.ts` |
| `POST /api/auth/verify-email` `{ token }` or `{ code, email }` | Verify email (link body-token or OTP); sets `emailVerified` | `packages/backend/src/plugins/verification/endpoints/verify-email-post.ts` |
| `POST /api/auth/verify-phone` `{ code, phone }` | Verify phone; sets `phoneVerified` | `packages/backend/src/plugins/verification/endpoints/verify-phone.ts` |
| `GET /api/auth/verify-email/:token` | One-click link target embedded in emails (points at the **API** origin `NEXT_PUBLIC_APP_URL`, returns JSON) | `packages/backend/src/plugins/verification/endpoints/verify-email-link-get.ts`, `.../adapters/email-link.ts` |
| `POST /api/auth/admin/verify-identifier` | Admin support tool only — not used by storefront UI | `packages/backend/src/plugins/verification/endpoints/verify-identifier-admin.ts` |

Collection/field facts behind the forms: `users.email` (unique), `users.phone` (unique), `users.username` (read-only login identifier), `emailVerified`/`phoneVerified` (admin-only update — users can only flip them via the verify endpoints), `users.locale` (`en|bn`) — `packages/backend/src/collections/users/index.ts`. Plugin + strategy registration: `packages/backend/src/payload.config.ts` (`verificationPlugin`), `packages/backend/src/plugins/verification/index.ts`. Codes live in `verification-codes` (single-use, `expiresAt`, `ip`): `packages/backend/src/plugins/verification/collections/verification-codes.ts`.

**Integration gaps to reconcile (do not paper over in code):**
1. The magic-link email points at the backend API `GET /api/auth/verify-email/:token`, which answers JSON instead of redirecting to the storefront. Either the email template should link to `/{locale}/auth/verify?token=…` (preferred) or the GET endpoint should 302 to the storefront — coordinate before launch. The UI already supports the `?token=` deep link either way.
2. Password-reset email template must target `/{locale}/auth/reset-password?token=` (Payload default links to the admin panel).

## i18n keys

| key | en | bn |
| :--- | :--- | :--- |
| `auth.login.title` | Welcome back | আবার স্বাগতম |
| `auth.login.description` | Sign in with your email or phone | ইমেইল বা ফোন দিয়ে সাইন ইন করুন |
| `auth.login.identifier` | Email or phone | ইমেইল বা ফোন |
| `auth.login.password` | Password | পাসওয়ার্ড |
| `auth.login.submit` | Log in | লগ ইন |
| `auth.login.forgot` | Forgot password? | পাসওয়ার্ড ভুলে গেছেন? |
| `auth.login.noAccount` | New here? | নতুন এসেছেন? |
| `auth.login.createAccount` | Create an account | অ্যাকাউন্ট তৈরি করুন |
| `auth.login.unverified` | Email address is not verified. Please verify your email before logging in. | ইমেইল ঠিকানা যাচাই করা হয়নি। লগ ইনের আগে ইমেইল যাচাই করুন। |
| `auth.login.verifyNow` | Verify now | এখনই যাচাই করুন |
| `auth.register.title` | Create your account | আপনার অ্যাকাউন্ট তৈরি করুন |
| `auth.register.email` | Email | ইমেইল |
| `auth.register.phone` | Phone number | ফোন নম্বর |
| `auth.register.addOther` | Add {{other}} too (optional) | {{other}}-ও যোগ করুন (ঐচ্ছিক) |
| `auth.register.password` | Password | পাসওয়ার্ড |
| `auth.register.confirmPassword` | Confirm password | পাসওয়ার্ড নিশ্চিত করুন |
| `auth.register.firstName` | First name | নাম (প্রথম অংশ) |
| `auth.register.lastName` | Last name | নাম (শেষ অংশ) |
| `auth.register.submit` | Create account | অ্যাকাউন্ট তৈরি করুন |
| `auth.register.haveAccount` | Already have an account? Log in | অ্যাকাউন্ট আছে? লগ ইন করুন |
| `auth.verify.title.email` | Verify your email | আপনার ইমেইল যাচাই করুন |
| `auth.verify.title.phone` | Verify your phone | আপনার ফোন যাচাই করুন |
| `auth.verify.sentTo` | We sent a 6-digit code to {{identifier}} | আমরা {{identifier}}-এ ৬ সংখ্যার কোড পাঠিয়েছি |
| `auth.verify.otpLabel` | Verification code | যাচাইকরণ কোড |
| `auth.verify.submit` | Verify | যাচাই করুন |
| `auth.verify.linkTitle` | Check your inbox | ইনবক্স দেখুন |
| `auth.verify.linkBody` | We sent a verification link to {{identifier}}. It expires in 30 minutes. | আমরা {{identifier}}-এ একটি যাচাইকরণ লিংক পাঠিয়েছি। এটি ৩০ মিনিটে শেষ হবে। |
| `auth.verify.resend` | Resend | আবার পাঠান |
| `auth.verify.resendIn` | Resend ({{seconds}}s) | আবার পাঠান ({{seconds}} সেকেন্ড) |
| `auth.verify.changeIdentifier` | Use a different {{identifierType}} | ভিন্ন {{identifierType}} ব্যবহার করুন |
| `auth.verify.enterCodeInstead` | Have a code? Enter it manually | কোড আছে? নিজে লিখুন |
| `auth.verify.devHint` | Development: the code is printed in the API console. | ডেভেলপমেন্ট: কোডটি API কনসোলে প্রিন্ট হয়। |
| `auth.verify.success` | {{identifierType}} verified. Thank you! | {{identifierType}} যাচাই সম্পন্ন। ধন্যবাদ! |
| `auth.verify.expiryHint` | Codes expire in 5 minutes. | কোড ৫ মিনিটে শেষ হয়। |
| `auth.forgot.title` | Reset your password | পাসওয়ার্ড রিসেট করুন |
| `auth.forgot.submit` | Send reset link | রিসেট লিংক পাঠান |
| `auth.forgot.sent` | If an account exists for {{email}}, a reset link is on its way. | {{email}}-এ অ্যাকাউন্ট থাকলে রিসেট লিংক পাঠানো হয়েছে। |
| `auth.reset.title` | Choose a new password | নতুন পাসওয়ার্ড দিন |
| `auth.reset.password` | New password | নতুন পাসওয়ার্ড |
| `auth.reset.confirm` | Confirm new password | নতুন পাসওয়ার্ড নিশ্চিত করুন |
| `auth.reset.submit` | Reset password | পাসওয়ার্ড রিসেট করুন |
| `auth.reset.missingToken` | This reset link is invalid or incomplete. | এই রিসেট লিংকটি অবৈধ বা অসম্পূর্ণ। |
| `common.backToLogin` | Back to log in | লগ ইনে ফিরে যান |

## Acceptance checklist

- [ ] `/en/auth/login` and `/bn/auth/login` render the single identifier field; posting `identifier` + `password` to `POST /api/auth/login` succeeds for both an email user and a phone user (username login path).
- [ ] Wrong credentials render the API error inline (`Alert variant="destructive"`); 5 failures then produce the lockout message; no client-side rate-limit code interferes.
- [ ] With `AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN=true`, an unverified-email login shows the 403 Alert with a working **Verify now** shortcut; with default `false` no gate appears.
- [ ] Register form adapts: `AUTH_REQUIRED_IDENTIFIER=email` shows only email; `=phone` only phone; `=either` shows the `ToggleGroup` plus optional second identifier; omitting the required identifier surfaces the exact server message on the right `Field`.
- [ ] Registration does not send `username`; after `POST /api/users` the UI auto-logs in via `POST /api/auth/login` and lands on `/auth/verify` with the identifier prefilled.
- [ ] Verify page renders `InputOTP` with exactly 6 slots for phone (all email strategies) and auto-submits on completion; `POST /api/auth/verify-phone` success flips `phoneVerified` (checkable via admin).
- [ ] With `EMAIL_VERIFICATION_STRATEGY=link`, email verification shows the "Check your inbox" interstitial (not the OTP form) plus the collapsible manual-code form; the Resend button obeys the 60 s cooldown (`429` → countdown) and the 10/10-min window surfaces the API message.
- [ ] `/auth/verify?token=…` POSTs the token and lands on the success state; an invalid token shows *"Invalid or expired verification link."* with a resend path.
- [ ] Non-production builds with `PHONE_VERIFICATION_PROVIDER=console` show the dev hint; production never does.
- [ ] Forgot-password always shows the neutral "if an account exists" card; reset-password with a valid token sets a new password and redirects to login; an expired/missing token shows a destructive Alert with a re-request link.
- [ ] All five routes redirect an authenticated visitor to `next` (or `/account`); guarded `/account` routes bounce guests to `/auth/login?next=…`; header/footer auth links match `01-app-shell.md`.
- [ ] No social-login buttons anywhere; no `dark:` overrides, raw hex classes, `space-y-*`, or hardcoded strings (all copy via the key table above).
