<script setup>
import { onMounted, ref } from 'vue'
import { Calendar, User, Bell, Setting } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formatTimeRange } from '@/utils/format'
import api from '@/api'
import { 
  getParticipantType,
  getStatusConfig,
  getTimeState,
} from '@/utils/competition'
const router = useRouter()

const compList = ref([])

const queryParams = ref({
  page: 1,
  page_size: 10,
  keyword: '',
  is_my: true,
  is_reg: true,
})

let total = ref(100)

// 按钮操作逻辑
function NavigateToSettings(compID) {
    router.push({name: 'edit-detail', params: { id: compID } })
}

function NavigateToNotice(compID) {
    router.push({name: 'NoticeDetail', params: { id: compID } })
}

async function fetchCompList() {
  try {
    const response = await api.getCompetitionList(queryParams.value)
    if (response.code == 200) {
      compList.value = response.data.list.map((item) => {
        const detail = item.detail || {}
        const timeState = getTimeState(
          detail.reg_start_time,
          detail.reg_end_time
        )
        return {
          ...item,
          timeState,
          timeRange: formatTimeRange(detail.reg_start_time, detail.reg_end_time),
        }
      })
      total.value = response.data.total
    }
  } catch (error) {
    ElMessage.error(error.message || '获取竞赛列表失败')
  }
}

onMounted(() => {
  fetchCompList()
})
</script>

<template>
  <div class="page-container">

    <div class="comp-list">
      <div class="comp-item" v-for="item in compList" :key="item.id">
        <div class="comp-info">
          <div class="name-row">
            <el-tag
              :type="item.timeState.tagType"
              effect="dark"
              size="small"
              class="status-badge"
            >
              {{ item.timeState.tagText }}
            </el-tag>
            <h3 class="comp-name">{{ item.comp_name }}</h3>
          </div>
          
          <div class="meta-row">
            <el-tag effect="plain" type="primary" size="small" class="level-tag">
              {{ item.comp_level }}
            </el-tag>

            <span class="divider"></span>
            <span class="meta-text">
              <el-icon><User /></el-icon> {{ item.organizer }}
            </span>

            <span class="divider"></span>

            <span class="meta-text time">
              <el-icon><Calendar /></el-icon> {{ item.timeRange }}
            </span>
          </div>
          
         <div class="tag-row">
            <el-tag  size="small" type="info" class="extra-tag">
              {{ getParticipantType(item.detail?.participant_type) }}
            </el-tag>
          </div>
        </div>

        <div class="comp-action">
          <div class="btn-group">
            <el-button link type="info" class="sub-btn" @click.stop="NavigateToNotice(item.id)">
              <el-icon><Bell /></el-icon> 发布通知
            </el-button>

            <el-button
              type="primary"
              class="primary-btn"
              @click.stop="NavigateToSettings(item.id)"
            >
              <el-icon style="margin-right: 6px"><Setting /></el-icon>
              报名设置
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          :page-sizes="[10, 20, 50]"
          @current-change="fetchCompList"
          @size-change="fetchCompList"
        />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  padding: var(--container-padding);
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h2 {
    margin: 0;
    font-size: 20px;
    color: #303133;
    font-weight: 600;
  }
}

.comp-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 40px;
  gap: 16px;
  
  .comp-item {
    background-color: #fff;
    padding: var(--item-padding);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    border: 1px solid transparent;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      .comp-name {
        color: var(--primary-color);
      }
    }

    .comp-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      .name-row {
        display: flex;
        align-items: center;
        gap: 12px;
        .status-badge {
          flex-shrink: 0;
        }
        .comp-name {
          margin: 0;
          font-size: 18px;
          color: #303133;
          font-weight: 600;
          line-height: 1.4;
          transition: color 0.2s;
        }
      }
      .meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        color: var(--table-text);
        .level-tag {
          font-weight: bold;
        }
        .divider {
          width: 1px;
          height: 12px;
          background: #e4e7ed;
        }
        .meta-text {
          display: flex;
          align-items: center;
          gap: 4px;
          &.time {
            color: var(--text-secondary);
            font-family: monospace;
            letter-spacing: -0.5px;
          }
        }
      }
      .tag-row {
        display: flex;
        gap: 8px;
        .extra-tag {
          background-color: #f7f8fa;
          border: none;
          color: #909399;
        }
      }
    }

    .comp-action {
      margin-left: 40px;
      flex-shrink: 0;
      .btn-group {
        display: flex;
        align-items: center;
        gap: 20px;
        
        .sub-btn {
          font-size: 13px;
          color: #909399;
          font-weight: normal;
          &:hover {
            color: var(--primary-color);
          }
          .el-icon {
            margin-right: 4px;
            position: relative;
            top: 1px;
          }
        }

        .primary-btn {
          width: 120px;
          height: 38px;
          font-weight: 600;
          border: none;
          background: linear-gradient(135deg, var(--primary-color) 0%, #36cfc9 100%);
          box-shadow: var(--primary-btn-shadow);
          transition: all 0.3s;
          &:hover {
               transform: translateY(-1px);
               box-shadow: var(--primary-btn-hover-shadow);
               opacity: 0.9;
          }
        }
      }
    }
  }
}

.pagination-container {
    display: flex;
    justify-content: center;
}
</style>