<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, ArrowRight, Calendar, User, Bell } from '@element-plus/icons-vue'
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

const queryParams = ref({
  page: 1,
  page_size: 10,
  keyword: '',
  category: '全部',
  is_my: false,
  is_reg: true,
})

let total = ref(0)

function NavigateToRegister(compID) {
  router.push({ name: 'detail', params: { id: compID } })
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
          detail: detail, 
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
    <div class="filter-panel">
      <div class="search-row">
        <el-input
          v-model="queryParams.keyword"
          placeholder="搜索赛事名称"
          prefix-icon="Search"
          clearable
        >
          <template #append><el-button type="primary">搜索</el-button></template>
        </el-input>
      </div>

      <el-divider class="filter-divider" />

      <div class="discipline-row">
        <span class="filter-label">学科分类：</span>
        <div class="options-area">
          <span
            v-for="cat in COMP_CATEGORIES"
            :key="cat"
            class="filter-tag"
            :class="{ active: queryParams.category === cat }"
            @click="queryParams.category = cat"
          >
            {{ cat }}
          </span>
        </div>
      </div>

      <div class="level-row">
        <span class="filter-label">赛事级别：</span>
        <div class="options-area">
          <span
            v-for="lvl in ['全部', '国家级', '省级', '校级']"
            :key="lvl"
            class="filter-tag"
            :class="{ active: queryParams.CompLevel === lvl }"
            @click="queryParams.CompLevel = lvl"
          >
            {{ lvl }}
          </span>
        </div>
      </div>

      <div class="status-row">
        <span class="filter-label">赛事状态：</span>
        <div class="options-area">
          <span
            v-for="(label, value) in {
              all: '全部',
              upcoming: '未开始',
              ongoing: '进行中',
              ended: '已结束',
            }"
            :key="value"
            class="filter-tag"
            :class="{ active: queryParams.status === value }"
            @click="queryParams.status = value"
          >
            {{ label }}
          </span>
        </div>
      </div>
    </div>

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
            <el-tag size="small" type="info" class="extra-tag">
              {{ getParticipantType(item.detail.participant_type) }}
            </el-tag>
          </div>
        </div>
        <div class="comp-action">
          <div class="btn-group">
            <el-button link type="info" class="sub-btn" @click.stop="handleNotice(item.id)">
              <el-icon><Bell /></el-icon> 通知
            </el-button>

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
        :page-sizes="[10, 20, 50, 100]"
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
  padding: 20px;
}
.filter-panel {
  box-sizing: border-box;
  background-color: #fff;
  padding: 24px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  .filter-divider {
    margin: 16px 0;
  }
  .discipline-row,
  .level-row,
  .status-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;
    font-size: var(--primary-font);
    &:last-child {
      margin-bottom: 0;
    }
    &.search-row {
      margin-bottom: 0;
    }
    .filter-label {
      width: 80px;
      color: #909399;
      line-height: 28px;
      flex-shrink: 0;
    }
    .options-area {
      flex: 1;
      display: flex;
      flex-wrap: wrap; /* 允许换行 */
      gap: 10px;
      .filter-tag {
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        color: #606266;
        line-height: 20px;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          color: #13c2c2;
          background-color: #f0fdfa;
        }

        &.active {
          background-color: #13c2c2;
          color: #fff;
          font-weight: 500;
        }
      }
    }
  }
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
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05); /* 默认微弱阴影 */
    border: 1px solid transparent;
    display: flex;
    justify-content: space-between; /* 左右布局 */
    align-items: center;
    cursor: pointer;
    transition: all 0.3s;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      .comp-name {
        color: #13c2c2;
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
            color: #13c2c2;
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
            background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
            box-shadow: 0 4px 12px rgba(19, 194, 194, 0.3);
            transition: all 0.3s;
            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 6px 16px rgba(19, 194, 194, 0.4);
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