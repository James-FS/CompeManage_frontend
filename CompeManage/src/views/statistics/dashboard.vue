<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { saveAs } from 'file-saver'
import {
  Trophy,
  User,
  Histogram,
  PieChart,
  DataLine,
  Download,
  CircleCheckFilled,
  Timer
} from '@element-plus/icons-vue'
import api from '@/api/index'

const router = useRouter()
const loading = ref(false)
const trendLoading = ref(false)
const trendMonthsRange = ref(6)
const trendRangeError = ref('')
const statisticsRequestSequence = ref(0)

const stats = reactive({
  totalCompetitions: 0,
  totalRegistrations: 0,
  pendingAudits: 0,
  totalAwards: 0,
  totalAwardStudents: 0,
  registrationPassRate: 0,
  summaryArchiveRate: 0
})

const todoList = ref([])
const competitionStats = ref([]) // 新增：用于存储单个比赛的统计列表
// 所有待办计数都为 0 时视为「暂无待办」，展示空状态
const hasTodoItems = computed(() => todoList.value.some((item) => safeNumber(item?.value) > 0))
const collegeList = ref([])
const detailFilters = reactive({
  name: '',
  level: '',
  college: ''
})
const chartLimit = ref(10)
const detailCurrentPage = ref(1)
const detailPageSize = ref(10)
const tableSort = reactive({ prop: 'award_count', order: 'descending' })

const pieChartRef = ref(null)
const barChartRef = ref(null)
const trendChartRef = ref(null)
const levelChartHasData = ref(false)
const collegeChartHasData = ref(false)
const trendChartHasData = ref(false)

const chartInstances = reactive({
  pie: null,
  bar: null,
  trend: null,
  compBar: null
})

const safeArray = (value) => (Array.isArray(value) ? value : [])
const safeNumber = (value) => Number(value || 0)
const ratioToPercent = (numerator, denominator) => {
  if (!denominator) return 0
  return Number(((numerator / denominator) * 100).toFixed(2))
}

const extractList = (res) => {
  if (!res || res.code !== 200) return []
  if (Array.isArray(res.data?.list)) return res.data.list
  if (Array.isArray(res.data)) return res.data
  return []
}

const extractTotal = (res, fallbackList = []) => {
  if (!res || res.code !== 200) return fallbackList.length
  if (typeof res.data?.total === 'number') return res.data.total
  if (typeof res.total === 'number') return res.total
  return fallbackList.length
}

const initOrUpdateChart = (key, domRef, option) => {
  if (!domRef?.value) return
  if (!chartInstances[key]) {
    chartInstances[key] = echarts.init(domRef.value)
  }
  chartInstances[key].setOption(option)
}

const hasPositiveValue = (values) => values.some((value) => safeNumber(value) > 0)

const buildLevelPieData = (competitionList) => {
  const map = {}
  competitionList.forEach((item) => {
    const level = item?.comp_level || item?.detail?.comp_level || '未分类'
    map[level] = (map[level] || 0) + 1
  })
  const data = Object.keys(map).map((key) => ({ name: key, value: map[key] }))
  if (!data.length) {
    return [
      { name: '校级', value: 0 },
      { name: '省级', value: 0 },
      { name: '国家级', value: 0 }
    ]
  }
  return data
}

const buildCollegeBarData = (registerList) => {
  const map = {}
  registerList.forEach((item) => {
    const collegeName = normalizeCollegeText(item?.college_name || item?.leader?.college?.name)
    map[collegeName] = (map[collegeName] || 0) + 1
  })

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  if (!sorted.length) {
    return {
      labels: ['暂无数据'],
      values: [0]
    }
  }

  return {
    labels: sorted.map((item) => item[0]),
    values: sorted.map((item) => item[1])
  }
}

const buildLevelPieOption = (data) => {
  const total = data.reduce((sum, item) => sum + safeNumber(item?.value), 0)
  return {
    tooltip: { trigger: 'item', formatter: '{b}<br/>赛事数量：{c}（{d}%）' },
    legend: {
      type: 'scroll',
      bottom: 0,
      left: 'center',
      itemGap: 10,
      formatter: (name) => {
        const item = data.find((entry) => entry.name === name)
        const percent = total ? (safeNumber(item?.value) / total * 100).toFixed(1) : '0.0'
        return `${name}  ${safeNumber(item?.value)} 项 · ${percent}%`
      }
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '38%',
        style: { text: '赛事总数', fill: '#667085', fontSize: 12, textAlign: 'center' }
      },
      {
        type: 'text',
        left: 'center',
        top: '46%',
        style: { text: String(total), fill: '#303133', fontSize: 22, fontWeight: 600, textAlign: 'center' }
      }
    ],
    color: ['#2C6E9B', '#0F766E', '#B7791F', '#667A99'],
    series: [{
      type: 'pie',
      radius: ['48%', '68%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      data,
      label: { formatter: '{b} {d}%', fontSize: 11 },
      labelLine: { length: 10, length2: 8 }
    }]
  }
}

