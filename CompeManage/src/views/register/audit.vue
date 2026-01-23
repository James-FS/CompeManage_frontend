<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router' // ✨ 引入 useRouter
import { Search, Refresh, CircleCheck, Message } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/index.js'
let total = ref(100)
const router = useRouter() // ✨ 初始化 router

// --- 1. 模拟数据 ---
const regList = ref([
  {
    id: 101,
    comp_name: '第十五届蓝桥杯全国软件大赛',
    leader_name: '张三',
    stu_id: '2021001',
    email: 'zhangsan@edu.cn',
    create_time: '2026-01-23 10:00',
    status: 0,
    attachment_url: '/static/reg_attachments/demo.pdf',
    members: [{ name: '张三', stu_id: '2021001', phone: '138001', is_leader: true }],
  },
  {
    id: 102,
    comp_name: 'ACM程序设计大赛',
    leader_name: '李四',
    stu_id: '2021005',
    email: 'lisi@qq.com',
    create_time: '2026-01-22 14:30',
    status: 1,
    members: [],
  },
  {
    id: 103,
    comp_name: '全国大学生数学建模竞赛',
    leader_name: '王五',
    stu_id: '2021009',
    email: 'wangwu@163.com',
    create_time: '2026-01-20 09:15',
    status: 0,
    members: [],
  },
])

// --- 2. 状态字典 ---
const statusMap = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已驳回', type: 'danger' },
}

// --- 3. 筛选与重置 ---
const queryForm = reactive({
  page: '1',
  pageSize: '10',
  keyword: '',
  status: '',
  comp_id: '',
  email: '',
})
const loading = ref(false)
const selectedRows = ref([])

const handleReset = () => {
  queryForm.keyword = ''
  queryForm.status = ''
  queryForm.comp_id = ''
  queryForm.email = ''
  ElMessage.info('筛选条件已重置')
}

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

// --- 操作逻辑 ---

// 单个通过
const handleQuickPass = (row) => {
  ElMessageBox.confirm(`确认直接通过 [${row.leader_name}] 的报名申请吗？`, '快捷审核', {
    confirmButtonText: '确定通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => {
    row.status = 1
    ElMessage.success('审核已通过')
  })
}

// 批量通过
const handleBatchPass = () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先勾选记录')

  ElMessageBox.confirm(`确定要批量通过选中的 ${selectedRows.value.length} 条记录吗？`, '批量通过', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => {
    ElMessage.success('批量通过成功')
    selectedRows.value = []
  })
}

// --- 跳转详情页 ---
function NavigateToDetail(row) {
  router.push(`/register/audit/detail/${row.id}`)
}

async function fetchRegList() {
  try {
    const response = await api.getRegList(queryForm)
    if (response.code === 200) {
      regList.value = response.data;
      total.value = response.data.total
    } else {
      ElMessage.error('获取报名列表失败: ' + response.message)
    }
  } catch (err) {
    ElMessage.error('获取报名列表失败', err)
  }
}

onMounted(() => {
  fetchRegList()
})
</script>

<template>
  <div class="list-container">
    <div class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="赛事">
          <el-select
            v-model="queryForm.comp_id"
            placeholder="全部赛事"
            style="width: 140px"
            clearable
          >
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="queryForm.status"
            placeholder="全部状态"
            style="width: 110px"
            clearable
          >
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input
            v-model="queryForm.email"
            placeholder="搜邮箱"
            style="width: 150px"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryForm.keyword"
            placeholder="搜负责人"
            style="width: 140px"
            :prefix-icon="Search"
          />
        </el-form-item>

        <el-form-item>
          <el-button class="teal-btn" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="action-bar">
      <div class="left-actions">
        <el-button type="success" plain :icon="CircleCheck" @click="handleBatchPass">
          批量通过
        </el-button>
      </div>
      <div class="right-info">
        已选 <span class="num">{{ selectedRows.length }}</span> 项
      </div>
    </div>

    <div class="table-container">
      <el-table
        :data="regList"
        v-loading="loading"
        stripe
        style="width: 100%"
        height="100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column prop="id" label="ID" width="60" align="center" />

        <el-table-column label="赛事名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="comp-text">{{ row.comp_name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="负责人" width="140">
          <template #default="{ row }">
            <div class="leader-cell">
              <span class="name">{{ row.leader_name }}</span>
              <span class="stu-id">{{ row.stu_id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="联系邮箱" width="180" show-overflow-tooltip />

        <el-table-column prop="create_time" label="报名时间" width="160" />

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <div class="status-dot-wrapper">
              <span class="status-dot" :class="'status-' + row.status"></span>
              <span>{{ statusMap[row.status].label }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link class="btn-detail" @click="NavigateToDetail(row)">详情</el-button>
            <el-button v-if="row.status === 0" link class="btn-pass" @click="handleQuickPass(row)">
              通过
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <el-pagination background layout="sizes,jumper,prev, pager, next" :total="100" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:root {
  --primary-color: var(--primary-color);
  --primary-dark: #08979c;
}

.list-container {
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  padding: 16px;
  gap: 12px;
}

.filter-card {
  background: #fff;
  padding: 18px 18px 0;
  border-radius: 4px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding: 0 4px;

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
}

.comp-text {
  font-weight: 500;
  color: var(--text-primary);
}

.leader-cell {
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
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 按钮样式适配 */
.teal-btn {
  background-color: #fff;
  color: var(--primary-color);
  border-color: var(--primary-color);
  &:hover {
    background-color: #e6fffb;
    border-color: var(--primary-color);
  }
}
.teal-btn-filled {
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  width: 100%;
  &:hover {
    background-color: #08979c;
  }
}
</style>
