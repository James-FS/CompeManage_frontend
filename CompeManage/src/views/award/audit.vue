<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, CircleCheck, CircleClose, Trophy, Filter } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/index.js'

const router = useRouter()
const awardList = ref([])
const total = ref(0)
const loading = ref(false)
const selectedRows = ref([])

// --- 状态字典 ---
const statusMap = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已驳回', type: 'danger' },
}

// 获奖等级字典
const levelMap = {
  国家级一等奖: { label: '国家级一等奖', color: '#f56c6c' },
  国家级二等奖: { label: '国家级二等奖', color: '#f56c6c' },
  国家级三等奖: { label: '国家级三等奖', color: '#f56c6c' },
  省级一等奖: { label: '省级一等奖', color: '#e6a23c' },
  省级二等奖: { label: '省级二等奖', color: '#e6a23c' },
  省级三等奖: { label: '省级三等奖', color: '#e6a23c' },
  校级一等奖: { label: '校级一等奖', color: '#409eff' },
  校级二等奖: { label: '校级二等奖', color: '#409eff' },
}

// --- 模拟数据 ---
const mockAwardData = [
  {
    id: 1,
    student_name: '张三',
    student_id: '20220001',
    comp_name: '2026年全国大学生计算机设计大赛',
    award_level: '国家级一等奖',
    award_date: '2026-05-15',
    phone: '13800138000',
    submit_time: '2026-02-02 10:30',
    status: 0,
  },
  {
    id: 1,
    student_name: '张三',
    student_id: '20220001',
    comp_name: '2026年全国大学生计算机设计大赛',
    award_level: '国家级一等奖',
    award_date: '2026-05-15',
    phone: '13800138000',
    submit_time: '2026-02-02 10:30',
    status: 0,
  },
  {
    id: 1,
    student_name: '张三',
    student_id: '20220001',
    comp_name: '2026年全国大学生计算机设计大赛',
    award_level: '国家级一等奖',
    award_date: '2026-05-15',
    phone: '13800138000',
    submit_time: '2026-02-02 10:30',
    status: 0,
  },
  {
    id: 1,
    student_name: '张三',
    student_id: '20220001',
    comp_name: '2026年全国大学生计算机设计大赛',
    award_level: '国家级一等奖',
    award_date: '2026-05-15',
    phone: '13800138000',
    submit_time: '2026-02-02 10:30',
    status: 0,
  },
  {
    id: 1,
    student_name: '张三',
    student_id: '20220001',
    comp_name: '2026年全国大学生计算机设计大赛',
    award_level: '国家级一等奖',
    award_date: '2026-05-15',
    phone: '13800138000',
    submit_time: '2026-02-02 10:30',
    status: 0,
  },
  {
    id: 2,
    student_name: '李四',
    student_id: '20220002',
    comp_name: '第十七届蓝桥杯全国软件和信息技术专业人才大赛',
    award_level: '省级二等奖',
    award_date: '2026-04-20',
    phone: '13800138001',
    submit_time: '2026-02-01 14:20',
    status: 1,
  },
  {
    id: 3,
    student_name: '王五',
    student_id: '20220003',
    comp_name: '2026年美国大学生数学建模竞赛(MCM/ICM)',
    award_level: '国家级二等奖',
    award_date: '2026-03-10',
    phone: '13800138002',
    submit_time: '2026-01-28 09:15',
    status: 1,
  },
  {
    id: 4,
    student_name: '赵六',
    student_id: '20220004',
    comp_name: '2026年全国大学生机器人大赛RoboMaster',
    award_level: '校级一等奖',
    award_date: '2026-06-05',
    phone: '13800138003',
    submit_time: '2026-02-02 15:45',
    status: 0,
  },
  {
    id: 5,
    student_name: '孙七',
    student_id: '20220005',
    comp_name: '2026年ACM-ICPC亚洲区域赛选拔',
    award_level: '国家级三等奖',
    award_date: '2026-05-30',
    phone: '13800138004',
    submit_time: '2026-01-30 11:22',
    status: 2,
  },
  {
    id: 6,
    student_name: '周八',
    student_id: '20220006',
    comp_name: '第十七届蓝桥杯全国软件和信息技术专业人才大赛',
    award_level: '省级一等奖',
    award_date: '2026-04-15',
    phone: '13800138005',
    submit_time: '2026-02-02 08:50',
    status: 0,
  },
  {
    id: 7,
    student_name: '吴九',
    student_id: '20220007',
    comp_name: '2026年全国大学生计算机设计大赛',
    award_level: '省级二等奖',
    award_date: '2026-05-20',
    phone: '13800138006',
    submit_time: '2026-01-29 16:30',
    status: 1,
  },
  {
    id: 8,
    student_name: '郑十',
    student_id: '20220008',
    comp_name: '2026年美国大学生数学建模竞赛(MCM/ICM)',
    award_level: '校级二等奖',
    award_date: '2026-03-25',
    phone: '13800138007',
    submit_time: '2026-02-02 13:10',
    status: 0,
  },
]

