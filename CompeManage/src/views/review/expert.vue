<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()

const taskList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const taskStatusMap = { 0: '已分配', 1: '待评审', 2: '评审中', 3: '已完成' }
const taskStatusType = { 0: 'info', 1: 'warning', 2: '', 3: 'success' }

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.getMyReviewTasks({ page: currentPage.value, size: pageSize.value })
    const data = res.data || res
    taskList.value = data.list || []
    total.value = data.total || 0
  } catch {
    taskList.value = []
  } finally {
    loading.value = false
  }
}

const handleEnter = (row) => {
  router.push(`/review/expert/works/${row.comp_id}?task_id=${row.task_id}`)
}

const handleSizeChange = () => loadData()
const handleCurrentChange = () => loadData()

onMounted(loadData)
</script>

<template>
  <div class="expert-container">
    <div class="page-title">我的评审任务</div>

    <div class="task-table" v-loading="loading">
      <el-table :data="taskList" stripe style="width: 100%" empty-text="暂无评审任务">
        <el-table-column prop="comp_name" label="赛事名称" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column prop="comp_level" label="赛事级别" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="taskStatusType[row.task_status]" size="small">
              {{ taskStatusMap[row.task_status] || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="150" align="center">
          <template #default="{ row }">
            {{ row.reviewed_count }} / {{ row.total_works }}
          </template>
        </el-table-column>
        <el-table-column label="评审时间" min-width="240" align="center">
          <template #default="{ row }">
            <span v-if="row.review_start_time && row.review_end_time">
              {{ row.review_start_time.replace('T', ' ').slice(0, 16) }} ~ {{ row.review_end_time.replace('T', ' ').slice(0, 16) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEnter(row)">进入评审</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.expert-container {
  padding: 20px;
  .page-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 20px;
  }
}
.task-table {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: var(--card-shadow);
}
.pagination-wrapper {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}
</style>
