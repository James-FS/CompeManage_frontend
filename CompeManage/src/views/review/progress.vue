<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const compId = Number(route.params.compId)

const compName = ref('')
const totalWorks = ref(0)
const totalExperts = ref(0)
const totalRecords = ref(0)
const reviewedCount = ref(0)
const experts = ref([])
const loading = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.getReviewProgress({ comp_id: compId })
    const data = res.data || res
    compName.value = data.comp_name || ''
    totalWorks.value = data.total_works || 0
    totalExperts.value = data.total_experts || 0
    totalRecords.value = data.total_records || 0
    reviewedCount.value = data.reviewed_count || 0
    experts.value = data.experts || []
  } catch {
    ElMessage.error('加载评审进度失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/review')
}

const taskStatusMap = { 1: '待评审', 2: '评审中', 3: '已完成' }

onMounted(loadData)
</script>

<template>
  <div class="progress-container">
    <div class="header-bar">
      <el-button @click="goBack" text>← 返回仪表盘</el-button>
      <span class="title">评审进度 - {{ compName }}</span>
    </div>

    <div class="summary-cards">
      <el-card shadow="hover">
        <div class="stat-num">{{ totalWorks }}</div>
        <div class="stat-label">作品总数</div>
      </el-card>
      <el-card shadow="hover">
        <div class="stat-num">{{ totalExperts }}</div>
        <div class="stat-label">评审专家</div>
      </el-card>
      <el-card shadow="hover">
        <div class="stat-num">{{ totalRecords }}</div>
        <div class="stat-label">总评审任务</div>
      </el-card>
      <el-card shadow="hover">
        <div class="stat-num">{{ reviewedCount }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
    </div>

    <div class="expert-table" v-loading="loading">
      <el-table :data="experts" stripe style="width: 100%" empty-text="暂无专家评审数据">
        <el-table-column prop="expert_name" label="专家姓名" width="120" align="center" />
        <el-table-column prop="expert_username" label="工号" width="120" align="center" />
        <el-table-column label="评审进度" min-width="300" align="center">
          <template #default="{ row }">
            <div class="progress-cell">
              <span class="progress-text">{{ row.reviewed_works }} / {{ row.assigned_works }}</span>
              <el-progress
                :percentage="row.assigned_works > 0 ? Math.round((row.reviewed_works / row.assigned_works) * 100) : 0"
                :stroke-width="12"
                :show-text="false"
                style="flex: 1; margin-left: 10px"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.task_status === 3 ? 'success' : row.task_status === 2 ? '' : 'warning'" size="small">
              {{ taskStatusMap[row.task_status] || '已分配' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.progress-container {
  padding: 20px;
  .header-bar {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    .title {
      font-size: 18px;
      font-weight: 600;
    }
  }
}
.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  .el-card {
    flex: 1;
    text-align: center;
    .stat-num {
      font-size: 32px;
      font-weight: 700;
      color: #409eff;
    }
    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-top: 4px;
    }
  }
}
.expert-table {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: var(--card-shadow);
}
.progress-cell {
  display: flex;
  align-items: center;
  .progress-text {
    min-width: 60px;
    font-size: 13px;
    color: #606266;
  }
  :deep(.el-progress__text) {
    display: none;
  }
}
</style>
