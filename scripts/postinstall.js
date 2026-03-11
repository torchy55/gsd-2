#!/usr/bin/env node
import { execSync } from 'child_process'
import os from 'os'

const args = os.platform() === 'linux' ? '--with-deps' : ''
try {
  execSync(`npx playwright install chromium ${args}`, { stdio: 'inherit' })
} catch {
  // Non-fatal — browser tools will show a clear error if playwright is missing
}
