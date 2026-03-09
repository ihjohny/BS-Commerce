# Custom phone verification adapter

Use a **custom phone adapter** when you want to send OTP via your own SMS gateway (e.g. Vonage, AWS SNS, a local Bangladesh gateway, or an in-house API) instead of the built-in **Twilio** or **SSL Wireless** options.

---

## 1. Interface

Your adapter module must export an object with a single method:

| Method     | Signature                                                                 | Description                                        |
|-----------|----------------------------------------------------------------------------|----------------------------------------------------|
| `sendOTP` | `(phone: string, code: string, expirySeconds: number) => Promise<boolean>` | Send the OTP to `phone`. Return `true` on success. |

- **phone** — Phone number (E.164 recommended, e.g. `+8801712345678`).
- **code** — One-time code (e.g. 6 digits).
- **expirySeconds** — Code validity in seconds; you can use this in the message text.

Export as **default** or **named** export. CommonJS and ESM are both supported.

**Minimal example:**

```js
async function sendOTP(phone, code, expirySeconds) {
  // Call your SMS API
  return true
}
module.exports = { sendOTP }
module.exports.default = { sendOTP }
```

---

## 2. Configuration

In `.env`:

```env
PHONE_VERIFICATION_PROVIDER=custom
VERIFICATION_PHONE_ADAPTER_PATH=./adapters/phone/example-phone-adapter.js
```

**VERIFICATION_PHONE_ADAPTER_PATH** is relative to the process current working directory (when running `yarn dev` from `packages/backend`, cwd is usually `packages/backend`).

If the path is missing or the module fails to load, the plugin falls back to the **console** adapter (OTP only logged).

---

## 3. In-repo adapter (edit directly)

The file **`example-phone-adapter.js`** in this folder is the template. Edit it directly:

1. Implement `sendOTP` with your SMS gateway (replace the log-only stub).
2. Use `process.env` for API keys (do not commit secrets).
3. Set `VERIFICATION_PHONE_ADAPTER_PATH=./adapters/phone/example-phone-adapter.js` in `.env` (or your own filename if you rename/copy).
4. Restart the backend (adapter is loaded once and cached).

Keeping this file minimal and abstract makes it easy to fork the repo and implement your gateway in one place.

---

## 4. Complex logic and custom dependencies

**Multiple files:** The adapter can `require()` or `import` other files (e.g. `./gateway-client.js`) in this folder. Node resolves relative imports from the adapter file’s location, so you can split logic across `adapters/phone/` as needed.

**npm dependencies:** When the loaded module uses `require('some-package')` or `import 'some-package'`, Node resolves from the **main backend package** (the process that loaded the adapter). So:

- **Option A — deps in backend:** Add any adapter-specific packages to `packages/backend/package.json` and use them in your adapter. Simple and fine for one custom adapter.
- **Option B — separate package:** For a fully self-contained adapter (e.g. reusable across projects), implement it as its own npm package with its own `package.json` and dependencies. Publish or link it, install in the backend (`yarn add ./packages/my-phone-adapter` or similar), then set `VERIFICATION_PHONE_ADAPTER_PATH` to that package’s entry file (e.g. `./node_modules/my-phone-adapter/dist/index.js` or a path under `packages/` if using a monorepo).

So: the in-repo file stays a thin, abstract stub; you can grow it with local files and backend-installed deps, or move to a separate package if you need isolated dependencies.

---

## 5. File layout (this repo)

```
packages/backend/
├── adapters/
│   ├── README.md
│   └── phone/
│       ├── README.md       ← This file
│       └── example-phone-adapter.js   ← Edit this; point VERIFICATION_PHONE_ADAPTER_PATH here
├── src/
│   └── ...
└── .env
```

---

## 6. Testing

- **Console only:** Keep the stub (log only). Set `PHONE_VERIFICATION_PROVIDER=custom` and `VERIFICATION_PHONE_ADAPTER_PATH=./adapters/phone/example-phone-adapter.js`. Trigger send-verification; OTP appears in the server log.
- **Real gateway:** Implement `sendOTP`, then use `POST /api/auth/send-verification` (identifierType: phone) and `POST /api/auth/verify-phone` (code, phone).

---

## 7. Implementation reference

- **Custom loader:** `src/plugins/verification/adapters/get-phone-adapter.ts` (loads and caches the module; fallback to console on error).
