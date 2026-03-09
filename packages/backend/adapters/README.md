# Custom adapters

Adapters are organized **by type** in subfolders. Each subfolder contains examples and documentation for that adapter type.

| Subfolder | Purpose |
|-----------|---------|
| **phone/** | Phone verification (OTP) — custom SMS gateways when `PHONE_VERIFICATION_PROVIDER=custom`. |

Future adapter types (e.g. email, notifications) can get their own subfolders here.

---

## Phone verification

- **Quick start:** [adapters/phone/README.md](phone/README.md)
- **Adapter:** Edit `phone/example-phone-adapter.js` (implement `sendOTP`), then set `VERIFICATION_PHONE_ADAPTER_PATH=./adapters/phone/example-phone-adapter.js` in `.env`.
