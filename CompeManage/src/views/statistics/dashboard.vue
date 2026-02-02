<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import * as echarts from 'echarts'
import { Trophy, User, Histogram, PieChart } from '@element-plus/icons-vue'
import api from '@/api/index'

const userStore = useUserStore()
const loading = ref(false)

// 汇总统计数据
const stats = reactive({
  totalCompetitions: 0,
  totalRegistrations: 0,
  pendingAudits: 0,
  totalAwards: 0
})

// 图表 DOM 引用
const pieChartRef = ref(null)
const barChartRef = ref(null)

// 初始化饼图（赛事级别分布）
const initPieChart = (data) => {
  const chart = echarts.init(pieChartRef.value)
  chart.setOption({
    title: { text: '赛事级别占比', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: data || [
        { value: 10, name: '校级' },
        { value: 5, name: '省级' },
        { value: 3, name: '国家级' }
      ],
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
      }
    }]
  })
}

// 初始化柱状图（学院报名排行）
const initBarChart = (data) => {
  const chart = echarts.init(barChartRef.value)
  chart.setOption({
    title: { text: '各学院报名人数排行' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data?.labels || ['信息学院', '经管学院', '艺术学院', '文学院'] },
    yAxis: { type: 'value' },
    series: [{
      data: data?.values || [120, 200, 150, 80],
      type: 'bar',
      itemStyle: { color: '#409EFE' }
    }]
  })
}

// 获取后端统计数据
const fetchStatistics = async () => {
  loading.value = true
  try {
    // 假设后端新增了 getStatisticsSummary 接口
    // const res = await api.getStatisticsSummary({ role: userStore.role })
    // Object.assign(stats, res.data.summary)
    
    // 模拟数据填充
    stats.totalCompetitions = 45
    stats.totalRegistrations = 1250
    stats.pendingAudits = 12
    stats.totalAwards = 88

    await nextTick()
    initPieChart()
    initBarChart()
  } catch (error) {
    console.error('获取统计数据失败', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStatistics()
  // 响应式图表
  window.addEventListener('resize', () => {
    echarts.getInstanceByDom(pieChartRef.value)?.resize()
    echarts.getInstanceByDom(barChartRef.value)?.resize()
  })
})
</script>

<template>
  <div class="stats-container" v-loading="loading">
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="card-content">
            <el-icon class="icon comp"><Histogram /></el-icon>
            <div class="text">
              <div class="label">赛事总数</div>
              <div class="value">{{ stats.totalCompetitions }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="card-content">
            <el-icon class="icon reg"><User /></el-icon>
            <div class="text">
              <div class="label">报名人数</div>
              <div class="value">{{ stats.totalRegistrations }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="card-content">
            <el-icon class="icon audit"><PieChart /></el-icon>
            <div class="text">
              <div class="label">待审核项</div>
              <div class="value danger">{{ stats.pendingAudits }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="card-content">
            <el-icon class="icon award"><Trophy /></el-icon>
            <div class="text">
              <div class="label">获奖总数</div>
              <div class="value">{{ stats.totalAwards }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="10">
        <el-card header="竞赛级别分布" shadow="never">
          <div ref="pieChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="14">
        <el-card header="学院参与度分析" shadow="never">
          <div ref="barChartRef" class="chart-box"></div>
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
    .card-content {
      display: flex;
      align-items: center;
      gap: 20px;
      
      .icon {
        font-size: 40px;
        padding: 10px;
        border-radius: 8px;
        &.comp { background: #e6f7ff; color: #1890ff; }
        &.reg { background: #f6ffed; color: #52c41a; }
        &.audit { background: #fff7e6; color: #faad14; }
        &.award { background: #fff1f0; color: #f5222d; }
      }

      .text {
        .label { font-size: 14px; color: #909399; }
        .value { 
          font-size: 24px; 
          font-weight: bold; 
          color: #303133;
          &.danger { color: #f5222d; }
        }
      }
    }
  }

  .chart-row {
    margin-top: 20px;
    .chart-box {
      height: 350px;
      width: 100%;
    }
  }
}
</style>