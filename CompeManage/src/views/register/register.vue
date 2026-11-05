<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, ArrowRight, Calendar, User, Bell, Refresh } from '@element-plus/icons-vue'
import { ElPagination, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { formatTimeRange } from '@/utils/format'
import {
  COMP_CATEGORIES,
  getParticipantType,
  getStatusConfig,
  getTimeState,
} from '@/utils/competition'

const router = useRouter()
const compList = ref([])
const loading = ref(false)

const queryParams = ref({
  page: 1,
  page_size: 10,
  comp_name: '',
  comp_level: '',
  status: '',
  is_my: false,
  is_reg: true,
})

let total = ref(0)

function NavigateToRegister(compID) {
  router.push({ name: 'detail', params: { id: compID } })
}

async function fetchCompList() {
  loading.value = true
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
          detail: detail,
          timeState,
          timeRange: formatTimeRange(detail.reg_start_time, detail.reg_end_time),
        }
      })
      total.value = response.data.total
    }
  } catch (error) {
    ElMessage.error(error.message || '获取竞赛列表失败')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  queryParams.value.page = 1
  fetchCompList()
}

function resetFilters() {
  queryParams.value.comp_name = ''
  queryParams.value.comp_level = ''
  queryParams.value.status = ''
  applyFilters()
}

onMounted(() => {
  fetchCompList()
})
</script>

<template>
  <div class="page-container">
    <div class="filter-card">
      <el-form :inline="true" class="search-form" @submit.prevent>
        <el-form-item label="赛事名称">
          <el-input
            v-model="queryParams.comp_name"
            placeholder="请输入赛事名称"
            clearable
            style="width: 220px"
            @keyup.enter="applyFilters"
            @clear="applyFilters"
          />
        </el-form-item>
        <el-form-item label="赛事级别">
          <el-select v-model="queryParams.comp_level" placeholder="全部级别" clearable style="width: 130px" @change="applyFilters">
            <el-option v-for="lvl in ['校级', '省级', '国家级', '国际级']" :key="lvl" :label="lvl" :value="lvl" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 130px" @change="applyFilters">
            <el-option label="未开始" value="upcoming" />
            <el-option label="报名中" value="ongoing" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="applyFilters">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-loading="loading" class="comp-list">
      <el-empty v-if="!loading && compList.length === 0" description="暂无可报名的赛事" />
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
            <el-tag size="small" type="info" class="extra-tag">
              {{ getParticipantType(item.detail.participant_type) }}
            </el-tag>
          </div>
        </div>
        <div class="comp-action">
          <div class="btn-group">
            <!-- <el-button link type="info" class="sub-btn" @click.stop="handleNotice(item.id)">
              <el-icon><Bell /></el-icon> 通知
            </el-button> -->

            <el-button
              :type="item.timeState.type"
              :disabled="item.timeState.disabled"
              @click="NavigateToRegister(item.id)"
              class="primary-btn"
            >
              {{ item.timeState.label }}
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
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
}
.comp-list {
  display: flex;
  flex-direction: column;
  //   flex:1;
  margin-bottom: 40px;
  gap: 16px;
  margin-top: 20px;

  .comp-item {
    background-color: #fff;
    padding: var(--item-padding);
    border-radius: var(--card-radius);
    box-shadow: var(--card-shadow);
    border: 1px solid transparent;
    display: flex;
    justify-content: space-between; /* 左右布局 */
    align-items: center;
    cursor: pointer;
    transition: all 0.3s;
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--card-hover-shadow);
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
        /* 次要按钮（通知） */
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

        /* 主要按钮（报名） */
        .primary-btn {
          width: 120px;
          height: 38px;
          font-weight: 600;
          border: none;
          &.el-button--primary {
            background: linear-gradient(135deg, var(--primary-color) 0%, #36cfc9 100%);
            box-shadow: var(--primary-btn-shadow);
            transition: all 0.3s;
            &:hover {
              transform: translateY(-1px);
              box-shadow: var(--primary-btn-hover-shadow);
            }
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