const buildCollegeBarOption = (barData) => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 126, right: 34, top: 16, bottom: 34 },
  xAxis: {
    type: 'value',
    min: 0,
    name: '报名记录数',
    nameLocation: 'end',
    nameTextStyle: { color: '#667085', padding: [0, 0, 0, 8] },
    axisLabel: { color: '#667085' },
    splitLine: { lineStyle: { color: '#E5EAF0', type: 'dashed' } }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: barData.labels,
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: '#475467', width: 108, overflow: 'truncate' }
  },
  series: [{
    name: '报名记录数',
    data: barData.values,
    type: 'bar',
    barMaxWidth: 20,
    itemStyle: { color: '#2580BD', borderRadius: [0, 3, 3, 0] },
    label: { show: true, position: 'right', color: '#344054', fontWeight: 600, distance: 8 }
  }]
})

const renderLevelPieChart = (data) => {
  levelChartHasData.value = data.some((item) => safeNumber(item?.value) > 0)
  if (!levelChartHasData.value) {
    chartInstances.pie?.dispose()
    chartInstances.pie = null
    return
  }
  nextTick(() => initOrUpdateChart('pie', pieChartRef, buildLevelPieOption(data)))
}

const renderCollegeBarChart = (barData) => {
  collegeChartHasData.value = barData.values.some((value) => safeNumber(value) > 0)
  if (!collegeChartHasData.value) {
    chartInstances.bar?.dispose()
    chartInstances.bar = null
    return
  }
  nextTick(() => initOrUpdateChart('bar', barChartRef, buildCollegeBarOption(barData)))
}

const processStageDefinitions = [
  { name: '已申报', unit: '申报记录' },
  { name: '已报名', unit: '报名记录' },
  { name: '已获奖', unit: '团队奖项' },
  { name: '已归档总结', unit: '总结记录' }
]
const processStageStats = ref(processStageDefinitions.map((stage) => ({ ...stage, value: 0 })))
const setProcessStageStats = (items) => {
  const valueByName = new Map(safeArray(items).map((item) => [item?.name, safeNumber(item?.value)]))
  processStageStats.value = processStageDefinitions.map((stage) => ({
    ...stage,
    value: valueByName.get(stage.name) || 0
  }))
}

