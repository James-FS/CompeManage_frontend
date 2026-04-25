<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import {
  Trophy,
  User,
  Histogram,
  PieChart,
  DataLine,
  CircleCheckFilled,
  Timer
} from '@element-plus/icons-vue'
import api from '@/api/index'

const router = useRouter()
const loading = ref(false)

const stats = reactive({
  totalCompetitions: 0,
  totalRegistrations: 0,
  pendingAudits: 0,
  totalAwards: 0,
  registrationPassRate: 0,
  summaryArchiveRate: 0
})

const todoList = ref([])
const competitionStats = ref([]) // 新增：用于存储单个比赛的统计列表
const collegeList = ref([])
const detailFilters = reactive({
  name: '',
  level: '',
  college: ''
})

const pieChartRef = ref(null)
const barChartRef = ref(null)
const trendChartRef = ref(null)
const funnelChartRef = ref(null)

const chartInstances = reactive({
  pie: null,
  bar: null,
  trend: null,
  funnel: null
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

const buildLastSixMonths = () => {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
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

const resetDetailFilters = () => {
  detailFilters.name = ''
  detailFilters.level = ''
  detailFilters.college = ''
}

const buildTrendData = (registerList, awardList) => {
  const months = buildLastSixMonths()
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

const normalizeDashboardPayload = (payload) => {
  const summary = payload?.summary || {}
  const levelData = safeArray(payload?.distributions?.level)
  const collegeData = safeArray(payload?.distributions?.college)
  const trend = payload?.trend || {}

  stats.totalCompetitions = safeNumber(summary.total_competitions)
  stats.totalRegistrations = safeNumber(summary.total_registrations)
  stats.pendingAudits = safeNumber(summary.pending_audits)
  stats.totalAwards = safeNumber(summary.total_awards)
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

  initOrUpdateChart('pie', pieChartRef, {
    title: { text: '赛事级别占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      data: pieData,
      label: { formatter: '{b}: {d}%' }
    }]
  })

  initOrUpdateChart('bar', barChartRef, {
    title: { text: '学院参与度（报名 Top8）', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, bottom: 50, top: 45 },
    xAxis: {
      type: 'category',
      data: barLabels,
      axisLabel: { interval: 0, rotate: 20 }
    },
    yAxis: { type: 'value' },
    series: [{
      data: barValues,
      type: 'bar',
      barWidth: 22
    }]
  })

  initOrUpdateChart('trend', trendChartRef, {
    title: { text: '近6个月趋势', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['报名数', '获奖数'], right: 10, top: 8 },
    grid: { left: 40, right: 20, bottom: 35, top: 45 },
    xAxis: { type: 'category', data: trendMonths },
    yAxis: { type: 'value' },
    series: [
      { name: '报名数', type: 'line', smooth: true, data: trendRegs },
      { name: '获奖数', type: 'line', smooth: true, data: trendAwards }
    ]
  })

  const funnelData = safeArray(payload?.funnel).map((item) => ({
    name: item.name,
    value: safeNumber(item.value)
  }))

  initOrUpdateChart('funnel', funnelChartRef, {
    title: { text: '流程漏斗（申报→报名→获奖→总结）', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 45,
      bottom: 10,
      width: '80%',
      min: 0,
      max: Math.max(...funnelData.map((item) => item.value), 1),
      sort: 'descending',
      label: { show: true, position: 'inside' },
      data: funnelData
    }]
  })
}

const renderCharts = ({ competitionList, registerList, awardList, funnelData }) => {
  const pieData = buildLevelPieData(competitionList)
  const barData = buildCollegeBarData(registerList)
  const trendData = buildTrendData(registerList, awardList)

  initOrUpdateChart('pie', pieChartRef, {
    title: { text: '赛事级别占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      data: pieData,
      label: { formatter: '{b}: {d}%' }
    }]
  })

  initOrUpdateChart('bar', barChartRef, {
    title: { text: '学院参与度（报名 Top8）', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, bottom: 50, top: 45 },
    xAxis: {
      type: 'category',
      data: barData.labels,
      axisLabel: { interval: 0, rotate: 20 }
    },
    yAxis: { type: 'value' },
    series: [{
      data: barData.values,
      type: 'bar',
      barWidth: 22
    }]
  })

  initOrUpdateChart('trend', trendChartRef, {
    title: { text: '近6个月趋势', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['报名数', '获奖数'], right: 10, top: 8 },
    grid: { left: 40, right: 20, bottom: 35, top: 45 },
    xAxis: { type: 'category', data: trendData.months },
    yAxis: { type: 'value' },
    series: [
      { name: '报名数', type: 'line', smooth: true, data: trendData.regSeries },
      { name: '获奖数', type: 'line', smooth: true, data: trendData.awardSeries }
    ]
  })

  initOrUpdateChart('funnel', funnelChartRef, {
    title: { text: '流程漏斗（申报→报名→获奖→总结）', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 45,
      bottom: 10,
      width: '80%',
      min: 0,
      max: Math.max(...funnelData.map((item) => item.value), 1),
      sort: 'descending',
      label: { show: true, position: 'inside' },
      data: funnelData
    }]
  })
}

