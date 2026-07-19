<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const router = useRouter()

const searchForm = ref({ keyword: '', status: '' })
const statusOptions = [
  { label: '全部', value: '' },
  { label: '未初始化', value: 'uninit' },
  { label: '待评审', value: 'pending' },
  { label: '评审中', value: 'reviewing' },
  { label: '已完成', value: 'completed' },
]
const statusMap = {
  uninit: { text: '未初始化', type: 'info' },
  pending: { text: '待评审', type: 'warning' },
  reviewing: { text: '评审中', type: 'primary' },
  completed: { text: '已完成', type: 'success' },
}

const reviewList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.getReviewCompList({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchForm.value.keyword || undefined,
    })
    const data = res.data || res
    let list = data.list || []
    if (searchForm.value.status) {
      list = list.filter((item) => item.review_status === searchForm.value.status)
    }
    reviewList.value = list
    total.value = list.length
  } catch {
    reviewList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const handleReset = () => {
  searchForm.value = { keyword: '', status: '' }
  handleSearch()
}

const handleInit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认初始化赛事"${row.comp_name}"的评审任务？系统将为 ${row.total_experts} 位专家 × ${row.total_works} 份作品创建评审记录。`,
      '初始化评审任务',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
    )
    const res = await api.initReviewTasks({ comp_id: row.comp_id })
    ElMessage.success(res.message || '初始化成功')
    loadData()
  } catch {
    // 取消
  }
}

const handleViewProgress = (row) => {
  router.push(`/review/progress/${row.comp_id}`)
}

const handleViewResult = (row) => {
  router.push(`/review/result/${row.comp_id}`)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="review-container">
    <div class="search-container">
      <el-form :inline="true" :model="searchForm" class="search-form" label-width="80px" label-position="right">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="请输入赛事名称" clearable style="width: 220px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="评审状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 220px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item class="search-actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button type="default" :icon="Refresh" plain @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="review-table-container">
      <el-table v-loading="loading" :data="reviewList" stripe height="calc(100vh - 340px)" style="width: 100%">
        <template #empty>
          <el-empty description="暂无评审数据" />
        </template>
        <el-table-column prop="comp_name" label="赛事名称" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column prop="comp_level" label="赛事级别" width="100" align="center" />
        <el-table-column label="评审状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="statusMap[row.review_status]" :type="statusMap[row.review_status].type" size="small" effect="plain">
              {{ statusMap[row.review_status].text }}
            </el-tag>
            <span v-else>{{ row.review_status }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total_works" label="作品数" width="80" align="center" />
        <el-table-column prop="total_experts" label="专家数" width="80" align="center" />
        <el-table-column label="进度" width="150" align="center">
          <template #default="{ row }">
            <template v-if="row.total_records > 0">
              {{ row.reviewed_count }} / {{ row.total_records }}
              <el-progress :percentage="Math.round((row.reviewed_count / row.total_records) * 100)" :stroke-width="6" :show-text="false" style="width: 100px; display: block; margin: 2px auto 0" />
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.review_status === 'uninit' && row.total_works > 0 && row.total_experts > 0"
              type="warning" size="small" @click="handleInit(row)">
              初始化评审任务
            </el-button>
            <el-button
              v-if="row.review_status === 'pending' || row.review_status === 'reviewing' || row.review_status === 'completed'"
              type="primary" size="small" @click="handleViewProgress(row)">
              查看进度
            </el-button>
            <el-button
              v-if="row.review_status === 'completed'"
              type="success" size="small" @click="handleViewResult(row)">
              查看结果
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
          @size-change="handleSearch"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.review-container {
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
  padding: 20px;
  box-sizing: border-box;
}
.search-container {
  box-sizing: border-box;
  margin-bottom: 15px;
  padding: 20px 20px 10px 20px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;
  .search-form {
    .el-form-item {
      margin-bottom: 15px;
      margin-left: 15px;
    }
    .search-actions {
      margin-left: 45px;
      .el-button {
        margin-right: 10px;
      }
    }
  }
}
.review-table-container {
  box-sizing: border-box;
  padding: 20px 20px 10px 20px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;
}
.pagination-wrapper {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}
</style>
