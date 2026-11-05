<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Download, UploadFilled, Delete, Plus, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage, ElDialog } from 'element-plus'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import api from '@/api'
import { post } from '@/utils/request'
const route = useRoute()
const isUnified = computed(() => route.name === 'AwardUnifiedImport')
const compID = computed(() => route.params.id)
const previewValidated = ref(false)
const validationFailed = ref(false)
let draftVersion = 0
let detailOpenedVersion = 0
const onlyErrors = ref(false)
const detailVisible = ref(false)
const detailKeys = ref(null)
const detailProblemKeys = ref(new Set())
const detailName = ref('全部赛事')
const summaryPage = ref(1)
const summarySize = ref(20)
const requireRegistration = ref(false)
const importYear = ref(Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Hong_Kong', year: 'numeric' }).format(new Date())))
const competitionName = ref('')
const loading = ref(false)
const loadingText = ref('')
const tableData = ref([])
const fileName = ref('')
const collegeList = ref([])
const advisorDialogVisible = ref(false)
const advisorLoading = ref(false)
const advisorCandidates = ref([])
const advisorSearch = ref('')
const advisorPage = ref(1)
const advisorPageSize = ref(10)
const advisorTotal = ref(0)
const activeAdvisorRow = ref(null)
const advisorNameMap = ref({})
const advisorLookupPending = ref(false)
const advisorLookupFailed = ref(false)
let advisorSearchTimer = null
let advisorRequestId = 0
const validationErrors = computed(() => tableData.value.filter(row => row.error))
const validationErrorCount = computed(() => validationErrors.value.length)
const validationDialogVisible = ref(false)
const validationReport = ref([])
const validationStage = ref('local')
const validationSourceFile = ref('')
const validationStats = ref({ success: 0, existing: 0 })
const reportPage = ref(1)
const reportPageSize = ref(50)
const reportErrors = computed(() => validationReport.value.filter(row => row.error))
const reportPageRows = computed(() => reportErrors.value.slice((reportPage.value - 1) * reportPageSize.value, reportPage.value * reportPageSize.value))
const saveValidationReport = (stage, rows = tableData.value, counts = {}) => {
  validationReport.value = rows.map((row, index) => ({ ...row, sequence: row.sequence ?? index + 1 }))
  validationStats.value = { success: counts.success_count || 0, existing: counts.existing_count || 0 }
  validationStage.value = stage
  validationSourceFile.value = fileName.value
  reportPage.value = 1
}
const validationSummary = computed(() => validationStage.value === 'server'
  ? `本次导入 ${validationReport.value.length} 行，其中 ${reportErrors.value.length} 行校验失败，${validationStats.value.success} 行成功导入${validationStats.value.existing ? `，${validationStats.value.existing} 行已存在或重复，已跳过` : ''}。`
  : `本次${validationStage.value === 'preview' ? '校验' : '读取'} ${validationReport.value.length} 行，其中 ${reportErrors.value.length} 行${validationStage.value === 'preview' ? '' : '基础'}校验失败，尚未提交导入。`)
const openValidationReport = () => {
  if (isUnified.value) { openDetails(null, true); return }
  reportPage.value = 1
  validationDialogVisible.value = true
}
watch(reportPageSize, () => { reportPage.value = 1 })
const currentPage = ref(1)
const pageSize = ref(50)
const sourceCompetitionKey = row => JSON.stringify([row.comp_name || ''])
const competitionKey = row => row.match_status === 'matched' ? `id:${row.comp_id}` : sourceCompetitionKey(row)
const filteredRows = computed(() => tableData.value.filter(row =>
  (!isUnified.value || !detailKeys.value || detailKeys.value.has(row._rowKey)) && (!onlyErrors.value || row.error || (isUnified.value && detailProblemKeys.value.has(row._rowKey)))))
const pageRows = computed(() => filteredRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
let nextRowKey = 0
const identifyRows = rows => rows.map(row => ({ ...row, _rowKey: ++nextRowKey }))
const pendingRows = computed(() => tableData.value.filter(row => !['imported', 'existing'].includes(row.import_status)))
const markRowChanged = (row, key) => {
  draftVersion++
  previewValidated.value = false
  row.error = ''
  row.existing = false
  row.duplicate = false
  row.import_status = ''
  if (isUnified.value && key === 'comp_name') {
    delete row.comp_id
    delete row.competition
    delete row.candidates
    delete row.match_status
    }
}
const readyCount = computed(() => pendingRows.value.filter(row => !row.error && !row.existing && !row.duplicate && row.match_status === 'matched').length)
const processableCount = computed(() => pendingRows.value.filter(row => !row.error && row.match_status === 'matched').length)
const competitionSummaries = computed(() => {
  const groups = new Map()
  for (const row of tableData.value) {
    const key = competitionKey(row)
    if (!groups.has(key)) groups.set(key, { key, comp_name: row.comp_name, comp_year: row.comp_year, comp_code: row.competition?.comp_code || row.comp_code, match_status: row.match_status, candidates: row.candidates || [], total: 0, ready: 0, success: 0, existing: 0, failed: 0 })
    const group = groups.get(key)
    group.total++
    if (row.error) group.failed++
    else if (row.import_status === 'imported') group.success++
    else if (row.import_status === 'existing' || row.existing || row.duplicate) group.existing++
    else if (row.match_status === 'matched' && previewValidated.value) group.ready++
  }
  return [...groups.values()]
})
const summaryRows = computed(() => competitionSummaries.value.slice((summaryPage.value - 1) * summarySize.value, summaryPage.value * summarySize.value))
watch([() => competitionSummaries.value.length, summarySize], () => {
  summaryPage.value = Math.max(1, Math.min(summaryPage.value, Math.ceil(competitionSummaries.value.length / summarySize.value)))
})
const openDetails = (group = null, errors = false) => {
  detailKeys.value = group ? new Set(tableData.value.filter(row => competitionKey(row) === group.key).map(row => row._rowKey)) : null
  detailName.value = group?.comp_name || '全部赛事'
  detailProblemKeys.value = new Set(tableData.value.filter(row => row.error && (!detailKeys.value || detailKeys.value.has(row._rowKey))).map(row => row._rowKey))
  onlyErrors.value = errors
  currentPage.value = 1
  detailOpenedVersion = draftVersion
  detailVisible.value = true
}
const closeDetails = () => { detailVisible.value = false; advisorDialogVisible.value = false }
watch(detailVisible, (visible, wasVisible) => {
  if (!visible && wasVisible) {
    advisorDialogVisible.value = false
    if (isUnified.value && draftVersion !== detailOpenedVersion && !previewValidated.value && !loading.value) void previewImport()
  }
})
const duplicateCount = computed(() => tableData.value.filter(row => !row.error && (row.existing || row.duplicate || row.import_status === 'existing')).length)
const pendingDuplicateCount = computed(() => pendingRows.value.filter(row => !row.error && (row.existing || row.duplicate)).length)
const unifiedImportButtonText = computed(() => {
  if (!tableData.value.length) return fileName.value ? '文件中没有可导入的数据' : '请先上传 Excel 文件'
  if (!pendingRows.value.length) return '本批数据已处理完成'
  if (!previewValidated.value) return validationFailed.value ? '校验失败，请重试' : '请先匹配赛事并校验'
  if (readyCount.value > 0) return `导入可新增的 ${readyCount.value} 行`
  if (pendingDuplicateCount.value > 0) return `确认跳过 ${pendingDuplicateCount.value} 条重复记录`
  return '暂无可导入数据'
})
const canSubmitUnifiedImport = computed(() => !loading.value
  && previewValidated.value
  && pendingRows.value.length > 0
  && processableCount.value > 0
  && (readyCount.value > 0 || pendingDuplicateCount.value > 0))
const chooseCompetition = (group, id) => {
  const selected = group.candidates.find(comp => comp.id === id)
  if (!selected) return
  for (const row of pendingRows.value) {
    if (competitionKey(row) !== group.key) continue
    row.comp_name = selected.comp_name
    row.comp_id = selected.id
    delete row.match_status
    delete row.competition
    delete row.candidates
    markRowChanged(row)
  }
  void previewImport()
}
const importState = row => {
  if (row.import_status === 'imported') return { label: '导入成功', type: 'success' }
  if (row.import_status === 'existing') return { label: row.duplicate ? '重复，已跳过' : '已存在，已跳过', type: 'info' }
  if (row.import_status === 'failed') return { label: '导入失败', type: 'danger' }
  if (isUnified.value && previewValidated.value && !row.error) {
    if (row.existing || row.duplicate) return { label: '重复，将跳过', type: 'info' }
    return { label: '可导入', type: 'success' }
  }
  return { label: row.error ? '待修正' : '待导入', type: row.error ? 'warning' : 'info' }
}
const mergeImportResults = (rows, submitted) => {
  const positions = new Map(tableData.value.map((row, index) => [row._rowKey, index + 1]))
  const resultRows = rows.map((row, index) => ({ ...row, _rowKey: submitted[index]._rowKey, sequence: positions.get(submitted[index]._rowKey) }))
  const updates = new Map(resultRows.map(row => [row._rowKey, row]))
  tableData.value = tableData.value.map(row => updates.get(row._rowKey) || row)
  return resultRows
}
watch([() => filteredRows.value.length, pageSize], () => {
  currentPage.value = Math.max(1, Math.min(currentPage.value, Math.ceil(filteredRows.value.length / pageSize.value)))
})
const removeRow = row => {
  draftVersion++
  const index = tableData.value.findIndex(item => item._rowKey === row._rowKey)
  if (index >= 0) tableData.value.splice(index, 1)
  previewValidated.value = false
}
const showErrorRow = row => {
  onlyErrors.value = false
  const index = tableData.value.findIndex(item => item._rowKey === row._rowKey)
  if (index >= 0) currentPage.value = Math.floor(index / pageSize.value) + 1
}
const locateReportRow = row => {
  if (!tableData.value.some(item => item._rowKey === row._rowKey)) {
    ElMessage.info('该行已从预览中删除，请重新提交以更新校验结果')
    return
  }
  showErrorRow(row)
  validationDialogVisible.value = false
}
const clearRows = () => {
  draftVersion++
  validationFailed.value = false
  closeDetails()
  detailKeys.value = null
  summaryPage.value = 1
  tableData.value = []
  fileName.value = ''
  currentPage.value = 1
  validationReport.value = []
  validationDialogVisible.value = false
  previewValidated.value = false
  onlyErrors.value = false
}
const baseColumns = [
  { key: 'student_id', label: '学号', width: 160 },
  { key: 'name', label: '学生姓名', width: 120 },
  { key: 'college', label: '所属学院', width: 220 },
  { key: 'major', label: '所在专业', width: 200 },
  { key: 'project_name', label: '参赛项目名称', width: 260 },
  { key: 'award_month', label: '获奖时间', excelHeader: '获奖时间（年/月）', width: 140 },
  { key: 'award_category', label: '获奖类别', width: 130 },
  { key: 'award_name', label: '获奖等级', width: 140 },
  { key: 'remark', label: '备注', width: 140 },
]
const columns = computed(() => isUnified.value ? [
  { key: 'comp_name', label: '赛事名称', width: 260 },
  ...baseColumns,
] : baseColumns)
const categories = ['校赛', '国家级', '省级', '国际级']
const awardLevels = ['一等奖', '二等奖', '三等奖']
const advisorRoleLabels = {
  teacher: '教师',
  competition_manager: '赛事负责人',
  expert: '专家',
  college_admin: '院负责人',
  school_admin: '校负责人',
}
const splitAdvisorUsernames = value => String(value || '').split(/[\s,，、;；|]+/).filter(Boolean)
const selectedAdvisorsForRow = row => splitAdvisorUsernames(row.advisor_usernames).map(username => ({
  username,
  name: advisorNameMap.value[username]?.name || '',
}))
const loadAdvisorNameCache = async rows => {
  const usernames = [...new Set(rows.flatMap(row => splitAdvisorUsernames(row.advisor_usernames)))].filter(username => !advisorNameMap.value[username])
  if (!usernames.length) return
  const started = performance.now()
  const batches = []
  for (let index = 0; index < usernames.length; index += 500) batches.push(usernames.slice(index, index + 500))
  advisorLookupPending.value = true
  advisorLookupFailed.value = false
  const resolved = {}
  let failed = false
  const worker = async () => {
    while (batches.length) {
      const batch = batches.shift()
      try {
        const res = await api.lookupAwardAdvisors(batch)
        for (const user of res.data?.list || []) resolved[user.username] = user
      } catch {
        failed = true
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, batches.length) }, worker))
  advisorNameMap.value = Object.assign(advisorNameMap.value, resolved)
  advisorLookupFailed.value = failed
  advisorLookupPending.value = false
  console.info('[award-import] advisor lookup', { count: usernames.length, duration_ms: Math.round(performance.now() - started), failed })
}
const advisorDisplayName = advisor => advisor.name
  ? `${advisor.name}（${advisor.username}）`
  : advisor.username
const advisorRoleLabel = roleCode => advisorRoleLabels[roleCode] || '教师'
const isAdvisorSelected = user => splitAdvisorUsernames(activeAdvisorRow.value?.advisor_usernames).includes(user.username)
const openAdvisorPicker = row => {
  activeAdvisorRow.value = row
  advisorSearch.value = ''
  advisorPage.value = 1
  advisorCandidates.value = []
  advisorTotal.value = 0
  advisorDialogVisible.value = true
  fetchAdvisorCandidates()
}
const fetchAdvisorCandidates = async () => {
  const requestId = ++advisorRequestId
  advisorLoading.value = true
  try {
    const res = await api.getAwardAdvisorList({
      page: advisorPage.value,
      page_size: advisorPageSize.value,
      search: advisorSearch.value.trim(),
    })
    if (requestId !== advisorRequestId) return
    advisorCandidates.value = res.data?.list || []
    advisorTotal.value = res.data?.total || 0
    advisorNameMap.value = {
      ...advisorNameMap.value,
      ...Object.fromEntries(advisorCandidates.value.map(user => [user.username, user])),
    }
  } catch (error) {
    if (requestId === advisorRequestId) ElMessage.error(errorMessage(error))
  } finally {
    if (requestId === advisorRequestId) advisorLoading.value = false
  }
}
const onAdvisorSearch = () => {
  clearTimeout(advisorSearchTimer)
  advisorSearchTimer = setTimeout(() => {
    advisorPage.value = 1
    fetchAdvisorCandidates()
  }, 300)
}
const handleAdvisorPageChange = pageNumber => {
  advisorPage.value = pageNumber
  fetchAdvisorCandidates()
}
const handleAdvisorPageSizeChange = pageSizeValue => {
  advisorPageSize.value = pageSizeValue
  advisorPage.value = 1
  fetchAdvisorCandidates()
}
const addAdvisor = user => {
  const row = activeAdvisorRow.value
  if (!row) return
  const usernames = splitAdvisorUsernames(row.advisor_usernames)
  if (usernames.includes(user.username)) return
  usernames.push(user.username)
  row.advisor_usernames = usernames.join(' ')
  row.advisor_colleges = ''
  advisorNameMap.value = { ...advisorNameMap.value, [user.username]: user }
  markRowChanged(row)
}
const removeAdvisor = (row, username) => {
  row.advisor_usernames = splitAdvisorUsernames(row.advisor_usernames).filter(value => value !== username).join(' ')
  row.advisor_colleges = ''
  markRowChanged(row)
}
const exportValidationReport = async () => {
  const failedRows = isUnified.value ? filteredRows.value.filter(row => row.error) : reportErrors.value
  if (!failedRows.length) {
    ElMessage.info('暂无校验失败记录可导出')
    return
  }
  const exportColumns = [
    { key: 'sequence', label: '序号', width: 7 },
    ...columns.value.filter(column => column.key !== 'remark').map(column => ({ ...column, label: column.excelHeader || column.label, width: Math.round(column.width / 7) })),
    { key: 'advisor_usernames', label: '指导教师工号', width: 24 },
    { key: 'remark', label: '备注', width: 14 },
    { key: 'error', label: '校验失败原因', width: 48 },
  ]
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('校验失败名单')
  sheet.columns = exportColumns.map(column => ({ header: column.label, width: column.width }))
  exportColumns.forEach((column, index) => {
    if (['student_id', 'award_month', 'advisor_usernames'].includes(column.key)) sheet.getColumn(index + 1).numFmt = '@'
  })
  failedRows.forEach(row => sheet.addRow(exportColumns.map(column => row[column.key] || '')))
  const cellBorder = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
  }
  sheet.eachRow(row => {
    const isHeader = row.number === 1
    const reason = isHeader ? '' : String(row.getCell(exportColumns.length).value || '')
    row.height = isHeader ? 42 : Math.max(34, Math.min(82, Math.ceil(reason.length / 32) * 18))
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: '宋体', size: isHeader ? 12 : 11, bold: isHeader, color: { argb: 'FF000000' } }
      cell.border = cellBorder
      cell.alignment = {
        horizontal: !isHeader && ['comp_name', 'project_name', 'error'].includes(exportColumns[cell.col - 1]?.key) ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      }
    })
  })
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: exportColumns.length } }
  const sourceName = (validationSourceFile.value || (isUnified.value ? '统一导入' : `赛事${compID.value}`)).replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_')
  try {
    saveAs(new Blob([await workbook.xlsx.writeBuffer()]), `${sourceName}_校验失败名单.xlsx`)
  } catch (error) {
    ElMessage.error(error.message || '导出失败')
  }
}
const normalizeAwardLevel = value => {
  const text = String(value || '').replace(/[\s\u3000（）()]/g, '')
  if (['一等奖', '一等', '冠军', '金奖', '特等奖'].some(label => text.includes(label))) return '一等奖'
  if (['二等奖', '二等', '亚军', '银奖'].some(label => text.includes(label))) return '二等奖'
  if (['三等奖', '三等', '季军', '铜奖'].some(label => text.includes(label))) return '三等奖'
  return ''
}
const addRow = () => {
  draftVersion++
  previewValidated.value = false
  onlyErrors.value = false
  tableData.value.push({ ...Object.fromEntries(columns.value.map(c => [c.key, ''])), advisor_usernames: '', advisor_colleges: '', _rowKey: ++nextRowKey })
  if (isUnified.value && detailKeys.value) {
    const row = tableData.value.at(-1)
    row.comp_name = detailName.value
    detailKeys.value.add(row._rowKey)
  }
  currentPage.value = Math.ceil(filteredRows.value.length / pageSize.value)
}
const errorMessage = error => error.response?.data?.message || error.message || '操作失败'
const loadColleges = async () => {
  try {
    const res = await api.getCollegeList()
    collegeList.value = res.data || []
  } catch (error) { ElMessage.error(errorMessage(error)) }
}
const loadCompetitionName = async () => {
  try {
    const res = await api.getCompetitionDetail(compID.value)
    competitionName.value = res.data?.comp_name || ''
  } catch (error) { ElMessage.error(errorMessage(error)) }
}
const downloadTemplate = async () => {
  try {
    const blob = isUnified.value ? await api.getUnifiedAwardTemplate() : await api.getAwardTemplate(compID.value)
    if (blob.type?.includes('application/json')) throw new Error(JSON.parse(await blob.text()).message || '下载模板失败')
    saveAs(blob, isUnified.value ? '统一获奖名单导入模板.xlsx' : '获奖名单导入模板.xlsx')
  }
  catch (error) { ElMessage.error(errorMessage(error)) }
}
const handleFileChange = async uploadFile => {
  if (!uploadFile?.raw || loading.value) return
  loadingText.value = '正在读取 Excel…'
  loading.value = true
  await nextTick()
  const started = performance.now()
  let parsed = false
  try {
    if (uploadFile.raw.size > 20 * 1024 * 1024) throw new Error('Excel 文件不能超过20MB')
    const readStarted = performance.now()
    const buffer = await uploadFile.raw.arrayBuffer()
    const readDuration = performance.now() - readStarted
    const parseStarted = performance.now()
    const workbook = XLSX.read(buffer, { type: 'array', sheets: [0] })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const usedRange = firstSheet?.['!ref'] ? XLSX.utils.decode_range(firstSheet['!ref']) : null
    if (usedRange && usedRange.e.r > 10000) throw new Error('Excel 数据区域超过10000行，请拆分后导入')
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false })
    const headers = (rows[0] || []).map(v => String(v).trim())
    const columnIndexes = Object.fromEntries(columns.value.map(column => [column.key, headers.indexOf(column.excelHeader || column.label)]))
    if (columnIndexes.award_month < 0) columnIndexes.award_month = headers.indexOf('获奖时间')
    if (columnIndexes.award_month < 0) columnIndexes.award_month = headers.indexOf('获奖时间（年/月/日）')
    const missing = columns.value.filter(c => c.key !== 'remark' && !c.optional && columnIndexes[c.key] < 0)
    if (missing.length) throw new Error(`缺少字段：${missing.map(c => c.label).join('、')}，请下载新版模板`)
    const data = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (String(row[0] || '').trim().startsWith('说明：')) break
      if (String(row[0] || '').trim() === '示例') continue
      const item = Object.fromEntries(columns.value.map(c => [c.key, String(row[columnIndexes[c.key]] || '').trim()]))
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.award_month)) item.award_month = item.award_month.slice(0, 7)
      const dottedMonth = /^(\d{4})\.(\d{1,2})$/.exec(item.award_month)
      if (dottedMonth) item.award_month = `${dottedMonth[1]}-${dottedMonth[2].padStart(2, '0')}`
      if (item.award_name) {
        const awardLevel = normalizeAwardLevel(item.award_name)
        if (awardLevel) item.award_name = awardLevel
        else item.error = `获奖等级“${item.award_name}”无法识别，请选择一等奖、二等奖或三等奖`
      }
      if (!Object.values(item).some(Boolean)) continue
      item.row_number = i + 1
      for (const [key, label] of [['advisor_usernames', '指导教师工号'], ['advisor_colleges', '指导教师所在学院']]) {
        item[key] = String(row[headers.indexOf(label)] || '').trim()
      }
      data.push(item)
    }
    if (data.length > 5000) throw new Error('每批最多导入5000行')
    draftVersion++
    validationFailed.value = false
    parsed = true
    tableData.value = identifyRows(data)
    closeDetails()
    detailKeys.value = null
    summaryPage.value = 1
    previewValidated.value = false
    onlyErrors.value = false
    currentPage.value = 1
    fileName.value = uploadFile.name
    validationDialogVisible.value = false
    if (validationErrorCount.value) saveValidationReport('local')
    else validationReport.value = []
    console.info('[award-import] file parsed', { duration_ms: Math.round(performance.now() - started), read_ms: Math.round(readDuration), parse_ms: Math.round(performance.now() - parseStarted), rows: data.length })
    void loadAdvisorNameCache(tableData.value)
    ElMessage.success(`已读取 ${data.length} 名学生数据`)
  } catch (error) { ElMessage.error(errorMessage(error)) }
  finally { loading.value = false }
  if (parsed && isUnified.value) await previewImport()
}
const unifiedPayload = rows => rows.map(({ _rowKey, sequence, comp_year, comp_code, competition, candidates, ...row }) => row)
const previewImport = async () => {
  if (loading.value || !pendingRows.value.length) return
  loading.value = true
  const version = draftVersion
  validationFailed.value = false
  loadingText.value = '正在自动匹配赛事并校验获奖数据…'
  previewValidated.value = false
  try {
    const submitted = pendingRows.value
    const res = await api.previewUnifiedAwards(unifiedPayload(submitted))
    if (version !== draftVersion || !isUnified.value) return
    if (!Array.isArray(res.data?.rows) || res.data.rows.length !== submitted.length) throw new Error('服务器未返回完整校验结果，请重新校验')
    const rows = mergeImportResults(res.data.rows, submitted)
    requireRegistration.value = res.data.require_registration
    importYear.value = res.data.import_year || importYear.value
    saveValidationReport('preview', rows, res.data)
    previewValidated.value = true
    ElMessage.success(`校验完成，${res.data.ready_count || 0} 行可新增，${res.data.existing_count || 0} 行重复，${res.data.fail_count || 0} 行失败`)
  } catch (error) {
    if (version === draftVersion && isUnified.value) {
      validationFailed.value = true
      ElMessage.error(errorMessage(error))
    }
  } finally { loading.value = false }
}
const submitImport = async () => {
  if (loading.value) return
  if (isUnified.value && !previewValidated.value) {
    ElMessage.warning('请等待自动校验完成；校验失败时可点击重试')
    return
  }
  if (!tableData.value.length) {
    ElMessage.warning('请先导入或新增数据')
    return
  }
  const submitted = pendingRows.value
  if (!submitted.length) {
    ElMessage.info('当前数据已处理完成，无需重复提交')
    return
  }
  loadingText.value = '正在校验并导入，请稍候…'
  loading.value = true
  const started = performance.now()
  try {
    const rows = isUnified.value ? unifiedPayload(submitted) : submitted.map(({ _rowKey, sequence, ...row }) => row)
    const res = isUnified.value ? await api.importUnifiedAwards(rows) : await post(`/api/award/import?comp_id=${compID.value}`, { rows }, { timeout: 120000, warningOnBadRequest: true })
    console.info('[award-import] submit completed', { duration_ms: Math.round(performance.now() - started), rows: submitted.length })
    if (!Array.isArray(res.data?.rows) || res.data.rows.length !== submitted.length) {
      ElMessage.warning('服务器未返回完整的导入状态，请刷新获奖列表核实本次结果')
      return
    }
    const resultRows = mergeImportResults(res.data.rows, submitted)
    saveValidationReport('server', resultRows, res.data)
    if (resultRows.some(row => row.error)) {
      openValidationReport()
      return
    }
    ElMessage.success(res.message || '导入成功')
  } catch (error) {
    const failedRows = error.response?.data?.data?.rows
    console.info('[award-import] submit failed', { duration_ms: Math.round(performance.now() - started), rows: submitted.length, status: error.response?.status || 'network' })
    if (Array.isArray(failedRows) && failedRows.length === submitted.length) {
      const resultRows = mergeImportResults(failedRows, submitted)
      saveValidationReport('server', resultRows)
      const firstError = resultRows.find(row => row.error)
      if (firstError) showErrorRow(firstError)
      openValidationReport()
    }
  } finally {
    loading.value = false
    if (isUnified.value) previewValidated.value = false
  }
}
onMounted(() => {
  if (!isUnified.value) loadCompetitionName()
  loadColleges()
})
watch(() => route.fullPath, () => {
  clearRows()
  competitionName.value = ''
  if (!isUnified.value) loadCompetitionName()
})
</script>
<template>
  <div class="import-page">
    <el-card class="toolbar-card" shadow="never">
      <template #header>
        <div class="page-title">
          <strong>{{ isUnified ? '统一导入获奖名单' : (competitionName || `赛事 ${compID}`) }}</strong>
          <span>{{ isUnified ? '一个 Excel 文件可填写多个赛事' : '获奖名单导入' }}</span>
        </div>
      </template>
      <div class="actions">
        <el-button type="primary" :icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-upload :auto-upload="false" :show-file-list="false" accept=".xlsx" :on-change="handleFileChange" :disabled="loading">
          <el-button type="success" :icon="UploadFilled" :disabled="loading">上传导入文件</el-button>
        </el-upload>
        <span>{{ fileName }}</span>
        <span v-if="isUnified">导入年份：{{ importYear }}年</span>
      </div>
    </el-card>
    <el-card v-if="isUnified" class="competition-summary-card" shadow="never">
      <div class="preview-header summary-preview-header">
        <div class="summary-header-left">
          <strong>赛事匹配与导入汇总（{{ competitionSummaries.length }} 组）</strong>
          <el-button type="primary" size="default" :disabled="loading || !tableData.length" @click="openDetails()">查看全部明细</el-button>
          <el-button type="danger" size="default" :disabled="loading || !validationErrorCount" @click="openDetails(null, true)">查看问题</el-button>
        </div>
        <span class="summary-counts">共 {{ tableData.length }} 条｜可新增 {{ previewValidated ? readyCount : pendingRows.length ? '待校验' : 0 }} 条｜重复 {{ duplicateCount }} 条｜待修正 {{ validationErrorCount }} 条</span>
      </div>
      <div v-if="loading || validationFailed" class="unified-actions">
        <span v-if="loading" role="status">{{ loadingText }}</span>
        <span v-else-if="validationFailed" class="validation-failure" role="status">自动校验失败，请重试。<el-button link type="primary" @click="previewImport">重试校验</el-button></span>
      </div>
      <el-table :data="summaryRows" border height="100%" class="competition-summary-table" v-loading="loading" :element-loading-text="loadingText" :header-cell-style="{ textAlign: 'center' }" :cell-style="{ textAlign: 'center' }">
        <template #empty>
          <el-empty
            :description="tableData.length ? '暂无可展示的赛事汇总' : '请先上传 Excel 文件导入数据'"
            :image-size="80"
          />
        </template>
        <el-table-column prop="comp_name" label="赛事名称" min-width="220" />
        <el-table-column label="匹配状态" width="140">
          <template #default="{ row }">
            <el-select v-if="row.match_status === 'ambiguous'" placeholder="请选择目标赛事" :disabled="loading" @change="id => chooseCompetition(row, id)">
              <el-option v-for="comp in row.candidates" :key="comp.id" :label="`${comp.comp_name}（系统编号${comp.comp_code}）`" :value="comp.id" />
            </el-select>
            <el-tag v-else :type="row.match_status === 'matched' ? 'success' : 'warning'">{{ row.match_status === 'matched' ? '已匹配' : row.match_status ? '未匹配' : '待校验' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="总行数" width="80" />
        <el-table-column prop="ready" label="可新增" width="80" />
        <el-table-column prop="success" label="已导入" width="80" />
        <el-table-column prop="existing" label="重复" width="70" />
        <el-table-column label="失败" width="70"><template #default="{ row }"><el-button v-if="row.failed" link type="danger" :disabled="loading" @click="openDetails(row, true)">{{ row.failed }}</el-button><span v-else>0</span></template></el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }"><el-button link type="primary" :disabled="loading" @click="openDetails(row)">查看明细</el-button></template>
        </el-table-column>
      </el-table>
      <div class="summary-table-footer">
        <el-pagination v-model:current-page="summaryPage" v-model:page-size="summarySize" :page-sizes="[20, 50, 100]" :total="competitionSummaries.length" :disabled="loading" layout="total, sizes, prev, pager, next" class="summary-pagination" />
        <el-button type="primary" :loading="loading" :disabled="!canSubmitUnifiedImport" @click="submitImport">
          {{ unifiedImportButtonText }}
        </el-button>
      </div>
    </el-card>
    <component :is="isUnified ? ElDialog : 'div'" :class="isUnified ? 'unified-detail-dialog' : 'preview-host'" v-bind="isUnified ? { modelValue: detailVisible, title: `导入数据预览｜${detailName}（${filteredRows.length} 条）`, width: 'min(1200px, 94vw)', alignCenter: true, appendToBody: true, destroyOnClose: true, closeOnClickModal: false, transition: { css: false } } : {}" @update:model-value="value => { if (isUnified) detailVisible = value }">
    <el-card class="preview-card" shadow="never">
      <template #header>
        <div class="preview-header">
          <span>{{ isUnified ? `导入数据预览（${filteredRows.length} 条）` : `导入数据预览（${tableData.length} 名学生）` }}</span>
          <div class="preview-header-actions">
            <el-button v-if="!isUnified && reportErrors.length" type="danger" plain :disabled="loading" @click="openValidationReport">查看校验结果</el-button>
            <el-button :icon="Plus" :disabled="loading" @click="addRow">新增一条</el-button>
          </div>
        </div>
      </template>
      <el-alert title="同一赛事内项目名称相同视为同一团队，获奖类别、等级和时间必须一致。国际级统一保存为国家级。" type="info" :closable="false" />
      <div v-if="isUnified" class="preview-controls">
        <el-checkbox v-model="onlyErrors" :disabled="loading" @change="currentPage = 1">只看失败行</el-checkbox>
        <el-button :disabled="loading || !filteredRows.some(row => row.error)" @click="exportValidationReport">导出失败名单（{{ filteredRows.filter(row => row.error).length }} 条）</el-button>
        <span>修改保留在本次草稿中，关闭弹窗后自动校验，再回主页面统一提交。</span>
        <span v-if="previewValidated">{{ requireRegistration ? '要求目标赛事审核通过的报名' : '当前允许免报名导入' }}</span>
      </div>
      <div v-if="advisorLookupPending || advisorLookupFailed" class="preview-controls" role="status">
        <span>{{ advisorLookupPending ? '正在补充指导教师姓名…' : '部分教师姓名暂未加载' }}</span>
        <el-button v-if="advisorLookupFailed && !advisorLookupPending" link type="primary" @click="loadAdvisorNameCache(tableData)">重试</el-button>
      </div>
      <div v-if="loading" class="preview-controls" role="status">{{ loadingText }}</div>
      <el-table class="preview-table" :data="pageRows" row-key="_rowKey" v-loading="loading" :element-loading-text="loadingText" border height="100%">
        <template #empty>
          <el-empty
            :description="tableData.length ? '当前筛选下暂无数据' : '请先上传 Excel 文件导入数据'"
            :image-size="80"
          />
        </template>
        <el-table-column align="center" header-align="center" type="index" :index="index => isUnified ? (pageRows[index]?.row_number || tableData.indexOf(pageRows[index]) + 1) : (currentPage - 1) * pageSize + index + 1" :label="isUnified ? 'Excel行号' : '序号'" :width="isUnified ? 95 : 65" fixed />
        <el-table-column align="center" header-align="center" v-for="column in columns.filter(column => column.key !== 'remark')" :key="column.key" :label="column.label" :min-width="column.width">
          <template #default="{ row }">
            <el-select
              v-if="column.key === 'college'"
              v-model="row[column.key]"
              filterable
              clearable
              fit-input-width
              placeholder="请选择学院"
              :disabled="loading"
              style="width: 180px; max-width: 100%"
              @change="markRowChanged(row)"
            >
              <el-option v-for="college in collegeList" :key="college.id" :label="college.name" :value="college.name" />
            </el-select>
            <el-select v-else-if="column.key === 'award_category'" v-model="row[column.key]" :disabled="loading" @change="markRowChanged(row)">
              <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
            </el-select>
            <el-select
              v-else-if="column.key === 'award_name'"
              v-model="row[column.key]"
              clearable
              placeholder="请选择等级"
              :disabled="loading"
              @change="markRowChanged(row)"
            >
              <el-option v-for="level in awardLevels" :key="level" :label="level" :value="level" />
            </el-select>
            <el-date-picker
              v-else-if="column.key === 'award_month'"
              v-model="row[column.key]"
              type="month"
              format="YYYY-MM"
              value-format="YYYY-MM"
              placeholder="选择月份"
              clearable
              :disabled="loading"
              style="width: 140px; max-width: 100%"
              @change="markRowChanged(row)"
            />
            <el-input v-else v-model="row[column.key]" :disabled="loading" @input="markRowChanged(row, column.key)" />
          </template>
        </el-table-column>
        <el-table-column align="center" header-align="center" prop="advisor_usernames" label="指导老师" min-width="180">
          <template #default="{ row }">
            <div class="advisor-selection">
              <el-tag v-for="(advisor, index) in selectedAdvisorsForRow(row)" :key="`${advisor.username}-${index}`" :closable="!loading" :disable-transitions="true" @close="removeAdvisor(row, advisor.username)">
                <span class="advisor-tag-name" :title="advisorDisplayName(advisor)" @click="openAdvisorPicker(row)">{{ advisorDisplayName(advisor) }}</span>
              </el-tag>
              <el-button v-if="!row.advisor_usernames" link type="primary" :disabled="loading" @click="openAdvisorPicker(row)">选择指导老师</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" header-align="center" label="导入状态" width="140">
          <template #default="{ row }"><el-tag :type="importState(row).type">{{ importState(row).label }}</el-tag></template>
        </el-table-column>
        <el-table-column v-if="isUnified" prop="error" label="未导入原因" min-width="280" />
        <el-table-column align="center" header-align="center" prop="remark" label="备注" :min-width="140">
          <template #default="{ row }">
            <el-input v-model="row.remark" :disabled="loading" @input="markRowChanged(row)" />
          </template>
        </el-table-column>
        <el-table-column align="center" header-align="center" label="操作" width="70" fixed="right"><template #default="{ row }"><el-button link type="danger" :icon="Delete" :disabled="loading" @click="removeRow(row)" /></template></el-table-column>
      </el-table>
      <div class="footer">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" :total="filteredRows.length" :disabled="loading" layout="total, sizes, prev, pager, next" />
        <el-button v-if="isUnified" type="primary" :disabled="loading" @click="closeDetails">完成编辑</el-button>
        <template v-else><el-button :disabled="loading" @click="clearRows">清空</el-button><el-button type="primary" :icon="CircleCheck" :loading="loading" :disabled="!pendingRows.length" @click="submitImport">提交导入</el-button></template>
      </div>
    </el-card>
    </component>
    <el-dialog v-if="!isUnified" v-model="validationDialogVisible" title="校验失败结果" width="min(1100px, 94vw)" append-to-body destroy-on-close align-center>
      <template #header="{ titleId, titleClass }">
        <div class="validation-dialog-header">
          <span :id="titleId" :class="titleClass">校验失败结果</span>
          <el-button :icon="Download" type="primary" plain @click="exportValidationReport">导出校验失败名单（{{ reportErrors.length }} 行）</el-button>
        </div>
      </template>
      <div class="validation-dialog-summary">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            <div class="validation-alert-content">
              <span class="validation-alert-text">{{ validationSummary }}请修正未导入的数据后重新提交，已成功导入和已存在的记录无需重复处理。</span>
            </div>
          </template>
        </el-alert>
      </div>
      <el-table :data="reportPageRows" row-key="_rowKey" border max-height="48vh" class="validation-result-table">
        <el-table-column align="center" header-align="center" prop="sequence" label="序号" width="75" />
        <el-table-column v-if="isUnified" prop="row_number" label="Excel行号" width="100" />
        <el-table-column v-if="isUnified" prop="comp_name" label="赛事名称" min-width="200" />
        <el-table-column align="center" header-align="center" prop="student_id" label="学号" width="150" />
        <el-table-column align="center" header-align="center" prop="name" label="学生姓名" width="110" />
        <el-table-column align="center" header-align="center" prop="college" label="所属学院" min-width="160" />
        <el-table-column align="center" header-align="center" prop="project_name" label="参赛项目名称" min-width="180" />
        <el-table-column align="center" header-align="center" prop="error" label="未导入原因" min-width="300" />
        <el-table-column align="center" header-align="center" label="操作" width="110" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="locateReportRow(row)">定位修改</el-button></template></el-table-column>
      </el-table>
      <template #footer>
        <div class="validation-dialog-footer">
          <el-pagination v-model:current-page="reportPage" v-model:page-size="reportPageSize" :page-sizes="[20, 50, 100]" :total="reportErrors.length" layout="total, sizes, prev, pager, next" />
        </div>
      </template>
    </el-dialog>
    <el-dialog v-model="advisorDialogVisible" title="选择指导老师" width="800px" append-to-body align-center>
      <div class="advisor-search">
        <el-input v-model="advisorSearch" placeholder="搜索教师姓名或工号" clearable @input="onAdvisorSearch" @clear="onAdvisorSearch" />
      </div>
      <el-table :data="advisorCandidates" border stripe v-loading="advisorLoading" height="350" style="width: 100%">
        <el-table-column prop="username" label="工号" width="140" align="center" />
        <el-table-column prop="name" label="姓名" width="120" align="center" />
        <el-table-column prop="college" label="所属部门" min-width="200" align="center" />
        <el-table-column label="当前角色" width="130" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ advisorRoleLabel(row.role_code) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :disabled="isAdvisorSelected(row)" @click="addAdvisor(row)">
              {{ isAdvisorSelected(row) ? '已添加' : '添加' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无符合条件的教职工" /></template>
      </el-table>
      <div class="advisor-pagination">
        <el-pagination
          v-model:current-page="advisorPage"
          v-model:page-size="advisorPageSize"
          :page-sizes="[10, 20, 30]"
          :total="advisorTotal"
          layout="total, sizes, prev, pager, next"
          @current-change="handleAdvisorPageChange"
          @size-change="handleAdvisorPageSizeChange"
        />
      </div>
      <template #footer><el-button type="primary" @click="advisorDialogVisible = false">完成</el-button></template>
    </el-dialog>
  </div>
</template>
<style scoped>
.import-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: var(--container-padding);
}
.toolbar-card { flex: 0 0 auto; }
.competition-summary-card { flex: 1 1 auto; min-height: 0; }
.competition-summary-card :deep(.el-card__body) { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0; }
.competition-summary-table { flex: 1 1 auto; min-height: 0; }
.summary-table-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
.summary-pagination { margin-top: 0; justify-content: flex-end; }
.unified-actions { flex: 0 0 auto; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: flex-end; margin-top: 12px; }
.unified-actions > [role="status"] { margin-right: auto; color: #606266; font-size: 14px; }
.summary-counts { font-size: 14px; color: #606266; }
.summary-header-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.preview-host { display: flex; flex: 1; min-height: 0; }
.unified-detail-dialog .preview-card { height: 72vh; }
.unified-detail-dialog :deep(.el-dialog__body) { padding-top: 0; }
.preview-card { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
.preview-card :deep(.el-card__header) { flex: 0 0 auto; }
.preview-card :deep(.el-card__body) { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow: hidden; }
.competition-summary-table { margin-top: 10px; }
:deep(.preview-card.el-card) { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
:deep(.preview-card .el-card__header) { flex: 0 0 auto; }
:deep(.preview-card .el-card__body) { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
:deep(.preview-card .el-alert) { flex: 0 0 auto; }
.page-title { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; }
.page-title strong { font-size: 18px; }
.preview-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.preview-header-actions { display: flex; align-items: center; }
.preview-table { flex: 1 1 auto; min-height: 0; margin-top: 12px; }
:deep(.preview-table .el-input__inner),
:deep(.preview-table .el-select__selected-item),
:deep(.preview-table .el-select__input) { text-align: center; }
:deep(.preview-table .el-select__selection) { justify-content: center; }
.preview-controls { display: flex; flex: 0 0 auto; align-items: center; gap: 16px; margin-top: 8px; }
.preview-controls { color: #606266; font-size: 14px; }
.actions, .footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.footer { flex: 0 0 auto; justify-content: flex-end; margin-top: 12px; }
.validation-result-table { margin-top: 16px; }
.advisor-selection { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; }
.advisor-tag-name { cursor: pointer; }
:deep(.advisor-selection .el-tag) { max-width: 100%; }
:deep(.advisor-selection .el-tag__content) { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.advisor-search { margin-bottom: 12px; }
.advisor-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.validation-dialog-summary { min-width: 0; }
.validation-dialog-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-right: 32px; }
:deep(.validation-dialog-summary .el-alert__content) { flex: 1 1 auto; min-width: 0; }
.validation-alert-content { display: flex; align-items: center; gap: 16px; width: 100%; padding-right: 12px; }
.validation-alert-text { white-space: normal; }
.validation-dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
</style>
