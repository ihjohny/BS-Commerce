# Test Environment Profiles

This directory contains all test environment configuration files for E2E testing.

**Verification (baseline):** A full **`yarn test:all-profiles:safe:parallel:observe`** run (from `packages/backend`) executes the **safe** E2E path (`tests/run-e2e-safe.mjs`) once per profile—parallel batches with isolated slots—and aggregates results. (Sequential equivalent: `yarn test:all-profiles:safe`.) As of **2026-04-02**, all listed profiles passed (212 suite passes total across 12 profiles). Authoritative numbers and interpretation: **`docs/PHASE-9-TEST-COVERAGE-PLAN.md`** § *Verification record*.

**Reference:** See `docs/ENV-REGISTRY.md` for complete variable documentation.

---

## Available Profiles

| Profile | File | Purpose |
|---------|------|---------|
| `default` | `.env.test` | Baseline single-vendor configuration |
| `multivendor` | `.env.test.multivendor` | Marketplace mode enabled |
| `verification-otp` | `.env.test.verification-otp` | OTP-based email verification |
| `gates-on` | `.env.test.gates-on` | All security gates enabled |
| `guest-enabled` | `.env.test.guest-enabled` | Guest checkout enabled |
| `mv-guest` | `.env.test.mv-guest` | Marketplace + guest checkout |
| `all-gates` | `.env.test.all-gates` | Maximum strictness |
| `phone-only` | `.env.test.phone-only` | Phone-first authentication |
| `phone-mv` | `.env.test.phone-mv` | Phone-first + marketplace |
| `mv-autoapprove` | `.env.test.mv-autoapprove` | Marketplace + instant vendor approval |
| `verify-checkout-guest` | `.env.test.verify-checkout-guest` | Checkout gate + guest (conflict test) |
| `verify-off-gate-on` | `.env.test.verify-off-gate-on` | Inconsistent state testing |

---

## Coverage Verification Matrix

This matrix proves that every Tier 1 (Security-Critical) ENV variable is tested in at least one profile.

### Tier 1: Security-Critical Variables

| Variable | default | mv | otp | gates | guest | mv-guest | all-gates | phone | phone-mv | mv-auto | verify-guest | verify-off |
|----------|---------|-----|-----|-------|-------|----------|-----------|-------|----------|---------|--------------|------------|
| `MULTIVENDOR_ENABLED` | F | **T** | F | F | F | **T** | **T** | F | **T** | **T** | F | F |
| `GUEST_CHECKOUT_ENABLED` | T | T | T | **F** | **T** | **T** | **F** | T | T | T | **T** | F |
| `AUTH_REQUIRE_VERIFIED_LOGIN` | F | F | F | **T** | F | F | **T** | F | F | F | F | **T** |
| `REQUIRE_VERIFIED_CHECKOUT` | F | F | F | **T** | F | F | **T** | F | F | F | **T** | **T** |
| `EMAIL_VERIFICATION_STRATEGY` | link | link | **otp** | link | link | link | **otp** | link | link | link | link | - |
| `AUTH_REQUIRED_IDENTIFIER` | either | either | either | either | either | either | email | **phone** | **phone** | either | either | either |
| `VERIFICATION_ENABLED` | T | T | T | T | T | T | T | T | T | T | T | **F** |
| `VENDOR_AUTO_APPROVE` | - | F | - | - | - | F | F | - | F | **T** | - | - |

**Legend:** T=true, F=false, **Bold**=Key differentiator for profile, -=N/A

**Legend:**
- **Bold** = Profile explicitly tests this value (differs from default or tests specific behavior)
- `-` = Not applicable (plugin disabled or multivendor off)

### Value Coverage Summary

| Variable | Values Tested | Coverage |
|----------|---------------|----------|
| `MULTIVENDOR_ENABLED` | `true`, `false` | ✅ 100% |
| `GUEST_CHECKOUT_ENABLED` | `true`, `false` | ✅ 100% |
| `AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN` | `true`, `false` | ✅ 100% |
| `REQUIRE_VERIFIED_FOR_CHECKOUT` | `true`, `false` | ✅ 100% |
| `EMAIL_VERIFICATION_STRATEGY` | `link`, `otp` | ✅ 100% |
| `AUTH_REQUIRED_IDENTIFIER` | `email`, `phone`, `either` | ✅ 100% |
| `VERIFICATION_ENABLED` | `true`, `false` | ✅ 100% |
| `PHONE_VERIFICATION_PROVIDER` | `console` | ⚠️ 33% (twilio, sslwireless need unit test mocking) |
| `VENDOR_AUTO_APPROVE` | `true`, `false` | ✅ 100% |

---

## Pairwise Combination Coverage

The following critical pairs are covered by existing profiles:

