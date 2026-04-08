import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function parseEnvFile(filePath) {
  const parsed = {}
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    parsed[key] = value
  }
  return parsed
}

function normalizeHostOverrides(env) {
  const next = { ...env }

  if (next.DATABASE_URI?.includes('host.docker.internal')) {
    next.DATABASE_URI = next.DATABASE_URI.replace('host.docker.internal', 'localhost')
  }

  if (typeof next.REDIS_URL === 'string') {
    if (next.REDIS_URL.includes('redis-sv:6379')) {
      next.REDIS_URL = 'redis://localhost:6379'
    } else if (next.REDIS_URL.includes('redis-mv:6379')) {
      next.REDIS_URL = 'redis://localhost:6380'
    } else if (next.REDIS_URL.includes('host.docker.internal')) {
      next.REDIS_URL = next.REDIS_URL.replace('host.docker.internal', 'localhost')
    }
  }

  next.NODE_ENV = 'development'
  return next
}

const [, , envFileArg, portArg] = process.argv

if (!envFileArg || !portArg) {
  console.error('Usage: node scripts/run-backend-host.mjs <env-file-path> <port>')
  process.exit(1)
}

const envFilePath = path.resolve(process.cwd(), envFileArg)
if (!fs.existsSync(envFilePath)) {
  console.error(`Env file not found: ${envFilePath}`)
  process.exit(1)
}

const fileEnv = parseEnvFile(envFilePath)
const mergedEnv = normalizeHostOverrides({ ...process.env, ...fileEnv })
const yarnCmd = 'yarn'

console.log(`Starting backend on port ${portArg} using env: ${envFilePath}`)

const child = spawn(
  yarnCmd,
  ['workspace', '@bs-commerce/backend', 'dev', '--', '-p', String(portArg)],
  {
    stdio: 'inherit',
    env: mergedEnv,
    shell: process.platform === 'win32',
  },
)

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