const buildRecentMonths = (monthCount = trendMonthsRange.value) => {
  const months = []
  const now = new Date()
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`)
  }
  return months
}

const normalizeMonth = (timeString) => {
  if (!timeString) return ''
  const date = new Date(timeString)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

const normalizeText = (value) => String(value || '').trim()
const escapeChartText = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]))
const normalizeCollegeText = (value) => {
  const text = normalizeText(value)
  if (!text || text === '未知学院') return '-'
  return text
}

const getCompetitionName = (item) => normalizeText(item?.comp_name || item?.name)

const getCompetitionLevel = (item) => normalizeText(item?.comp_level || item?.detail?.comp_level || '未分类')

const getCompetitionCollege = (item) => normalizeCollegeText(
  item?.college_info?.name || item?.college_name || item?.college?.name || item?.organizer_college || item?.leader?.college?.name
)

const levelFilterOptions = computed(() => {
  const set = new Set()
  competitionStats.value.forEach((item) => {
    set.add(getCompetitionLevel(item))
  })
  return Array.from(set).filter(Boolean)
})

const competitionCollegeOptions = computed(() => {
  const set = new Set()
  competitionStats.value.forEach((item) => {
    set.add(getCompetitionCollege(item))
  })
  return Array.from(set).filter(Boolean)
})

const collegeFilterOptions = computed(() => {
  if (collegeList.value.length) {
    return collegeList.value.map((item) => normalizeCollegeText(item?.name)).filter(Boolean)
  }
  return competitionCollegeOptions.value
})

const filteredCompetitionStats = computed(() => {
  const nameKeyword = normalizeText(detailFilters.name).toLowerCase()
  const levelKeyword = normalizeText(detailFilters.level)
  const collegeKeyword = normalizeText(detailFilters.college)

  return competitionStats.value.filter((item) => {
    const name = getCompetitionName(item).toLowerCase()
    const level = getCompetitionLevel(item)
    const college = getCompetitionCollege(item)

    const matchName = !nameKeyword || name.includes(nameKeyword)
    const matchLevel = !levelKeyword || level === levelKeyword
    const matchCollege = !collegeKeyword || college === collegeKeyword
    return matchName && matchLevel && matchCollege
  })
})

const awardCompetitionCount = computed(() => filteredCompetitionStats.value
  .filter((item) => safeNumber(item?.award_count) > 0).length)

const chartCompetitionStats = computed(() => filteredCompetitionStats.value
  .filter((item) => safeNumber(item?.award_count) > 0)
  .slice()
  .sort((a, b) => safeNumber(b?.award_count) - safeNumber(a?.award_count))
  .slice(0, chartLimit.value))

const sortedCompetitionStats = computed(() => {
  const direction = tableSort.order === 'ascending' ? 1 : -1
  return filteredCompetitionStats.value
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const getValue = (row) => safeNumber(row?.[tableSort.prop])
      const difference = (getValue(a.item) - getValue(b.item)) * direction
      return difference || a.index - b.index
    })
    .map(({ item }) => item)
})

const paginatedCompetitionStats = computed(() => {
  const start = (detailCurrentPage.value - 1) * detailPageSize.value
  return sortedCompetitionStats.value.slice(start, start + detailPageSize.value)
})

const handleCompetitionSortChange = ({ prop, order }) => {
  tableSort.prop = order && prop ? prop : 'award_count'
  tableSort.order = order || 'descending'
  detailCurrentPage.value = 1
}

const handleDetailPageSizeChange = () => {
  detailCurrentPage.value = 1
}

watch(filteredCompetitionStats, () => {
  detailCurrentPage.value = 1
})

// —— 各赛事详细统计：获奖人数柱状图（跟随筛选联动） ——
const compBarChartRef = ref(null)
const compBarChartHeight = computed(() => Math.max(220, chartCompetitionStats.value.length * 34 + 80))

const renderCompBarChart = () => {
  const list = chartCompetitionStats.value
  if (!compBarChartRef.value || !list.length) {
    chartInstances.compBar?.dispose()
    chartInstances.compBar = null
    return
  }

  const chartWidth = compBarChartRef.value.clientWidth
  const isNarrow = chartWidth < 560
  const labelWidth = isNarrow ? 118 : 220
  const maxNameLength = isNarrow ? 12 : 25

  if (!chartInstances.compBar) {
    chartInstances.compBar = echarts.init(compBarChartRef.value)
  }
  chartInstances.compBar.setOption({
    grid: { left: labelWidth + 14, right: isNarrow ? 42 : 52, top: 20, bottom: 34 },
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${escapeChartText(params.data.name)}<br/>获奖学生人次：${safeNumber(params.value)}`
    },
    xAxis: {
      type: 'value',
      min: 0,
      name: '获奖人次',
      nameLocation: 'end',
      nameTextStyle: { color: '#667085', padding: [0, 0, 0, 8] },
      axisLabel: { color: '#667085', hideOverlap: true },
      splitLine: { lineStyle: { color: '#E5EAF0', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map((item) => getCompetitionName(item)),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: '#475467',
        fontSize: 12,
        width: labelWidth,
        overflow: 'truncate',
        formatter: (name) => name.length > maxNameLength ? `${name.slice(0, maxNameLength - 1)}…` : name
      }
    },
    series: [
      {
        name: '获奖学生人次',
        type: 'bar',
        barMaxWidth: 18,
        data: list.map((item) => ({ value: safeNumber(item?.award_count), name: getCompetitionName(item) })),
        itemStyle: { color: '#2580BD', borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: '#344054', fontWeight: 600, distance: 8 }
      }
    ]
  }, true)
}
watch(chartCompetitionStats, () => nextTick(renderCompBarChart))

