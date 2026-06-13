<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const compId = Number(route.params.compId)
const taskId = Number(route.query.task_id)

const workList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const taskStatus = ref(0)
const statusFilter = ref('')

const isIndividualComp = computed(() => {
  return workList.value.length > 0 && workList.value.every((item) => !item.team_name)
})

const loadData = async () => {
  loading.value = true
  try {
    const params = { task_id: taskId, page: currentPage.value, size: pageSize.value }
    if (statusFilter.value !== '') {
      params.status = statusFilter.value
    }
    const res = await api.getMyReviewWorks(params)
    const data = res.data || res
    workList.value = data.list || []
    total.value = data.total || 0
    taskStatus.value = data.task_status || 0
  } catch {
    workList.value = []
  } finally {
    loading.value = false
  }
}

const handleScore = (row) => {
  router.push(`/review/expert/score/${row.reg_id}?task_id=${taskId}`)
}

const handleBack = () => {
  router.push('/review/expert')
}

const handleSizeChange = () => loadData()
const handleCurrentChange = () => loadData()

onMounted(loadData)
</script>

<template>
  <div class="works-container">
    <div class="header-bar">
      <el-button @click="handleBack" text>← 返回任务列表</el-button>
      <span class="title">作品列表</span>
      <el-select v-model="statusFilter" placeholder="筛选状态" clearable style="width: 140px; margin-left: auto" @change="loadData">
        <el-option label="全部" :value="''" />
        <el-option label="未评审" :value="0" />
        <el-option label="已评审" :value="1" />
      </el-select>
    </div>

    <div class="works-table" v-loading="loading">
      <el-table :data="workList" stripe style="width: 100%" empty-text="暂无作品数据">
        <el-table-column v-if="!isIndividualComp" prop="team_name" label="团队名称" min-width="180" align="center" />
        <el-table-column prop="leader_name" :label="isIndividualComp ? '参赛者' : '队长'" min-width="140" align="center" />
        <el-table-column label="作品链接" min-width="140" align="center">
          <template #default="{ row }">
            <el-button v-if="row.work_attachment_url" type="primary" link size="small"
              @click="api.downloadFile(row.work_attachment_url, true)">
              查看作品
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="评审状态" min-width="140" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.review_status === 1" type="success" size="small">已评审</el-tag>
            <el-tag v-else type="warning" size="small">待评审</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="得分" min-width="120" align="center">
          <template #default="{ row }">
            {{ row.score != null ? row.score : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleScore(row)">
              {{ row.review_status === 1 ? '修改' : '打分' }}
            </el-button>
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
.works-container {
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
.works-table {
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
