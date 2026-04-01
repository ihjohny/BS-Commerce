#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const backendRoot = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const logsDir = path.join(backendRoot, 'tests', 'logs')
fs.mkdirSync(logsDir, { recursive: true })
const liveChildren = new Set()

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function yarnCommand() {
  if (process.platform === 'win32') return { command: 'cmd', baseArgs: ['/c', 'yarn'] }
  return { command: 'yarn', baseArgs: [] }
}

function runSlot(slot, profileArg = '') {
  const ts = stamp()
  const logPath = path.join(logsDir, `e2e-slot${slot}-${ts}.log`)
  const stream = fs.createWriteStream(logPath, { flags: 'a' })
  const { command, baseArgs } = yarnCommand()
  const args = [...baseArgs, 'test:e2e:safe', ...(profileArg ? ['--profile', profileArg] : [])]
  const env = { ...process.env, E2E_PARALLEL_SLOT: String(slot) }
  const child = spawn(command, args, { cwd: backendRoot, env, stdio: ['ignore', 'pipe', 'pipe'] })
  liveChildren.add(child)

  const prefix = `[slot-${slot}] `
  const prefixChunk = (text) => prefix + text.replace(/\n/g, `\n${prefix}`).replace(/ \n$/, '\n')
  child.stdout.on('data', (chunk) => {
    process.stdout.write(prefixChunk(chunk.toString()))
    stream.write(chunk)
  })
  child.stderr.on('data', (chunk) => {
    process.stderr.write(prefixChunk(chunk.toString()))
    stream.write(chunk)
  })

  stream.write(`\n[runner] slot=${slot} profile=${profileArg || 'default'} started=${new Date().toISOString()}\n`)
  console.log(`[runner] slot ${slot} log -> ${path.relative(backendRoot, logPath)}`)

  return { child, logPath, slot, stream }
}

function waitExit(proc) {
  return new Promise((resolve) => {
    proc.child.on('close', (code) => {
      liveChildren.delete(proc.child)
      proc.stream.write(`\n[runner] slot=${proc.slot} exited code=${code}\n`)
      proc.stream.end()
      resolve({ slot: proc.slot, code: code ?? 1, logPath: proc.logPath })
    })
  })
}

async function main() {
  const profileAIdx = process.argv.indexOf('--profile-a')
  const profileBIdx = process.argv.indexOf('--profile-b')
  const profileA = profileAIdx >= 0 ? process.argv[profileAIdx + 1] || '' : ''
  const profileB = profileBIdx >= 0 ? process.argv[profileBIdx + 1] || ''
    : ''

  console.log('[runner] starting parallel safe E2E: slots 0 and 1')
  const a = runSlot(0, profileA)
  const b = runSlot(1, profileB)
  const results = await Promise.all([waitExit(a), waitExit(b)])

  const failed = results.filter((r) => r.code !== 0)
  if (failed.length) {
    for (const f of failed) {
      console.error(`[runner] slot ${f.slot} failed (exit ${f.code}) log=${path.relative(backendRoot, f.logPath)}`)
    }
    process.exit(1)
  }

  console.log('[runner] both slots completed successfully')
}

function terminateChildren(reason) {
  if (liveChildren.size === 0) return
  console.error(`[runner] stopping child processes (${reason})`)
  for (const child of liveChildren) {
    if (child.exitCode != null) continue
    try {
      if (process.platform === 'win32') {
        // Ensure child tree is terminated on Windows.
        spawn('cmd', ['/c', `taskkill /PID ${child.pid} /T /F`], { stdio: 'ignore' })
      } else {
        child.kill('SIGTERM')
      }
    } catch {
      // Best effort shutdown.
    }
  }
}

process.on('SIGINT', () => {
  terminateChildren('SIGINT')
  process.exit(130)
})
process.on('SIGTERM', () => {
  terminateChildren('SIGTERM')
  process.exit(143)
})
process.on('uncaughtException', (err) => {
  console.error(`[runner] uncaught exception: ${err instanceof Error ? err.message : String(err)}`)
  terminateChildren('uncaughtException')
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error(`[runner] unhandled rejection: ${String(reason)}`)
  terminateChildren('unhandledRejection')
  process.exit(1)
})

main().catch((err) => {
  console.error(`[runner] fatal: ${err instanceof Error ? err.message : String(err)}`)
  terminateChildren('fatal')
  process.exit(1)
})