const fetchStatistics = async () => {
  loading.value = true
  try {
    const dashboardRes = await api.getStatisticsDashboard({ months: 6 })
    if (dashboardRes?.code === 200 && dashboardRes?.data) {
      await nextTick()
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
    renderCharts({ competitionList, registerList, awardList, funnelData })
  } catch (error) {
    console.error('获取统计数据失败', error)
  } finally {
    loading.value = false
  }
}

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
        totalAwards: ['已通过获奖', 'award', Trophy],
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

    <el-row :gutter="16" class="chart-row">
      <el-col :span="8">
        <el-card header="竞赛级别分布" shadow="never">
          <div ref="pieChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="学院参与度分析" shadow="never">
          <div ref="barChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="流程转化漏斗" shadow="never">
          <div ref="funnelChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row secondary-row">
      <el-col :span="16">
        <el-card header="月度趋势" shadow="never">
          <div ref="trendChartRef" class="chart-box trend"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="关键待办" shadow="never" class="todo-card">
          <div class="todo-list">
            <div class="todo-item" v-for="item in todoList" :key="item.title">
              <div class="left">
                <span class="title">{{ item.title }}</span>
                <span class="count" :class="{ danger: item.value > 0 }">{{ item.value }}</span>
              </div>
              <el-button link type="primary" @click="goPage(item.path)">去处理</el-button>
            </div>
          </div>
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
              clearable
              class="filter-item name"
            />
            <el-select
              v-model="detailFilters.level"
              placeholder="按级别筛选"
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
            <el-button @click="resetDetailFilters">重置</el-button>
          </div>
          <el-table :data="filteredCompetitionStats" border stripe style="width: 100%">
            <el-table-column prop="comp_name" label="赛事名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="comp_level" label="级别" width="100" align="center">
              <template #default="scope">
                <el-tag size="small" effect="plain">{{ scope.row.comp_level || '未分类' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="所属学院" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                {{ getCompetitionCollege(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column prop="reg_count" label="报名人数" width="120" align="center" sortable />
            <el-table-column prop="award_count" label="获奖人数" width="120" align="center" sortable />
            <el-table-column label="获奖转化率" width="120" align="center">
              <template #default="scope">
                {{ ratioToPercent(scope.row.award_count, scope.row.reg_count) }}%
              </template>
            </el-table-column>
            <el-table-column label="总结归档" width="120" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.summary_status === 1 ? 'success' : 'info'">
                  {{ scope.row.summary_status === 1 ? '已归档' : '未完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                <el-button link type="primary" @click="goPage(`/summary/summary/view/${scope.row.id}`)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
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

  .chart-box {
    height: 320px;
    width: 100%;

    &.trend {
      height: 360px;
    }
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
        border-radius: 8px;
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
}
</style>