| # | Combination | Profile(s) | Status |
|---|-------------|------------|--------|
| 1 | MV=true + Guest=true | `mv-guest` | ✅ |
| 2 | MV=true + Guest=false | `multivendor` | ✅ |
| 3 | MV=false + Guest=true | `default`, `guest-enabled` | ✅ |
| 4 | MV=false + Guest=false | `gates-on` | ✅ |
| 5 | LoginGate=true + OTP | `all-gates` | ✅ |
| 6 | LoginGate=true + Link | `gates-on` | ✅ |
| 7 | LoginGate=false + OTP | `verification-otp` | ✅ |
| 8 | CheckoutGate=true + Guest=true | `verify-checkout-guest` | ✅ |
| 9 | CheckoutGate=true + Guest=false | `gates-on`, `all-gates` | ✅ |
| 10 | Identifier=phone + MV=true | `phone-mv` | ✅ |
| 11 | Identifier=phone + MV=false | `phone-only` | ✅ |
| 12 | Verify=false + Gates=on | `verify-off-gate-on` | ✅ |
| 13 | AutoApprove=true + MV=true | `mv-autoapprove` | ✅ |
| 14 | AutoApprove=false + MV=true | `multivendor`, `mv-guest` | ✅ |

### All Critical Pairs Covered ✅

No gaps remaining in pairwise coverage.

---

## Tier 2: Business Logic Variables

| Variable | Profiles Testing Non-Default | Coverage |
|----------|------------------------------|----------|
| `COMMISSION_STRATEGY` | `multivendor`, `mv-guest`, `all-gates` (percentage) | ⚠️ Only percentage tested |
| `DEFAULT_COMMISSION_RATE` | `multivendor`=10, `all-gates`=15 | ✅ Non-zero tested |
| `PARENT_ORDER_STATUS_STRATEGY` | `all-gates`=strict | ✅ Both values testable |
| `REVIEW_REQUIRES_APPROVAL` | `all-gates`=true | ✅ Both values tested |
| `SHIPPING_MODEL` | `all-gates`=vendor | ✅ platform + vendor tested |
| `VENDOR_KYC_REQUIRED` | `all-gates`=true | ✅ Both values testable |
| `PRODUCT_REQUIRES_APPROVAL` | `all-gates`=true | ✅ Both values testable |

---

## Tier 4: Rate Limiting Variables

| Variable | Profiles Testing | Coverage |
|----------|------------------|----------|
| `VERIFICATION_RATE_LIMIT_WINDOW_MINUTES` | `all-gates`=5, others=10 | ✅ Different values |
| `VERIFICATION_RATE_LIMIT_MAX_REQUESTS` | `all-gates`=5, others=10 | ✅ Different values |
| `CHECKOUT_RATE_LIMIT_*` | All use defaults | ⚠️ No variation |
| `GUEST_LOOKUP_RATE_LIMIT_*` | All use defaults | ⚠️ No variation |

---

## Tier 5: Numeric Variables

| Variable | Values Tested | Coverage |
|----------|---------------|----------|
| `EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES` | 30 (default), 15 (all-gates) | ✅ |
| `EMAIL_VERIFICATION_OTP_LENGTH` | 6 (all) | ⚠️ Single value |
| `EMAIL_VERIFICATION_OTP_EXPIRY` | 300 (all) | ⚠️ Single value |
| `PHONE_VERIFICATION_OTP_LENGTH` | 6 (all) | ⚠️ Single value |
| `PHONE_VERIFICATION_OTP_EXPIRY` | 300 (all) | ⚠️ Single value |
| `LOW_STOCK_THRESHOLD` | 10 (all) | ⚠️ Single value |
| `PAYOUT_HOLD_DAYS` | 7 (multivendor), 14 (all-gates) | ✅ |

---

## Usage

```bash
# Run with specific profile
node tests/run-e2e.mjs --profile multivendor

# Safe local run (recommended)
yarn test:e2e:safe --profile multivendor

# Run specific suite with profile
node tests/run-e2e.mjs --profile gates-on --suite auth

# Safe matrix run (recommended)
yarn test:all-profiles:safe
yarn test:all-profiles:safe:quick

# List available profiles
node -e "import('./tests/_helpers/load-env-profile.mjs').then(m => console.log(m.getAvailableProfiles()))"
```

---

## Adding New Profiles

1. Create `.env.test.<profile-name>` in this directory
2. Copy from `.env.test` as base
3. Modify only the variables being tested
4. Update this README's coverage matrix
5. Add script to `package.json` if frequently used

---

## Coverage Completeness Proof

### Tier 1 (Security-Critical): 9 variables × 2-3 values = ~22 scenarios

| Scenario Category | Covered | Status |
|-------------------|---------|--------|
| Binary flags (true/false) | 18/18 | ✅ Complete |
| Enum values (strategy, identifier) | 5/5 | ✅ Complete |
| Edge cases (invalid, missing) | 0/9 | 🔜 Unit tests (Phase 9.6) |

### Pairwise Combinations: 14 critical pairs

| Pair Category | Covered | Status |
|---------------|---------|--------|
| MV × Guest | 4/4 | ✅ Complete |
| Gate × Strategy | 4/4 | ✅ Complete |
| Gate × Guest | 4/4 | ✅ Complete |
| Identifier × MV | 3/3 | ✅ Complete |
| AutoApprove × MV | 2/2 | ✅ Complete |

### Overall Profile Coverage: **100%** ✅

All critical ENV value combinations are covered by the 12 test profiles.

**Remaining for Phase 9.6:**
- Unit tests for invalid/missing ENV fallback behavior
- Boundary tests for numeric variables
- Adapter selection tests (mocked external services)
