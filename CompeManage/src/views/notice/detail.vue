<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Edit, Delete, Bell, ArrowLeft, View } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 1. 状态定义
const loading = ref(false)
const compID = route.params.id // 从路由获取当前赛事ID
const competitionTitle = ref('加载中...') // 页面顶部显示的赛事名称
const searchKeyword = ref('')

// 2. 模拟表格数据
const tableData = ref([])

// 3. 获取数据 (模拟)
const fetchData = () => {
  loading.value = true
  // 模拟 API 请求：GET /api/competition/:ID/notices
  setTimeout(() => {
    competitionTitle.value = '第十届“互联网+”大学生创新创业大赛' // 模拟获取到的赛事名
    tableData.value = [
      {
        ID: 101,
        title: '关于延长报名时间的紧急通知',
        type: 2, // 1:普通, 2:紧急
        status: 1, // 1:已发布, 0:草稿
        viewCount: 1250,
        publishTime: '2026-03-15 10:00:00',
        creator: '张老师',
      },
      {
        ID: 102,
        title: '初赛路演答辩顺序安排公示',
        type: 1,
        status: 1,
        viewCount: 890,
        publishTime: '2026-04-01 09:30:00',
        creator: '李助理',
      },
      {
        ID: 103,
        title: '决赛及颁奖典礼流程草案',
        type: 1,
        status: 0, // 草稿
        viewCount: 0,
        publishTime: '-',
        creator: '王主任',
      },
    ]
    loading.value = false
  }, 500)
}

async function fetchNoticeList() {
  try {
    const res = await api.getNoticeList({ compID: route.params.id })
    tableData.value = res.data.list
  } catch (err) {
    ElMessage.error('获取通知列表失败')
  }
}

onMounted(() => {
  fetchNoticeList()
  // fetchData()
})

// 4. 操作逻辑
function handleCreate() {
  router.push({
    name: 'NoticeEdit',
    params: { id: 0 },
    query: { compID: compID },
  })
}

function handleEdit(row) {
  // 跳转到编辑页，带上通知ID进行回显
  // 路由建议配置为：/competition/notice/edit/:noticeID
  router.push({
    name: 'NoticeEdit',
    params: { id: row.ID },
  })
}

function handleDelete(row) {
  ElMessageBox.confirm(`确定要删除通知 "${row.title}" 吗？此操作不可恢复。`, '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const res = await api.deleteNotice(row.ID)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        fetchNoticeList() 
      } else {
        ElMessage.error(res.data.msg || '删除失败')
      }
    } catch (error) {
      ElMessage.error('删除失败：' + error.message)
    }
  })
}

// 状态切换 (发布/撤回)
const handleStatusChange = (row) => {
  const action = row.status === 1 ? '发布' : '撤回'
  ElMessage.success(`通知已${action}`)
}
</script>

<template>
  <div class="notice-list-container">
    <div class="context-header">
      <div class="left">
        <el-button link @click="router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <div class="divIDer"></div>
        <div class="comp-info">
          <span class="label">当前管理赛事：</span>
          <span class="value">{{ competitionTitle }}</span>
        </div>
      </div>
    </div>

    <el-card shadow="never" class="main-card">
      <div class="toolbar">
        <!-- <div class="filter-box">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索通知标题..."
            prefix-icon="Search"
            style="wIDth: 240px"
            clearable
            @clear="fetchData"
          />
        </div> -->
        <div class="action-box">
          <el-button type="primary" @click="handleCreate">
            <el-icon class="mr-1"><Plus /></el-icon> 发布新通知
          </el-button>
        </div>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: 'var(--table-header-bg)', color: 'var(--text-primary)' }"
      >
        <el-table-column prop="title" label="通知标题" min-wIDth="200">
          <template #default="{ row }">
            <span class="table-title" @click="handleEdit(row)">{{ row.title }}</span>
          </template>
        </el-table-column>

        <!-- <el-table-column prop="type" label="类型" wIDth="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 2 ? 'danger' : 'primary'" effect="light" size="small">
              {{ row.type === 2 ? '紧急' : '普通' }}
            </el-tag>
          </template>
        </el-table-column> -->

        <!-- <el-table-column prop="creator" label="发布人" wIDth="120" /> -->

        <el-table-column prop="publish_time" label="发布时间" wIDth="180" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ row.publish_time }}</span>
          </template>
        </el-table-column>

        <!-- <el-table-column label="浏览" wIDth="100" align="center">
           <template #default="{ row }">
             <div class="view-data">
               <el-icon><View /></el-icon> {{ row.viewCount }}
             </div>
           </template>
        </el-table-column> -->

        <el-table-column label="状态" wIDth="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              size="small"
              inline-prompt
              active-text="已发布"
              inactive-text="草稿"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" wIDth="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-box">
        <el-pagination background layout="total, prev, pager, next" :total="tableData.length" />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.notice-list-container {
  --header-bg: #ffffff;
  --table-header-bg: #f5f7fa;
  --brand-color: #409eff;

  background-color: var(--background-color);
  min-height: calc(100vh - 60px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部情境头 */
.context-header {
  background: var(--header-bg);
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

  .left {
    display: flex;
    align-items: center;
    gap: 12px;

    .divIDer {
      width: 1px;
      height: 14px;
      background: #e4e7ed;
    }

    .comp-info {
      font-size: 14px;
      .label {
        color: var(--text-secondary);
      }
      .value {
        font-weight: bold;
        color: var(--text-primary);
        margin-left: 4px;
      }
    }
  }
}

/* 主卡片样式 */
.main-card {
  flex: 1;
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

/* 表格内样式 */
.table-title {
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--brand-color);
  }
}

.time-text {
  font-family: monospace;
  color: var(--text-secondary);
}

.view-data {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pagination-box {
  margin-top: auto; /* 推到底部 */
  padding-top: 20px;
  display: flex;
  justify-content: center;
}

.mr-1 {
  margin-right: 4px;
}
</style>
