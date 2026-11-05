/**
 * 多学院测试共享状态：globalSetup 写入，spec 读取。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const STATE_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '.multi-college-state.json')

export function writeState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

export function readState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  } catch {
    return {}
  }
}
