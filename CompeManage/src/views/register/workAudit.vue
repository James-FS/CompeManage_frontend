<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api/index'

const router = useRouter()

const loading = ref(false)

const collegeList = ref([])
const compList = ref([])
const total = ref(0)

const queryForm = reactive({
  page: 1,
  page_size: 10,
  comp_name: '',
  manager: '',
  college: '',
  status: '',
})

const statusMap = {
  0: { label: '未开始', type: 'info' },
  1: { label: '进行中', type: 'success' },
  2: { label: '已结束', type: 'warning' },
}

const getStatusLabel = (status) => {
  return statusMap[status]?.label || '未知'
}

const getStatusType = (status) => {
  return statusMap[status]?.type || 'info'
}

const handleReset = () => {
  queryForm.comp_name = ''
  queryForm.manager = ''
  queryForm.college = ''
  queryForm.status = ''
  queryForm.page = 1
  queryForm.page_size = 10
  fetchCompList()
}

const loadCollegeList = async () => {
  try {
    const res = await api.getCollegeList()
    if (res.code === 200 || res.code === 0) {
      collegeList.value = res.data || []
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchCompList = async () => {
  loading.value = true
  try {
    const res = await api.getWorkAuditCompList(queryForm)
    if (res.code === 200 || res.code === 0) {
      compList.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.message || '加载作品审核赛事失败')
    }
  } catch (error) {
    ElMessage.error('加载作品审核赛事失败')
  } finally {
    loading.value = false
  }
}

const gotoCompDetail = (row) => {
  router.push({
    name: 'work-audit-comp-detail',
    params: { id: row.comp_id },
    query: { comp_name: row.comp_name || '' },
  })
}

onMounted(() => {
  loadCollegeList()
  fetchCompList()
})
</script>

<template>
  <div class="competition-container">
    <div class="search-container">
      <el-form :inline="true" :model="queryForm" class="search-form" label-width="100px" label-position="right">
        <el-form-item label="赛事名称">
          <el-input v-model="queryForm.comp_name" placeholder="请输入赛事名称" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="赛事负责人">
          <el-input v-model="queryForm.manager" placeholder="请输入负责人" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="所属学院">
          <el-select v-model="queryForm.college" placeholder="请选择所属学院" clearable style="width: 220px">
            <el-option v-for="college in collegeList" :key="college.id" :label="college.name" :value="college.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="赛事状态">
          <el-select v-model="queryForm.status" placeholder="请选择赛事状态" clearable style="width: 220px">
            <el-option label="未开始" value="0" />
            <el-option label="进行中" value="1" />
            <el-option label="已结束" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item class="search-actions">
          <el-button type="primary" :icon="Search" @click="fetchCompList">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="competition-table-container">
      <el-table v-loading="loading" :data="compList" stripe style="width: 100%" height="calc(100vh - 360px)">
        <el-table-column label="赛事名称" min-width="260" show-overflow-tooltip align="center">
          <template #default="scope">
            {{ scope.row.comp_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="赛事负责人" width="140" align="center">
          <template #default="scope">
            {{ scope.row.manager_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="所属学院" width="220" align="center" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.college_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="提交人数" width="120" align="center">
          <template #default="scope">
            {{ scope.row.submit_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="赛事状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="plain">{{ getStatusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="gotoCompDetail(scope.row)">查看</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无符合条件的赛事" />
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.page_size"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="fetchCompList"
          @current-change="fetchCompList"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.competition-container {
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

.competition-table-container {
  box-sizing: border-box;
  padding: 20px 20px 10px 20px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;
}

.pagination-wrapper {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
</style>
