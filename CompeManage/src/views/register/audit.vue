<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, CircleCheck, CircleClose, Message, Iphone } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElPagination } from 'element-plus'
import api from '@/api/index.js'

let total = ref(100)
const router = useRouter()
const regList = ref([])

// ---  状态字典 ---
const statusMap = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已驳回', type: 'danger' },
}

// ---  筛选与重置 ---
const queryForm = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  comp_name: '',
  email: '',
  phone: '',
  participate_type: '', // 参赛类型
})
const loading = ref(false)
const selectedRows = ref([])
const batchRejectDialogVisible = ref(false)
const batchRejectReason = ref('')
function handleReset() {
  queryForm.keyword = ''
  queryForm.status = ''
  queryForm.comp_name = ''
  queryForm.email = ''
  queryForm.phone = ''
  queryForm.participate_type = ''
  ElMessage.info('筛选条件已重置')
  fetchRegList()
}

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

// --- 操作逻辑 ---
const handleQuickPass = (row) => {
  ElMessageBox.confirm(`确认直接通过 [${row.leader_name}] 的报名申请吗？`, '快捷审核', {
    confirmButtonText: '确定通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(async () => {
    try {
      await api.auditReg({ id: row.id, status: 1 })
      row.status = 1
      ElMessage.success('审核已通过')
    } catch (e) {
      row.status = 1
      ElMessage.warning('' + e.message)
    }
  })
}

const handleBatchPass = async () => {
  if (selectedRows.value.length === 0) return ElMessage.info('请先勾选记录')
  // 过滤出只有"待审核"状态的记录，防止对已审核的重复操作
  const pendingItems = selectedRows.value.filter((item) => item.status === 0)
  if (pendingItems.length === 0) return ElMessage.warning('选中的记录中没有“待审核”项')

  ElMessageBox.confirm(`确定要批量通过选中的 ${pendingItems.length} 条待审核记录吗？`, '批量通过', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success',
  }).then(async () => {
    loading.value = true
    try {
      const promises = pendingItems.map((item) => api.auditReg({ id: item.id, status: 1 }))
      await Promise.all(promises)

      ElMessage.success(`成功通过 ${pendingItems.length} 条记录`)
      selectedRows.value = [] // 清空选择
      fetchRegList() // 刷新列表
    } catch (error) {
      console.error(error)
      ElMessage.error('批量操作部分或全部失败，请刷新后重试')
      fetchRegList()
    } finally {
      loading.value = false
    }
  })
}

const openBatchRejectDialog = () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先勾选记录')

  // 过滤出只有"待审核"状态的记录
  const pendingItems = selectedRows.value.filter((item) => item.status === 0)
  if (pendingItems.length === 0) return ElMessage.warning('选中的记录中没有“待审核”项')

  batchRejectReason.value = '' // 清空之前的理由
  batchRejectDialogVisible.value = true
}

// 2. 弹窗中点击“确认驳回”：执行 API 请求
const handleBatchReject = async () => {
  if (!batchRejectReason.value.trim()) {
    return ElMessage.warning('请输入驳回原因')
  }

  const pendingItems = selectedRows.value.filter((item) => item.status === 0)
  loading.value = true // 开启 loading 防止重复点击

  try {
    // 并发调用审核接口，状态传 2 (驳回)，并附带理由
    const promises = pendingItems.map((item) =>
      api.auditReg({
        id: item.id,
        status: 2,
        reason: batchRejectReason.value,
      }),
    )

    await Promise.all(promises)

    ElMessage.success(`成功驳回 ${pendingItems.length} 条记录`)
    batchRejectDialogVisible.value = false // 关闭弹窗
    selectedRows.value = [] // 清空勾选
    fetchRegList() // 刷新列表
  } catch (error) {
    console.error(error)
    ElMessage.error('批量操作部分或全部失败，请刷新后重试')
    fetchRegList()
  } finally {
    loading.value = false
  }
}

// --- 跳转详情页 ---
function NavigateToDetail(row) {
  router.push(`/register/audit/detail/${row.id}`)
}

