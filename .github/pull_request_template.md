# Description

(Summary of the change and which issue is fixed. Include relevant motivation and context.)

## Type of change

- [ ] Link to a **GH Issue** or **Jira** task
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring / test improvement

# How Has This Been Tested?

(Describe the tests that you ran to verify your changes.)

- [ ] Unit tests (`yarn test:unit`)
- [ ] E2E tests (`yarn test:e2e`)
- [ ] Manual testing

# Security/Abuse Test Coverage

(For security-sensitive surfaces: auth, checkout, verification, payments, coupons, ownership, rate limits, guest flows)

- [ ] Cross-user / cross-tenant access denial
- [ ] Input tampering (forged IDs, injected payloads)
- [ ] Replay / idempotency protection
- [ ] Rate-limit behavior
- [ ] Error message safety (no information leakage)
- [ ] N/A — change does not touch sensitive surfaces

# OWASP Coverage Mapping

(Map tests to OWASP API Top 10 risks. See `docs/TESTING-ARCHITECTURE-RFC.md` §3.)

| OWASP risk | Test file / case | Status |
|---|---|---|
| API1 (BOLA) | | |
| API2 (Broken Auth) | | |
| API5 (Broken Function Auth) | | |
| N/A | | |

# ENV-Dependent Behavior

- [ ] Tested with flag on / off / missing / invalid (per `docs/BACKEND-TESTING-STRATEGY.md` §6)
- [ ] N/A — change does not depend on ENV flags

# Developer Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my code
- [ ] I have updated documentation (OpenAPI, architecture docs)
- [ ] `yarn typecheck` passes
- [ ] `yarn test:unit` passes
- [ ] New tests follow standard structure (`tests/unit/`, `tests/e2e/`, etc.)
- [ ] Test data is created and cleaned up automatically (no manual seeding)
- [ ] My changes generate no new warnings

# Review Checklist

- [ ] Separation of concerns followed
- [ ] Code is in sync with existing patterns
- [ ] Are there any obvious performance optimizations?
- [ ] Are all data inputs validated (type, length, format, range)?
- [ ] Is error handling done correctly?
- [ ] Are edge cases (null, 0, negative, missing) handled?
