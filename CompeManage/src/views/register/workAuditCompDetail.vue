<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api/index'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const studentList = ref([])
const total = ref(0)

const compID = computed(() => Number(route.params.id || 0))
const compName = computed(() => route.query.comp_name || '')

const queryForm = reactive({
  page: 1,
  page_size: 10,
  keyword: '',
})

const fetchStudentList = async () => {
  if (!compID.value) {
    ElMessage.error('赛事参数错误')
    return
  }

  loading.value = true
  try {
    const params = {
      comp_id: compID.value,
      page: queryForm.page,
      page_size: queryForm.page_size,
      keyword: queryForm.keyword,
    }
    const res = await api.getWorkAuditStudentList(params)
    if (res.code === 200 || res.code === 0) {
      studentList.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.message || '加载提交学生列表失败')
    }
  } catch (error) {
    ElMessage.error('加载提交学生列表失败')
  } finally {
    loading.value = false
  }
}

const handleView = (row) => {
  router.push({
    name: 'work-audit-detail',
    params: { id: row.reg_id },
    query: {
      comp_id: String(compID.value),
      comp_name: compName.value || '',
    },
  })
}

onMounted(() => {
  fetchStudentList()
})
</script>

<template>
  <div class="competition-container">
    <div class="search-container">
      <div class="header-row">
        <div class="title-text">{{ compName || '当前赛事' }}</div>
      </div>

      <div class="search-row">
        <el-input
          v-model="queryForm.keyword"
          placeholder="输入队伍名/负责人/学号搜索"
          clearable
          style="width: 280px"
          @keyup.enter="fetchStudentList"
        />
        <el-button type="primary" :icon="Search" @click="fetchStudentList">搜索</el-button>
      </div>
    </div>

    <div class="competition-table-container">
      <el-table v-loading="loading" :data="studentList" stripe style="width: 100%" height="calc(100vh - 360px)">
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column prop="team_name" label="队伍名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="leader_name" label="负责人" width="120" align="center" />
        <el-table-column prop="stu_id" label="学号" width="130" align="center" />
        <el-table-column prop="college" label="学院" width="180" show-overflow-tooltip />
        <el-table-column prop="phone" label="联系电话" width="130" align="center" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="update_time" label="提交时间" width="160" align="center" />
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="handleView(scope.row)">查看</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="当前赛事暂无已提交作品" />
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.page_size"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="fetchStudentList"
          @current-change="fetchStudentList"
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
  padding: 20px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.search-row {
  display: flex;
  gap: 10px;
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
