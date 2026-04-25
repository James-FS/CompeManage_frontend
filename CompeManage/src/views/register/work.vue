<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { Timer, DocumentChecked } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
// import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const myList = ref([])
let total = ref()
// --- 1. 模拟数据 ---
const mockData = [
  {
    id: 101,
    comp_id: 1,
    comp_name: '第十七届蓝桥杯全国软件和信息技术专业人才大赛',
    status: 1,
    submit_start_time: '2026-03-01 00:00:00',
    submit_end_time: '2026-03-10 23:59:59',
    work_url: '',
  },
  {
    id: 102,
    comp_id: 2,
    comp_name: '第十届中国国际“互联网+”大学生创新创业大赛',
    status: 1,
    submit_start_time: '2026-01-20 00:00:00',
    submit_end_time: '2026-02-20 23:59:59',
    work_url: 'http://example.com/file.zip',
  },
  {
    id: 103,
    comp_id: 3,
    comp_name: '2025年全国大学生数学建模竞赛',
    status: 1,
    submit_start_time: '2025-09-01 00:00:00',
    submit_end_time: '2025-09-04 20:00:00',
    work_url: 'http://example.com/math.pdf',
  },
  {
    id: 104,
    comp_id: 4,
    comp_name: '校内程序设计新生赛',
    status: 0,
    submit_start_time: '2026-01-01 00:00:00',
    submit_end_time: '2026-12-31 00:00:00',
    work_url: '',
  },
]

// --- 2. 状态计算逻辑 ---
const getActionState = (item) => {
  if (item.status !== 1 && item.status !== 4) {
    return {
      disabled: true,
      btnText: '资格审核中',
      btnType: 'info',
      tip: '您的报名尚未通过审核，暂无法提交作品',
    }
  }
  const now = new Date().getTime()
  const start = new Date(item.submit_start_time).getTime()
  const end = new Date(item.submit_end_time).getTime()

  if (now < start) {
    return {
      disabled: true,
      btnText: '通道未开启',
      btnType: 'info',
      tip: `提交通道开启时间：${item.submit_start_time}`,
    }
  }
  if (now > end) {
    return { disabled: true, btnText: '提交已截止', btnType: 'warning', tip: '作品提交通道已关闭' }
  }
  // 进行中状态
  return {
    disabled: false,
    btnText: item.work_url ? '修改作品' : '提交作品',
    btnType: 'primary',
    tip: item.work_url ? '截止前可覆盖提交' : '请在截止前完成提交',
  }
}

// --- 3. 跳转逻辑 ---
const handleAction = (item, state) => {
  if (state.disabled) return
  router.push({ name: 'work-detail', params: { id: item.id } })
}

async function fetchMyList() {
  try {
    const response = await api.getMyReg()
    if (response.code == 200) {
      myList.value = response.data.list||[]
      total.value = response.data.total
      console.log('我的参赛列表:', myList.value)
    }
    else{
      ElMessage.error('获取我的参赛列表失败:' + response.message)
    }
  } catch (error) {
    ElMessage.error('获取我的参赛列表失败:', error)
  }
}
onMounted(() => {
  loading.value = true
  setTimeout(() => {
    // myList.value = mockData
    loading.value = false
  }, 500)
  fetchMyList().finally(() => {
    loading.value = false
  })
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>我的参赛列表</h2>
    </div>

    <div v-loading="loading" class="comp-list">
      <el-empty v-if="myList.length === 0" description="您还没有报名任何赛事" />

      <div v-for="item in myList" :key="item.id" class="comp-card">
        <div class="comp-info">
          <div class="name-row">
            <el-tag
              v-if="item.status === 0"
              type="warning"
              effect="dark"
              size="small"
              class="status-badge"
              >待审核</el-tag
            >
            <el-tag
              v-else-if="item.status === 1"
              type="success"
              effect="dark"
              size="small"
              class="status-badge"
              >已报名</el-tag
            >
            <el-tag
              v-else-if="item.status === 4"
              type="success"
              effect="dark"
              size="small"
              class="status-badge"
              >已通过</el-tag
            >
            <el-tag
              v-else-if="item.status === 2"
              type="danger"
              effect="dark"
              size="small"
              class="status-badge"
              >已驳回</el-tag
            >
            <el-tag
              v-else-if="item.status === 5"
              type="danger"
              effect="dark"
              size="small"
              class="status-badge"
              >已驳回</el-tag
            >

            <h3 class="comp-name">{{ item.comp_name }}</h3>
          </div>

          <div class="meta-row">
            <span class="meta-item">
              <el-icon><Timer /></el-icon>
              提交时间：{{ item.submit_start_time }} ~ {{ item.submit_end_time }}
            </span>
          </div>
        </div>

        <div class="comp-action">
          <template v-for="state in [getActionState(item)]" :key="item.id">
            <div class="action-wrapper">
              <div class="status-text" v-if="!state.disabled" :class="{ disabled: state.disabled }">
                {{ state.tip }}
              </div>
              <div v-else style="height: 17px"></div>

              <div class="btn-group">
                <el-tooltip :content="state.tip" :disabled="!state.disabled" placement="top">
                  <div class="btn-container">
                    <el-button
                      :type="state.btnType"
                      :disabled="state.disabled"
                      class="primary-btn"
                      :class="{ 'is-disabled': state.disabled }"
                      @click="handleAction(item, state)"
                    >
                      <el-icon v-if="item.work_url" style="margin-right: 4px"
                        ><DocumentChecked
                      /></el-icon>
                      {{ state.btnText }}
                    </el-button>
                  </div>
                </el-tooltip>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 页面容器 */
.page-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  padding: 20px;
  min-height: 100%;
}

.page-header {
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
  gap: 16px;
}

/* 卡片样式 */
.comp-card {
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  /* 左侧信息区 */
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
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px; /* 间距稍微拉大一点 */
      font-size: 14px;
      color: #909399;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px; /* 图标和文字间距 */

        .el-icon {
          font-size: 16px;
          margin-top: -1px; /* 微调图标对齐 */
        }
      }
    }
  }

  /* 右侧操作区 */
  .comp-action {
    margin-left: 40px;
    flex-shrink: 0;

    .action-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .status-text {
      font-size: 12px;
      color: var(--primary-color);
      &.disabled {
        color: #909399;
      }
    }

    .btn-group {
      display: flex;
      align-items: center;

      /* 主要按钮 */
      .primary-btn {
        width: 140px; /*稍微加宽一点，因为没有查看详情按钮了，显得大气点*/
        height: 40px;
        font-weight: 600;
        font-size: 14px;
        border: none;

        &.el-button--primary:not(.is-disabled) {
          background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
          box-shadow: 0 4px 12px rgba(19, 194, 194, 0.3);
          transition: all 0.3s;
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(19, 194, 194, 0.4);
            opacity: 0.95;
          }
        }

        &.is-disabled {
          opacity: 0.7;
          box-shadow: none;
        }
      }
    }
  }
}
</style>