// --- 筛选与搜索 ---
const queryForm = reactive({
  page: 1,
  pageSize: 10,
  keyword: '', // 学生姓名/学号
  status: '', // 审核状态
  award_level: '', // 获奖等级
  comp_name: '', // 赛事名称
})

function handleReset() {
  queryForm.keyword = ''
  queryForm.status = ''
  queryForm.award_level = ''
  queryForm.comp_name = ''
  ElMessage.info('筛选条件已重置')
  fetchAwardList()
}

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

// --- 批量操作 ---
const batchRejectDialogVisible = ref(false)
const batchRejectReason = ref('')

const handleBatchPass = async () => {
  if (selectedRows.value.length === 0) return ElMessage.info('请先勾选记录')

  const pendingItems = selectedRows.value.filter((item) => item.status === 0)
  if (pendingItems.length === 0) return ElMessage.warning('选中的记录中没有"待审核"项')

  ElMessageBox.confirm(`确定要批量通过选中的 ${pendingItems.length} 条待审核记录吗？`, '批量通过', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success',
  }).then(async () => {
    loading.value = true
    try {
      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))

      pendingItems.forEach((item) => {
        item.status = 1
      })

      ElMessage.success(`成功通过 ${pendingItems.length} 条记录`)
      selectedRows.value = []
      fetchAwardList()
    } catch (error) {
      console.error(error)
      ElMessage.error('批量操作部分或全部失败，请刷新后重试')
      fetchAwardList()
    } finally {
      loading.value = false
    }
  })
}

const openBatchRejectDialog = () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先勾选记录')

  const pendingItems = selectedRows.value.filter((item) => item.status === 0)
  if (pendingItems.length === 0) return ElMessage.warning('选中的记录中没有"待审核"项')

  batchRejectReason.value = ''
  batchRejectDialogVisible.value = true
}

const handleBatchReject = async () => {
  if (!batchRejectReason.value.trim()) {
    return ElMessage.warning('请输入驳回原因')
  }

  const pendingItems = selectedRows.value.filter((item) => item.status === 0)
  loading.value = true

  try {
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500))

    pendingItems.forEach((item) => {
      item.status = 2
    })

    ElMessage.success(`成功驳回 ${pendingItems.length} 条记录`)
    batchRejectDialogVisible.value = false
    selectedRows.value = []
    fetchAwardList()
  } catch (error) {
    console.error(error)
    ElMessage.error('批量操作部分或全部失败，请刷新后重试')
    fetchAwardList()
  } finally {
    loading.value = false
  }
}

// --- 快速操作 ---
const handleQuickPass = (row) => {
  ElMessageBox.confirm(`确认直接通过 [${row.student_name}] 的获奖申报吗？`, '快捷审核', {
    confirmButtonText: '确定通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(async () => {
    try {
      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 300))
      row.status = 1
      ElMessage.success('审核已通过')
    } catch (e) {
      ElMessage.warning('' + e.message)
    }
  })
}

// --- 详情页跳转 ---
function navigateToDetail(row) {
  router.push(`/award/audit/detail/${row.id}`)
}

// --- 数据获取 ---
async function fetchAwardList() {
  loading.value = true
  try {
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 300))

    // 过滤数据
    let filtered = mockAwardData

    if (queryForm.comp_name) {
      filtered = filtered.filter((item) => item.comp_name.includes(queryForm.comp_name))
    }

    if (queryForm.keyword) {
      filtered = filtered.filter(
        (item) =>
          item.student_name.includes(queryForm.keyword) ||
          item.student_id.includes(queryForm.keyword),
      )
    }

    if (queryForm.award_level) {
      filtered = filtered.filter((item) => item.award_level === queryForm.award_level)
    }

    if (queryForm.status !== '') {
      filtered = filtered.filter((item) => item.status === Number(queryForm.status))
    }

    total.value = filtered.length

    // 分页
    const start = (queryForm.page - 1) * queryForm.pageSize
    const end = start + queryForm.pageSize
    awardList.value = filtered.slice(start, end)
  } catch (err) {
    ElMessage.info('无相关数据')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAwardList()
})
</script>

