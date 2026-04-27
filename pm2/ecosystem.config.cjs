/**
 * PM2: Payload / Next API only (@bs-commerce/backend)
 *
 * Install: npm i -g pm2
 * From this repo (BS-Commerce/):
 *   yarn build
 *   Ensure packages/backend/.env exists (DATABASE_URI, etc.)
 *   pm2 start pm2/ecosystem.config.cjs
 *   pm2 logs bs-api
 *   pm2 restart bs-api
 *
 * If you previously used `script: "yarn"` on Windows, old YARN.CMD / SyntaxError lines may
 * still be in ~/.pm2/logs/bs-api-error.log (PM2 appends). Run `pm2 flush` once, or delete
 * that file, so `pm2 logs` is not confusing.
 *
 * PORT and MULTIVENDOR_ENABLED: set in packages/backend/.env (or override below).
 */
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const backendCwd = path.join(repoRoot, "packages", "backend");
// PM2 on Windows cannot use yarn.cmd / npm as `script` (Node tries to parse the batch file).
// Call the Next CLI entrypoint (same as `yarn start` → `next start`).
const nextCli = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");

module.exports = {
  apps: [
    {
      name: "bs-api",
      cwd: backendCwd,
      script: nextCli,
      interpreter: "node",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
