// 合并前端两类覆盖率（均为 istanbul 格式）并输出总量与缺口清单：
//   coverage-e2e/coverage-final.json    —— Playwright E2E（nyc 插桩）
//   coverage-vitest/coverage-final.json —— Vitest 单元测试（函数层）
// 用法：node scripts/merge-coverage.mjs [--top N]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import libCoverage from 'istanbul-lib-coverage'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sources = [
  resolve(root, 'coverage/coverage-final.json'),
  resolve(root, 'coverage-vitest/coverage-final.json'),
]
const merged = libCoverage.createCoverageMap({})
for (const file of sources) {
  if (!existsSync(file)) {
    console.warn(`[merge-coverage] 缺少 ${file}，跳过（先跑对应覆盖命令）`)
    continue
  }
  const data = JSON.parse(readFileSync(file, 'utf8'))
  // 路径键归一化：绝对化 + 统一正斜杠。注意 istanbul 合并按 FileCoverage 内部 path 匹配，
  // 因此键与对象内部的 path 字段都要改写，否则同文件裂成两条无法并集。
  const norm = {}
  for (const key of Object.keys(data)) {
    // 测试文件不计入口径（nyc 的 node 进程转储会把 *.test.js 语句图混进来，分母虚高）
    if (/\.test\.(js|ts|jsx|tsx)$/.test(key)) continue
    const abs = /^[A-Za-z]:[\\/]/.test(key) ? key : resolve(root, key)
    const flat = abs.split('\\').join('/')
    norm[flat] = { ...data[key], path: flat }
  }
  merged.merge(norm)
}
if (merged.files().length === 0) {
  console.error('[merge-coverage] 无任何覆盖数据')
  process.exit(1)
}
const total = merged.getCoverageSummary()
const pct = (v) => `${v.pct.toFixed(2)}%`
console.log('==== 前端合并覆盖率（E2E ∪ 单元测试）====')
for (const key of ['statements', 'branches', 'functions', 'lines']) {
  console.log(`${key.padEnd(11)} ${pct(total[key])}  (${total[key].covered}/${total[key].total})`)
}
const outDir = resolve(root, 'coverage-merged')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'coverage-final.json')
writeFileSync(outPath, JSON.stringify(merged.toJSON(), null, 2))
console.log(`已写出合并明细: ${outPath}`)

// 缺口清单：按未覆盖语句数排序
const topN = Number(process.argv.includes('--top') ? process.argv[process.argv.indexOf('--top') + 1] : 15)
const rows = merged
  .files()
  .map((f) => {
    const s = merged.fileCoverageFor(f).toSummary()
    return {
      file: f.replace(root + '\\', '').replace(root + '/', ''),
      miss: s.statements.total - s.statements.covered,
      total: s.statements.total,
    }
  })
  .filter((r) => r.miss > 0)
  .sort((a, b) => b.miss - a.miss)
console.log(`\n未覆盖语句 Top ${Math.min(topN, rows.length)}：`)
for (const r of rows.slice(0, topN)) {
  console.log(`  ${String(r.miss).padStart(5)}/${String(r.total).padStart(5)}  ${r.file}`)
}