// —— 一键导出上报 Excel（附件1+附件2+汇总表） ——
const reportYear = ref(String(new Date().getFullYear()))
const exportingReport = ref(false)
const exportReport = async () => {
  exportingReport.value = true
  try {
    const res = await api.exportAwardReport(reportYear.value || '')
    if (res.type?.includes('application/json')) {
      const errorJson = JSON.parse(await res.text())
      ElMessage.error(errorJson.message || errorJson.msg || '导出失败')
      return
    }
    saveAs(
      new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${reportYear.value || '全部'}年大学生参加省级以上各类竞赛获奖上报汇总.xlsx`
    )
    ElMessage.success('导出成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('网络请求失败')
  } finally {
    exportingReport.value = false
  }
}

const buildTrendData = (registerList, awardList, monthCount = trendMonthsRange.value) => {
  const months = buildRecentMonths(monthCount)
  const regMap = Object.fromEntries(months.map((m) => [m, 0]))
  const awardMap = Object.fromEntries(months.map((m) => [m, 0]))

  registerList.forEach((item) => {
    const month = normalizeMonth(item?.created_at || item?.CreatedAt)
    if (month && month in regMap) regMap[month] += 1
  })

  awardList.forEach((item) => {
    const month = normalizeMonth(item?.created_at || item?.CreatedAt)
    if (month && month in awardMap) awardMap[month] += 1
  })

  return {
    months,
    regSeries: months.map((m) => regMap[m]),
    awardSeries: months.map((m) => awardMap[m])
  }
}

const buildTrendOption = (months, regSeries, awardSeries) => {
  const hasData = months.length > 0 && (hasPositiveValue(regSeries) || hasPositiveValue(awardSeries))
  return {
    title: { text: `近${months.length}个月`, textStyle: { fontSize: 13, color: '#667085' } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['报名记录', '团队奖项记录'], right: 10, top: 8 },
    grid: { left: 48, right: 20, bottom: 35, top: 44 },
    xAxis: {
      type: 'category',
      data: hasData ? months : ['暂无数据'],
      axisLabel: { interval: 0, hideOverlap: true, color: '#667085' },
      axisLine: { lineStyle: { color: '#D0D5DD' } }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#667085' },
      splitLine: { lineStyle: { color: '#E5EAF0', type: 'dashed' } }
    },
    series: [
      {
        name: '报名记录',
        type: 'line',
        symbol: 'circle',
        symbolSize: 6,
        data: hasData ? regSeries : [0],
        itemStyle: { color: '#2580BD' },
        lineStyle: { color: '#2580BD', width: 2 }
      },
      {
        name: '团队奖项记录',
        type: 'line',
        symbol: 'diamond',
        symbolSize: 7,
        data: hasData ? awardSeries : [0],
        itemStyle: { color: '#0F766E' },
        lineStyle: { color: '#0F766E', width: 2, type: 'dashed' }
      }
    ]
  }
}

const renderTrendChart = (months, regSeries, awardSeries) => {
  trendChartHasData.value = months.length > 0 && (hasPositiveValue(regSeries) || hasPositiveValue(awardSeries))
  if (!trendChartHasData.value) {
    chartInstances.trend?.dispose()
    chartInstances.trend = null
    return
  }
  nextTick(() => initOrUpdateChart('trend', trendChartRef, buildTrendOption(months, regSeries, awardSeries)))
}

const normalizeDashboardPayload = (payload) => {
  const summary = payload?.summary || {}
  const levelData = safeArray(payload?.distributions?.level)
  const collegeData = safeArray(payload?.distributions?.college)
  const trend = payload?.trend || {}

  stats.totalCompetitions = safeNumber(summary.total_competitions)
  stats.totalRegistrations = safeNumber(summary.total_registrations)
  stats.pendingAudits = safeNumber(summary.pending_audits)
  stats.totalAwards = safeNumber(summary.total_awards)
  stats.totalAwardStudents = safeNumber(summary.total_award_students)
  stats.registrationPassRate = safeNumber(summary.registration_pass_rate)
  stats.summaryArchiveRate = safeNumber(summary.summary_archive_rate)

  todoList.value = safeArray(payload?.todos)
  competitionStats.value = safeArray(payload?.competition_stats)

  const pieData = levelData.length
    ? levelData.map((item) => ({ name: item.name || '未分类', value: safeNumber(item.value) }))
    : [
      { name: '校级', value: 0 },
      { name: '省级', value: 0 },
      { name: '国家级', value: 0 }
    ]

  const barLabels = collegeData.length ? collegeData.map((item) => normalizeCollegeText(item.name)) : ['暂无数据']
  const barValues = collegeData.length ? collegeData.map((item) => safeNumber(item.value)) : [0]

  const trendMonths = safeArray(trend.months)
  const trendRegs = safeArray(trend.registrations).map((item) => safeNumber(item))
  const trendAwards = safeArray(trend.awards).map((item) => safeNumber(item))

  renderLevelPieChart(pieData)
  renderCollegeBarChart({ labels: barLabels, values: barValues })
  renderTrendChart(trendMonths, trendRegs, trendAwards)

  const funnelData = safeArray(payload?.funnel).map((item) => ({
    name: item.name,
    value: safeNumber(item.value)
  }))
  setProcessStageStats(funnelData)
}

const renderCharts = ({ competitionList, registerList, awardList, funnelData }) => {
  const pieData = buildLevelPieData(competitionList)
  const barData = buildCollegeBarData(registerList)
  const trendData = buildTrendData(registerList, awardList)

  renderLevelPieChart(pieData)
  renderCollegeBarChart(barData)
  renderTrendChart(trendData.months, trendData.regSeries, trendData.awardSeries)

  setProcessStageStats(funnelData)
}

const fetchStatistics = async ({ showLoading = true, showTrendLoading = false } = {}) => {
  const requestSequence = ++statisticsRequestSequence.value
  if (showLoading) loading.value = true
  if (showTrendLoading) {
    trendLoading.value = true
    trendRangeError.value = ''
  }
  try {
    const dashboardRes = await api.getStatisticsDashboard({ months: trendMonthsRange.value })
    if (requestSequence !== statisticsRequestSequence.value) return
    if (dashboardRes?.code === 200 && dashboardRes?.data) {
      const returnedMonths = safeArray(dashboardRes.data?.trend?.months).length
      if (returnedMonths !== trendMonthsRange.value) {
        trendRangeError.value = `所选近 ${trendMonthsRange.value} 个月，但接口返回 ${returnedMonths} 个月数据；请重启后端后重试。`
        renderTrendChart([], [], [])
        ElMessage.warning(trendRangeError.value)
        return
      }
      await nextTick()
      if (requestSequence !== statisticsRequestSequence.value) return
      normalizeDashboardPayload(dashboardRes.data)
      return
    }

    const [
      compRes,
      regRes,
      declarePendingRes,
      declareAllRes,
      awardAuditRes,
      summaryRes
    ] = await Promise.allSettled([
      api.getCompetitionList({ page: 1, page_size: 500 }),
      api.getRegList({ page: 1, pageSize: 500 }),
      api.getPendingDeclares({ page: 1, page_size: 500 }),
      api.getAllDeclares({ page: 1, page_size: 500 }),
      api.getAwardAuditList({ page: 1, page_size: 500 }),
      api.getSummaryList({ page: 1, page_size: 500 })
    ])
    if (requestSequence !== statisticsRequestSequence.value) return

    const competitionResp = compRes.status === 'fulfilled' ? compRes.value : null
    const registerResp = regRes.status === 'fulfilled' ? regRes.value : null
    const declarePendingResp = declarePendingRes.status === 'fulfilled' ? declarePendingRes.value : null
    const declareAllResp = declareAllRes.status === 'fulfilled' ? declareAllRes.value : null
    const awardResp = awardAuditRes.status === 'fulfilled' ? awardAuditRes.value : null
    const summaryResp = summaryRes.status === 'fulfilled' ? summaryRes.value : null

    const competitionList = extractList(competitionResp)
    const registerList = extractList(registerResp)
    const declareAllList = extractList(declareAllResp)
    const awardList = extractList(awardResp)
    const summaryList = extractList(summaryResp)

    const totalCompetitions = extractTotal(competitionResp, competitionList)
    const totalRegistrations = extractTotal(registerResp, registerList)
    const declarePendingTotal = extractTotal(declarePendingResp, extractList(declarePendingResp))

    const regPending = registerList.filter((item) => safeNumber(item?.status) === 0 || safeNumber(item?.status) === 3).length
    const regPassed = registerList.filter((item) => safeNumber(item?.status) === 1 || safeNumber(item?.status) === 4).length

    const awardPending = awardList.filter((item) => {
      const status = item?.status
      return status === 0 || status === '0' || status === 'pending' || status === 'draft'
    }).length
    const awardApproved = awardList.filter((item) => {
      const status = item?.status
      return status === 1 || status === '1' || status === 'approved'
    }).length

    const summaryArchived = summaryList.filter((item) => safeNumber(item?.status) === 1).length
    const pendingAudits = declarePendingTotal + regPending + awardPending

    stats.totalCompetitions = totalCompetitions
    stats.totalRegistrations = totalRegistrations
    stats.pendingAudits = pendingAudits
    stats.totalAwards = awardApproved
    stats.registrationPassRate = ratioToPercent(regPassed, totalRegistrations)
    stats.summaryArchiveRate = ratioToPercent(summaryArchived, totalCompetitions)

    todoList.value = [
      {
        title: '赛事申报待审核',
        value: declarePendingTotal,
        path: '/competition/audit'
      },
      {
        title: '报名待审核',
        value: regPending,
        path: '/register/audit'
      },
      {
        title: '获奖待审核',
        value: awardPending,
        path: '/award/audit'
      },
      {
        title: '总结待归档',
        value: Math.max(totalCompetitions - summaryArchived, 0),
        path: '/summary/summary-list'
      }
    ]

    const funnelData = [
      { name: '已申报', value: extractTotal(declareAllResp, declareAllList) },
      { name: '已报名', value: totalRegistrations },
      { name: '已获奖', value: awardApproved },
      { name: '已归档总结', value: summaryArchived }
    ]

    await nextTick()
    if (requestSequence !== statisticsRequestSequence.value) return
    renderCharts({ competitionList, registerList, awardList, funnelData })
  } catch (error) {
    if (requestSequence === statisticsRequestSequence.value) {
      console.error('获取统计数据失败', error)
      if (showTrendLoading || !trendChartHasData.value) {
        trendRangeError.value = '趋势数据加载失败，请检查网络后重试。'
        renderTrendChart([], [], [])
      }
    }
  } finally {
    if (requestSequence === statisticsRequestSequence.value) {
      loading.value = false
      trendLoading.value = false
    }
  }
}

const handleTrendRangeChange = (value) => {
  const monthCount = Number(value)
  if (![6, 12].includes(monthCount) || monthCount === trendMonthsRange.value) return
  trendMonthsRange.value = monthCount
  reloadTrendRange()
}

const reloadTrendRange = () => fetchStatistics({ showLoading: false, showTrendLoading: true })

const loadCollegeList = async () => {
  try {
    const response = await api.getCollegeList()
    if (response?.code === 0 || response?.code === 200) {
      collegeList.value = safeArray(response.data)
    }
  } catch (error) {
    console.error('加载学院列表失败', error)
  }
}

const handleResize = () => {
  Object.values(chartInstances).forEach((chart) => chart?.resize())
  if (chartInstances.compBar) nextTick(renderCompBarChart)
}

const goPage = (path) => {
  if (!path) return
  router.push(path)
}

onMounted(() => {
  loadCollegeList()
  fetchStatistics()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  Object.keys(chartInstances).forEach((key) => {
    if (chartInstances[key]) {
      chartInstances[key].dispose()
      chartInstances[key] = null
    }
  })
})
</script>

<template>
  <div class="stats-container" v-loading="loading">
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="4" v-for="(val, key) in {
        totalCompetitions: ['赛事总数', 'comp', Histogram],
        totalRegistrations: ['报名总数', 'reg', User],
        pendingAudits: ['待审核项', 'audit', Timer],
        totalAwards: ['已通过团队奖项', 'award', Trophy],
        registrationPassRate: ['报名通过率', 'rate', CircleCheckFilled],
        summaryArchiveRate: ['总结归档率', 'archive', DataLine]
      }" :key="key">
        <el-card shadow="hover" class="stat-card">
          <div class="card-content">
            <el-icon class="icon" :class="val[1]"><component :is="val[2]" /></el-icon>
            <div class="text">
              <div class="label">{{ val[0] }}</div>
              <div class="value" :class="{ danger: key === 'pendingAudits' && stats[key] > 0 }">
                {{ key.includes('Rate') ? stats[key] + '%' : stats[key] }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <p style="color: #606266; margin: 12px 0">已通过获奖学生人次：{{ stats.totalAwardStudents }}；团队奖项与学生人数分别统计，未报名获奖也计入。</p>
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card header="竞赛级别分布" shadow="never">
          <div
            v-if="levelChartHasData"
            ref="pieChartRef"
            class="chart-box"
            role="img"
            aria-label="赛事级别分布，环形图展示各级别赛事数量和占比，中心显示赛事总数。"
          ></div>
          <div v-else class="chart-box chart-empty">
            <el-empty description="暂无赛事级别数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card header="学院报名记录 Top 8" shadow="never">
          <div
            v-if="collegeChartHasData"
            ref="barChartRef"
            class="chart-box"
            role="img"
            aria-label="学院报名记录排名，横向条形图按报名记录数从高到低显示前八个学院。"
          ></div>
          <div v-else class="chart-box chart-empty">
            <el-empty description="暂无报名记录" :image-size="80" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card header="流程节点统计" shadow="never" class="process-card">
          <p class="process-note">按记录类型分别统计，不代表同一批赛事的转化率。</p>
          <div class="process-stages" role="list" aria-label="流程节点统计">
            <div v-for="(stage, index) in processStageStats" :key="stage.name" class="process-stage" role="listitem">
              <span class="process-index" aria-hidden="true">{{ index + 1 }}</span>
              <div class="process-copy">
                <span class="process-name">{{ stage.name }}</span>
                <span class="process-unit">{{ stage.unit }}</span>
              </div>
              <strong class="process-value">{{ stage.value }}</strong>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row secondary-row">
      <el-col :xs="24" :sm="24" :md="16">
        <el-card shadow="never">
          <template #header>
            <div class="trend-card-header">
              <span>月度趋势</span>
              <el-radio-group
                :model-value="trendMonthsRange"
                size="small"
                aria-label="选择趋势月份范围"
                :disabled="loading || trendLoading"
                @change="handleTrendRangeChange"
              >
                <el-radio-button :value="6">近 6 个月</el-radio-button>
                <el-radio-button :value="12">近 12 个月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="trend-panel" v-loading="trendLoading">
            <div v-if="trendRangeError" class="chart-box trend chart-empty">
              <el-empty :description="trendRangeError" :image-size="80">
                <el-button size="small" type="primary" plain :disabled="trendLoading" @click="reloadTrendRange">重试</el-button>
              </el-empty>
            </div>
            <div
              v-else-if="trendChartHasData"
              ref="trendChartRef"
              class="chart-box trend"
              role="img"
              :aria-label="`近 ${trendMonthsRange} 个月报名记录和团队奖项记录数量趋势。`"
            ></div>
            <div v-else class="chart-box trend chart-empty">
              <el-empty :description="`近 ${trendMonthsRange} 个月暂无趋势数据`" :image-size="80" />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="8">
        <el-card header="关键待办" shadow="never" class="todo-card">
          <div class="todo-list" v-if="hasTodoItems">
            <div class="todo-item" v-for="item in todoList" :key="item.title">
              <div class="left">
                <span class="title">{{ item.title }}</span>
                <span class="count" :class="{ danger: item.value > 0 }">{{ item.value }}</span>
              </div>
              <el-button link type="primary" @click="goPage(item.path)">去处理</el-button>
            </div>
          </div>
          <el-empty v-else description="暂无待办" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="24">
        <el-card header="各赛事详细统计" shadow="never">
          <div class="detail-filter-bar">
            <el-input
              v-model="detailFilters.name"
              placeholder="按赛事名称筛选"
              aria-label="按赛事名称筛选"
              clearable
              class="filter-item name"
            />
            <el-select
              v-model="detailFilters.level"
              placeholder="按级别筛选"
              aria-label="按赛事级别筛选"
              clearable
              class="filter-item"
            >
              <el-option
                v-for="item in levelFilterOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-select
              v-model="detailFilters.college"
              placeholder="按所属学院筛选"
              aria-label="按所属学院筛选"
              clearable
              class="filter-item"
            >
              <el-option
                v-for="item in collegeFilterOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-date-picker
              v-model="reportYear"
              type="year"
              placeholder="上报年份（留空全部）"
              value-format="YYYY"
              clearable
              class="filter-item"
              style="width: 170px"
            />
            <el-button type="primary" :icon="Download" :loading="exportingReport" @click="exportReport">
              导出上报Excel（附件1+附件2+汇总表）
            </el-button>
          </div>
          <div class="ranking-heading">
            <div class="ranking-copy">
              <h3>获奖赛事人次排名</h3>
            </div>
            <div class="ranking-controls">
              <el-radio-group v-model="chartLimit" size="small" aria-label="选择排名显示数量">
                <el-radio-button :value="10">前 10</el-radio-button>
                <el-radio-button :value="20">前 20</el-radio-button>
                <el-radio-button :value="50">前 50</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div
            v-if="chartCompetitionStats.length"
            ref="compBarChartRef"
            class="chart-box comp-bar"
            role="img"
            :aria-label="`获奖赛事人次排名，当前筛选中有 ${awardCompetitionCount} 项赛事获奖，按获奖学生人次从高到低排列。`"
            :style="{ height: `${compBarChartHeight}px` }"
          ></div>
          <div
            v-else
            class="chart-box comp-bar chart-empty"
            :style="{ height: `${compBarChartHeight}px` }"
          >
            <el-empty description="当前筛选下暂无获奖赛事，全部赛事仍可在下方明细中查看。" :image-size="72" />
          </div>

          <div class="detail-table-heading">
            <h3>赛事明细</h3>
            <span>共 {{ sortedCompetitionStats.length }} 项</span>
          </div>
          <el-table
            :data="paginatedCompetitionStats"
            :default-sort="{ prop: 'award_count', order: 'descending' }"
            @sort-change="handleCompetitionSortChange"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="comp_name" label="赛事名称" min-width="200" align="center" show-overflow-tooltip />
            <el-table-column prop="comp_level" label="级别" width="100" align="center">
              <template #default="scope">
                <el-tag size="small" effect="plain">{{ scope.row.comp_level || '未分类' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="所属学院" min-width="160" align="center" show-overflow-tooltip>
              <template #default="scope">
                {{ getCompetitionCollege(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column prop="reg_count" label="报名数" width="120" align="center" sortable="custom" />
            <el-table-column prop="award_count" label="获奖学生人次" width="140" align="center" sortable="custom" />
            <el-table-column prop="award_team_count" label="团队奖项数" width="120" align="center" sortable="custom" />
            <el-table-column label="总结归档" width="120" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.summary_status === 1 ? 'success' : 'info'">
                  {{ scope.row.summary_status === 1 ? '已归档' : '未完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170" align="center">
              <template #default="scope">
                <el-button link type="primary" @click="goPage(`/award/detail/${scope.row.id}`)">获奖明细</el-button>
                <el-button link type="primary" @click="goPage(`/summary/summary/view/${scope.row.id}`)">总结</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无数据" />
            </template>
          </el-table>
          <div v-if="sortedCompetitionStats.length" class="detail-pagination">
            <el-pagination
              v-model:current-page="detailCurrentPage"
              v-model:page-size="detailPageSize"
              :page-sizes="[10, 20, 50]"
              :total="sortedCompetitionStats.length"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleDetailPageSizeChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.stats-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100%;

  .stat-card {
    height: 100%;

    .card-content {
      display: flex;
      align-items: center;
      gap: 12px;

      .icon {
        font-size: 28px;
        padding: 10px;
        border-radius: 8px;
        &.comp { background: #e6f7ff; color: #1890ff; }
        &.reg { background: #f6ffed; color: #52c41a; }
        &.audit { background: #fff7e6; color: #faad14; }
        &.award { background: #fff1f0; color: #f5222d; }
        &.rate { background: #f0f9eb; color: #67c23a; }
        &.archive { background: #ecf5ff; color: #409eff; }
      }

      .text {
        min-width: 0;
        .label {
          font-size: 13px;
          color: #909399;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .value {
          margin-top: 4px;
          font-size: 22px;
          font-weight: bold;
          color: #303133;
          &.danger { color: #f5222d; }
        }
      }
    }
  }

  .chart-row {
    margin-top: 16px;

    :deep(.el-col) {
      display: flex;
    }

    :deep(.el-card) {
      width: 100%;
    }
  }

  .detail-filter-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 14px;
    flex-wrap: wrap;

    .filter-item {
      width: 180px;

      &.name {
        width: 260px;
      }
    }
  }

  .ranking-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-top: 8px;
    padding: 14px 0 8px;
    border-top: 1px solid #edf0f4;
  }

  .ranking-copy h3,
  .detail-table-heading h3 {
    margin: 0;
    color: #303133;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }

  .ranking-controls {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
    color: #667085;
    font-size: 13px;
  }

  .chart-box.comp-bar {
    width: 100%;
    margin-top: 8px;
  }

  .detail-table-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 18px 0 10px;

    span {
      color: #667085;
      font-size: 13px;
    }
  }

  .detail-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .process-note {
    margin: 0 0 10px;
    color: #667085;
    font-size: 12px;
    line-height: 1.5;
  }

  .process-card {
    display: flex;
    flex-direction: column;

    :deep(.el-card__body) {
      display: flex;
      flex: 1;
      flex-direction: column;
    }
  }

  .process-stages {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-around;
  }

  .process-stage {
    position: relative;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    border-bottom: 1px solid #f0f2f5;

    &:last-child { border-bottom: 0; }
  }

  .process-index {
    z-index: 1;
    display: grid;
    width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 50%;
    background: #edf5fb;
    color: #286f9e;
    font-size: 12px;
    font-weight: 600;
  }

  .process-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  .process-name {
    color: #344054;
    font-size: 14px;
    font-weight: 500;
  }

  .process-unit {
    color: #667085;
    font-size: 12px;
  }

  .process-value {
    color: #303133;
    font-size: 18px;
    font-variant-numeric: tabular-nums;
  }

  .trend-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    > span {
      color: #303133;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .chart-box {
    height: 320px;
    width: 100%;

    &.chart-empty {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &.trend {
      height: 360px;
    }
  }

  .trend-panel {
    width: 100%;
  }

  .secondary-row {
    .todo-card {
      height: 100%;
    }

    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .todo-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid #ebeef5;
        border-radius: var(--card-radius);
      }

      .left {
        display: flex;
        align-items: center;
        gap: 8px;

        .title {
          font-size: 14px;
          color: #303133;
        }

        .count {
          min-width: 22px;
          padding: 0 6px;
          line-height: 20px;
          border-radius: 10px;
          text-align: center;
          background: #f4f4f5;
          color: #606266;

          &.danger {
            background: #fef0f0;
            color: #f56c6c;
          }
        }
      }
    }
  }

  @media (max-width: 768px) {
    padding: 12px;

    .detail-filter-bar {
      gap: 8px;

      .filter-item,
      .filter-item.name {
        width: 100% !important;
      }

      :deep(.el-button) {
        max-width: 100%;
        height: auto;
        min-height: 32px;
        white-space: normal;
      }
    }

    .ranking-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .ranking-controls {
      width: 100%;
      justify-content: space-between;
    }

    .trend-card-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .detail-pagination {
      justify-content: center;

      :deep(.el-pagination) {
        height: auto;
        flex-wrap: wrap;
        justify-content: center;
        row-gap: 8px;
      }
    }
  }
}
</style>
