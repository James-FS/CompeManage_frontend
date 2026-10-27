// 合并前端多源覆盖率（istanbul 格式）并输出总量与缺口清单：
//   coverage/coverage-final.json        —— Playwright E2E（nyc report，sourcemap 重映射口径=历史基准）
//   coverage-vitest/coverage-final.json —— Vitest 单元/组件测试
//   .nyc_output/*.json                  —— E2E 原始 dump（修复 report 个别文件丢计数，如 router/index.js）
// 合并语义：**行锚定折算**——各源语句图规模可能不同（插桩器/重映射差异），按"源语句命中行集合"
// 投影到基准（E2E report）语句图上取 max，避免语句图并集膨胀（曾膨胀 5473→7811）。
// 用法：node scripts/merge-coverage.mjs [--top N]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import libCoverage from 'istanbul-lib-coverage'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const normalize = (data) => {
  const norm = {}
  for (const key of Object.keys(data)) {
    // 测试文件不计入口径（nyc 的 node 进程转储会把 *.test.js 语句图混进来，分母虚高）
    if (/\.test\.(js|ts|jsx|tsx)$/.test(key)) continue
    const abs = /^[A-Za-z]:[\\/]/.test(key) ? key : resolve(root, key)
    const flat = abs.split('\\').join('/')
    norm[flat] = { ...data[key], path: flat }
  }
  return norm
}

const loadJson = (p) => normalize(JSON.parse(readFileSync(p, 'utf8')))

// 行锚定折算：把 src 的命中投影到 target（基准）语句图
const foldInto = (target, src) => {
  const t = target.data || target
  const s = src.data || src
  const hitLines = new Set()
  for (const [id, count] of Object.entries(s.s || {})) {
    const loc = s.statementMap?.[id]
    if (loc && count > 0) hitLines.add(loc.start.line)
  }
  for (const [id, count] of Object.entries(t.s || {})) {
    const loc = t.statementMap?.[id]
    if (loc && hitLines.has(loc.start.line)) t.s[id] = Math.max(count, 1)
  }
  const fnLines = new Set()
  for (const [id, count] of Object.entries(s.f || {})) {
    const fn = s.fnMap?.[id]
    if (fn && count > 0) fnLines.add(fn.decl?.start?.line ?? fn.loc?.start?.line)
  }
  for (const [id, count] of Object.entries(t.f || {})) {
    const fn = t.fnMap?.[id]
    if (!fn) continue
    const line = fn.decl?.start?.line ?? fn.loc?.start?.line
    if (fnLines.has(line)) t.f[id] = Math.max(count, 1)
  }
  const brLines = new Set()
  for (const [id, counts] of Object.entries(s.b || {})) {
    const br = s.branchMap?.[id]
    if (br && (counts || []).some((c) => c > 0)) brLines.add(br.loc?.start?.line)
  }
  for (const [id, counts] of Object.entries(t.b || {})) {
    const br = t.branchMap?.[id]
    if (!br) continue
    if (brLines.has(br.loc?.start?.line)) t.b[id] = (counts || []).map((c) => Math.max(c, 1))
  }
}

const merged = libCoverage.createCoverageMap({})

// —— 基准：E2E report（历史口径）——
const e2eReport = resolve(root, 'coverage/coverage-final.json')
if (existsSync(e2eReport)) {
  merged.merge(loadJson(e2eReport))
} else {
  console.warn(`[merge-coverage] 缺少 ${e2eReport}`)
}

// —— Vitest：折算进基准；新文件直接并入 ——
const vitestPath = resolve(root, 'coverage-vitest/coverage-final.json')
if (existsSync(vitestPath)) {
  const norm = loadJson(vitestPath)
  for (const flat of Object.keys(norm)) {
    if (merged.files().includes(flat)) foldInto(merged.fileCoverageFor(flat), norm[flat])
    else merged.addFileCoverage(norm[flat])
  }
}

// —— E2E 原始 dump：修复 report 丢计数（router/index.js 实证 0/82 vs dump 66/82）——
const dumpDir = resolve(root, '.nyc_output')
if (existsSync(dumpDir)) {
  const union = {}
  for (const f of readdirSync(dumpDir).filter((x) => x.endsWith('.json'))) {
    try {
      const norm = loadJson(resolve(dumpDir, f))
      for (const flat of Object.keys(norm)) {
        if (!union[flat]) union[flat] = norm[flat]
        else {
          const u = union[flat]
          for (const [id, count] of Object.entries(norm[flat].s || {})) u.s[id] = Math.max(u.s[id] || 0, count)
        }
      }
    } catch {
      /* 坏 dump 跳过 */
    }
  }
  for (const flat of merged.files()) {
    const cur = merged.fileCoverageFor(flat)
    const cs = cur.toSummary()
    if (cs.statements.covered > 0) continue
    const dump = union[flat]
    if (!dump) continue
    const hit = Object.values(dump.s || {}).some((v) => v > 0)
    if (!hit) continue
    const before = cs.statements.covered
    foldInto(cur, dump)
    const after = cur.toSummary().statements.covered
    if (after > before) {
      console.log(`[merge-coverage] 修复 report 丢计数: ${flat.split('/').slice(-2).join('/')} (+${after - before})`)
    }
  }
}

if (merged.files().length === 0) {
  console.error('[merge-coverage] 无任何覆盖数据')
  process.exit(1)
}
const total = merged.getCoverageSummary()
const pct = (v) => `${v.pct.toFixed(2)}%`
console.log('==== 前端合并覆盖率（E2E ∪ 单元/组件测试，行锚定折算）====')
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
