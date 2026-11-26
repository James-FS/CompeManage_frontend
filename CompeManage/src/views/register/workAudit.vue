<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api/index'
import ListTableCard from '@/components/ListTableCard.vue'

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
  collegeList.value = await api.getCompetitionUnits()
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
  <div class="table-list-page">
    <div class="filter-card">
      <el-form :inline="true" :model="queryForm" class="table-list-filters">
        <el-form-item label="赛事名称">
          <el-input v-model="queryForm.comp_name" placeholder="请输入赛事名称" clearable style="width: 220px" @keyup.enter="fetchCompList" @clear="fetchCompList" />
        </el-form-item>
        <el-form-item label="赛事负责人">
          <el-input v-model="queryForm.manager" placeholder="请输入负责人" clearable style="width: 220px" @keyup.enter="fetchCompList" @clear="fetchCompList" />
        </el-form-item>
        <el-form-item label="所属单位">
          <el-select v-model="queryForm.college" placeholder="全部单位" clearable filterable style="width: 220px" fit-input-width @change="fetchCompList">
            <el-option v-for="unit in collegeList" :key="unit" :label="unit" :value="unit">
              <span class="college-option-label" :title="unit">{{ unit }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="赛事状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width: 220px" @change="fetchCompList">
            <el-option label="未开始" value="0" />
            <el-option label="进行中" value="1" />
            <el-option label="已结束" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="fetchCompList">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <ListTableCard>
      <el-table v-loading="loading" :data="compList" stripe height="100%">
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
        <el-table-column label="所属单位" width="220" align="center" show-overflow-tooltip>
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

      <template #pagination>
        <el-pagination
          background
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.page_size"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="fetchCompList"
          @current-change="fetchCompList"
        />
      </template>
    </ListTableCard>
  </div>
</template>