<template>
  <div class="list-container">
    <!-- 筛选卡片 -->
    <div class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form" label-width="70px" label-position="right">
        <el-form-item label="赛事名称">
          <el-input v-model="queryForm.comp_name" placeholder="请输入赛事名称" style="width: 200px" clearable
            @keyup.enter="fetchAwardList" />
        </el-form-item>

        <el-form-item label="学生姓名">
          <el-input v-model="queryForm.keyword" placeholder="请输入姓名或学号" style="width: 180px"
            @keyup.enter="fetchAwardList" />
        </el-form-item>

        <el-form-item label="获奖等级">
          <el-select v-model="queryForm.award_level" placeholder="全部" style="width: 140px" clearable>
            <el-option label="国家级一等奖" value="国家级一等奖" />
            <el-option label="国家级二等奖" value="国家级二等奖" />
            <el-option label="国家级三等奖" value="国家级三等奖" />
            <el-option label="省级一等奖" value="省级一等奖" />
            <el-option label="省级二等奖" value="省级二等奖" />
            <el-option label="省级三等奖" value="省级三等奖" />
            <el-option label="校级一等奖" value="校级一等奖" />
            <el-option label="校级二等奖" value="校级二等奖" />
          </el-select>
        </el-form-item>

        <el-form-item label="审核状态">
          <el-select v-model="queryForm.status" placeholder="全部" style="width: 120px" clearable>
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item class="filter-actions">
          <el-button type="primary" class="search-btn" :icon="Search" @click="fetchAwardList">
            查询
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格容器 -->
    <div class="table-container">
      <!-- 操作栏 -->
      <div class="action-bar">
        <div class="left-actions">
          <el-button type="success" plain :icon="CircleCheck" @click="handleBatchPass">
            批量通过
          </el-button>
          <el-button type="danger" plain :icon="CircleClose" @click="openBatchRejectDialog">
            批量驳回
          </el-button>
        </div>
        <div class="right-info">
          已选 <span class="num">{{ selectedRows.length }}</span> 项
        </div>
      </div>
      <el-table
        :data="awardList"
        v-loading="loading"
        stripe
        style="width: 100%; flex: 1; overflow: auto"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />

        <el-table-column label="学生信息" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="student-cell">
              <span class="name">{{ row.student_name }}</span>
              <span class="stu-id">{{ row.student_id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="赛事名称" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="comp-text">{{ row.comp_name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="获奖等级" width="130" align="center">
          <template #default="{ row }">
            <el-tag :style="{
              borderColor: levelMap[row.award_level]?.color,
              color: levelMap[row.award_level]?.color,
            }" effect="plain" size="small">
              {{ row.award_level }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="获奖日期" width="130" align="center">
          <template #default="{ row }">
            {{ row.award_date }}
          </template>
        </el-table-column>

        <el-table-column prop="submit_time" label="申报时间" width="150" sortable />

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <div class="status-dot-wrapper">
              <span class="status-dot" :class="'status-' + row.status"></span>
              <span>{{ statusMap[row.status]?.label || '未知' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link class="btn-detail" @click="navigateToDetail(row)"> 详情 </el-button>
            <el-button v-if="row.status === 0" link class="btn-pass" @click="handleQuickPass(row)">
              通过
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-bar">
        <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total"
          v-model:current-page="queryForm.page" v-model:page-size="queryForm.pageSize" @current-change="fetchAwardList"
          @size-change="fetchAwardList" />
      </div>
    </div>

    <!-- 批量驳回弹窗 -->
    <el-dialog v-model="batchRejectDialogVisible" title="批量驳回获奖申报" width="400px" align-center>
      <div style="margin-bottom: 12px; color: #606266; font-size: 14px">
        即将驳回
        <span style="color: #f56c6c; font-weight: bold">
          {{selectedRows.filter((i) => i.status === 0).length}}
        </span>
        条待审核记录
      </div>

      <el-input v-model="batchRejectReason" type="textarea" :rows="4" placeholder="请输入驳回原因（必填）" />

      <template #footer>
        <el-button @click="batchRejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleBatchReject" :loading="loading">
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
:root {
  --primary-dark: #08979c;
}

.list-container {
  min-height: calc(100vh - 110px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  padding: 16px;
  gap: 12px;
}

.filter-card {
  box-sizing: border-box;
  background: #fff;
  padding: 20px 20px 10px 20px;
  border-radius: 4px;
  box-shadow: var(--card-shadow);

  .filter-form {
    :deep(.el-form-item) {
      margin-bottom: 12px;
      margin-right: 24px;
    }

  }
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding: 0;

  .right-info {
    color: #909399;
    font-size: 13px;

    .num {
      color: var(--primary-color);
      font-weight: bold;
      margin: 0 2px;
    }
  }
}

.table-container {
  flex: 1;
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  max-height: calc(60vh - 5px);
  margin-top:10px;
}

.student-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.4;

  .name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .stu-id {
    font-size: 12px;
    color: #909399;
  }
}

.comp-text {
  font-weight: 500;
  color: var(--text-primary);
}

.status-dot-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;

  &.status-0 {
    background-color: #faad14;
  }

  &.status-1 {
    background-color: #52c41a;
  }

  &.status-2 {
    background-color: #ff4d4f;
  }
}

.btn-detail {
  color: #606266;

  &:hover {
    color: var(--primary-color);
  }
}

.btn-pass {
  color: var(--primary-color);
  font-weight: 500;

  &:hover {
    color: #08979c;
  }
}

.pagination-bar {
  flex-shrink: 0;
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
