<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, ArrowLeft, DocumentChecked, DocumentRemove } from '@element-plus/icons-vue'
import { formatTime } from '@/utils/format'
const route = useRoute()
const router = useRouter()

// 1. 状态定义
const loading = ref(false)
const compID = route.params.id
const competitionTitle = ref('加载中...')

// 2. 表格数据
const tableData = ref([])

// 3. 获取数据
async function fetchNoticeList() {
  loading.value = true
  try {
    const res = await api.getNoticeList({ compID: route.params.id })
    tableData.value = res.data.list
  } catch (err) {
    ElMessage.error('获取通知列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNoticeList()
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
  router.push({
    name: 'NoticeEdit',
    params: { id: row.ID },
  })
}

function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除通知 "${row.title}" 吗？此操作不可恢复。`, 
    '删除确认', 
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    }
  ).then(async () => {
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

// 发布/撤回通知
async function handlePublish(row) {
  const action = row.status === 1 ? '撤回' : '发布'
  const newStatus = row.status === 1 ? 0 : 1
  
  try {
    const res = await api.updateNoticeStatus({ 
      id: row.ID, 
      status: newStatus 
    })
    
    if (res.code === 0) {
      ElMessage.success(`${action}成功`)
      row.status = newStatus // 更新本地状态
    } else {
      ElMessage.error(res.msg || `${action}失败`)
    }
  } catch (error) {
    ElMessage.error(`${action}失败：` + error.message)
  }
}
</script>

<template>
  <div class="notice-list-container">
    <!-- 顶部面包屑导航 -->

    <!-- 主内容卡片 -->
    <el-card shadow="hover" class="main-card">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-title">
          <el-icon class="title-icon"><DocumentChecked /></el-icon>
          <span>通知公告管理</span>
        </div>
        <el-button type="primary" @click="handleCreate" size="default">
          <el-icon><Plus /></el-icon>
          <span>发布新通知</span>
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        class="notice-table"
        :header-cell-style="{ 
          background: '#f5f7fa', 
          color: '#606266',
          fontWeight: '600'
        }"
      >
        <!-- 通知标题 -->
        <el-table-column prop="title" label="通知标题" min-width="200" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <span class="table-title" @click="handleEdit(row)">
                {{ row.title }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 发布时间 -->
        <el-table-column prop="publish_time" label="发布时间"  align="center">
          <template #default="{ row }">
            <div class="time-cell">
              <el-icon class="time-icon"><Timer /></el-icon>
              <span>{{ row.publish_time || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="publish_time" label="更新时间" align="center">
          <template #default="{ row }">
            <div class="time-cell">
              <el-icon class="time-icon"><Timer /></el-icon>
              <span>{{ formatTime(row.UpdatedAt,"YYYY-MM-DD HH:mm:ss") || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 状态 - 改为标签 -->
        <el-table-column label="状态"  align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.status === 1 ? 'success' : 'info'" 
              effect="plain"
              size="default"
            >
              {{ row.status === 1 ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 操作 - 根据状态显示不同按钮 -->
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <!-- 编辑按钮 -->
              <el-button 
                link 
                type="primary" 
                size="small" 
                @click="handleEdit(row)"
              >
                <el-icon><Edit /></el-icon>
                <span>编辑</span>
              </el-button>

              <!-- 发布/撤回按钮 - 根据状态显示 -->
              <el-button
                v-if="row.status === 0"
                link
                type="success"
                size="small"
                @click="handlePublish(row)"
              >
                <el-icon><DocumentChecked /></el-icon>
                <span>发布</span>
              </el-button>

              <el-button
                v-else
                link
                type="warning"
                size="small"
                @click="handlePublish(row)"
              >
                <el-icon><DocumentRemove /></el-icon>
                <span>撤回</span>
              </el-button>

              <!-- 删除按钮 -->
              <el-button 
                link 
                type="danger" 
                size="small" 
                @click="handleDelete(row)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-box">
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :total="tableData.length"
          :page-size="10"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.notice-list-container {
  box-sizing: border-box;
  min-height: calc(100vh - 110px);
  padding: 24px;
  background: linear-gradient(to bottom, #f0f2f5 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ========== 顶部导航 ========== */
.context-header {
  background: #ffffff;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 16px;

    .back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #606266;
      transition: color 0.3s;

      &:hover {
        color: #409eff;
      }
    }

    .divider {
      width: 1px;
      height: 16px;
      background: #dcdfe6;
    }

    .comp-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;

      .label {
        color: #909399;
      }

      .value {
        font-weight: 600;
        color: #303133;
      }
    }
  }
}

/* ========== 主卡片 ========== */
.main-card {
  flex: 1;
  border-radius: 12px;

  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 24px;
  }
}

/* ========== 工具栏 ========== */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f2f5;

  .toolbar-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;

    .title-icon {
      font-size: 20px;
      color: #409eff;
    }
  }
}

/* ========== 表格样式 ========== */
.notice-table {
  flex: 1;

  .title-cell {
    display: flex;
    align-items: center;
  }

  .table-title {
    font-weight: 500;
    color: #303133;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 2px;
      background: #409eff;
      transition: width 0.3s;
    }

    &:hover {
      color: #409eff;
      
      &::after {
        width: 100%;
      }
    }
  }

  .time-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #606266;
    font-size: 13px;

    .time-icon {
      color: #909399;
    }
  }

  .action-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    .el-button {
      padding: 4px 8px;
      
      span {
        margin-left: 4px;
      }
    }
  }
}

/* ========== 分页 ========== */
.pagination-box {
  margin-top: 24px;
  padding-top: 16px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #f0f2f5;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .notice-list-container {
    padding: 12px;
  }

  .context-header {
    padding: 12px 16px;

    .left {
      gap: 12px;

      .comp-info {
        font-size: 13px;
      }
    }
  }

  .main-card {
    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>