async function fetchRegList() {
  loading.value = true
  try {
    const response = await api.getRegList(queryForm)
    if (response.code === 200) {
      regList.value = response.data
      total.value = response.total
      console.log('API Response:', response.data) // 看看控制台里它到底是不是包含 total
    } else {
      ElMessage.error('获取报名列表失败: ' + response.message)
    }
  } catch (err) {
    ElMessage.info('无相关数据')
  } finally {
    loading.value = false
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
        <el-form-item label="赛事名称">
          <el-input
            v-model="queryForm.comp_name"
            placeholder="输入赛事名称"
            style="width: 260px"
            clearable
            @keyup.enter="fetchRegList"
          />
        </el-form-item>

        <el-form-item label="审核状态">
          <el-select v-model="queryForm.status" placeholder="全部" style="width: 120px" clearable>
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="负责人">
          <el-input
            v-model="queryForm.keyword"
            placeholder="姓名"
            style="width: 160px"
            :prefix-icon="Search"
            @keyup.enter="fetchRegList"
          />
        </el-form-item>

        <el-form-item label="联系电话">
          <el-input
            v-model="queryForm.phone"
            placeholder="手机号"
            style="width: 150px"
            :prefix-icon="Iphone"
            @keyup.enter="fetchRegList"
          />
        </el-form-item>

        <!-- <el-form-item label="联系邮箱">
          <el-input
            v-model="queryForm.email"
            placeholder="搜邮箱"
            style="width: 160px"
            :prefix-icon="Message"
            @keyup.enter="fetchRegList"
          />
        </el-form-item> -->
      </el-form>

      <el-form :inline="true" :model="queryForm" class="filter-form"> </el-form>

      <div class="filter-actions">
        <el-button type="primary" class="search-btn" :icon="Search" @click="fetchRegList">
          查询
        </el-button>
        <el-button :icon="Refresh" @click="handleReset"> 重置 </el-button>
      </div>
    </div>

    <div class="table-container">
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
        :data="regList"
        v-loading="loading"
        stripe
        style="width: 100%; flex: 1; overflow: auto"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <!-- <el-table-column prop="id" label="ID" width="60" align="center" /> -->

        <el-table-column label="赛事名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="comp-text">{{ row.comp_name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="负责人" width="160">
          <template #default="{ row }">
            <div class="leader-cell">
              <span class="name">{{ row.leader_name }}</span>
              <span class="stu-id">{{ row.stu_id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="电话" width="130" show-overflow-tooltip />

        <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />

        <el-table-column prop="create_time" label="报名时间" width="150" sortable />

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
            <el-button link class="btn-detail" @click="NavigateToDetail(row)">详情</el-button>
            <el-button v-if="row.status === 0" link class="btn-pass" @click="handleQuickPass(row)">
              通过
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.pageSize"
          @current-change="fetchRegList"
          @size-change="fetchRegList"
        />
      </div>
    </div>

    <el-dialog v-model="batchRejectDialogVisible" title="批量驳回" width="400px" align-center>
      <div style="margin-bottom: 12px; color: #606266; font-size: 14px">
        即将驳回
        <span style="color: #f56c6c; font-weight: bold">{{
          selectedRows.filter((i) => i.status === 0).length
        }}</span>
        条待审核记录
      </div>

      <el-input
        v-model="batchRejectReason"
        type="textarea"
        :rows="4"
        placeholder="请输入驳回原因（必填）"
      />

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
  padding: 24px 24px 20px; /* 调整内边距 */
  border-radius: 4px;

  .filter-form {
    /* 让表单项稍微整齐一些 */
    :deep(.el-form-item) {
      margin-bottom: 12px;
      margin-right: 24px;
    }
  }

  /* 6. 按钮组居中样式 */
  .filter-actions {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 10px;
    padding-top: 20px;
    border-top: 1px dashed #eee; /* 可选：加个虚线分割显得更清晰 */

    .el-button {
      width: 100px; /* 按钮稍微宽一点 */
    }

    .search-btn {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
      &:hover {
        background-color: #36cfc9;
        border-color: #36cfc9;
      }
    }
  }
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
  max-height: calc(55vh - 10px);
  margin-top: 10px;
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
  flex-shrink: 0;
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
