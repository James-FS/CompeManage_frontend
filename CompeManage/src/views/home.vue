<script setup>
import { ref,onMounted } from 'vue'
import api from '@/api'
import { ElCard, ElTag, ElIcon, ElMessage } from 'element-plus'
import { Trophy, DataAnalysis, ArrowRight, CircleCheck, Clock, Edit } from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import { useRouter } from 'vue-router'
const router = useRouter()
const loading=ref(false)
const noticeList = ref([
  {
    date: '2026.1.16',
    title: '关于开展2026年大学生创新创业大赛的通知',
    link: '',
  },
  {
    date: '2026.2.10',
    title: '关于举办2026年全国大学生数学竞赛的通知',
  },
])
const myStatusList = [
  {
    id: 1,
    title: '第十五届蓝桥杯软件赛',
    deadline: '报名截止: 2026-11-20',
    month: '10月',
    day: '15',
    status: '已通过',
    type: 'success', // 对应 el-tag 的 type
    bgClass: '', // 日期背景色类名（默认绿）
  },
  {
    id: 2,
    title: '2026互联网+创新创业大赛',
    deadline: '校赛初审中',
    month: '11月',
    day: '02',
    status: '审核中',
    type: 'warning',
    bgClass: 'warning-bg',
  },
  {
    id: 3,
    title: '大学生广告艺术大赛',
    deadline: '未提交报名表',
    month: '12月',
    day: '10',
    status: '草稿',
    type: 'info',
    bgClass: 'info-bg',
  },
]
function NavigateToNotice() {
  router.push('/notice')
}

function NavigateToMoreNotice() {
  router.push('/notice/list')
}

async function fetchNotices() {
  loading.value = true
  try {
    const response = await api.getNoticeList({ page: 1, pageSize: 5 })
    if (response && response.data) {
      noticeList.value = response.data.notices
    }
  } catch (error) {
   ElMessage.error('Failed to fetch notices:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNotices()
})
</script>

<template>
  <div class="home-container">
    <div class="card-container">
      <el-card class="notice-card">
        <template #header>
          <div class="notice-title">
            <span class="second-title">赛事通知</span>
            <div class="notice-more" @click="NavigateToMoreNotice">
              <span>更多</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>
        </template>
        <div
          class="notice-content"
          v-for="notice in noticeList"
          :key="notice.date"
          @click="NavigateToNotice"
          style="cursor: pointer"
        >
          <el-tag class="notice-tag" effect="dark">{{ notice.date }}</el-tag>
          <span>{{ notice.title }}</span>
        </div>
      </el-card>

      <div class="service-area">
        <el-card class="main-card">
          <template #header>
            <span class="second-title">欢迎使用学科竞赛管理系统</span>
          </template>
          <div class="index-content">
            <div class="index-card">
              <div class="icon-box">
                <el-icon :size="32"><Trophy /></el-icon>
              </div>
              <div class="text-box">
                <span class="card-title">国家级竞赛</span>
                <span class="card-desc">查看教育部白名单赛事</span>
              </div>
            </div>
            <div class="index-card">
              <div class="icon-box">
                <el-icon :size="32"><DataAnalysis /></el-icon>
              </div>
              <div class="text-box">
                <span class="card-title">省级竞赛</span>
                <span class="card-desc">查看教育部白名单赛事</span>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="status-card">
          <template #header>
            <div class="status-header">
              <span class="second-title">我的参赛</span>
            </div>
          </template>
          <div class="status-list">
            <div class="status-item" v-for="item in myStatusList" :key="item.id">
              
              <div class="icon-anchor" :class="'bg-' + item.type">
                 <el-icon v-if="item.type === 'success'"><CircleCheck /></el-icon>
                 <el-icon v-else-if="item.type === 'warning'"><Clock /></el-icon>
                 <el-icon v-else><Edit /></el-icon>
              </div>

              <div class="item-info">
                <div class="title-row">
                    <span class="item-title">{{ item.title }}</span>
                </div>
                <div class="meta-row">
                    <span class="deadline">截止: {{ item.deadline }}</span>
                </div>
              </div>

              <el-tag :type="item.type" effect="plain" round size="small" class="status-tag">
                {{ item.status }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-container {
  box-sizing: border-box;
  display: flex;
  padding: 24px;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
}

.card-container {
  padding: 0 10px;
  gap: 20px;
  display: flex;
  height: 100%;
  align-items: stretch;
  justify-content: space-around;
  .service-area {
    flex: 0.8;
    display: flex;
    flex-direction: column;
    gap: 20px;
    .main-card {
      flex: 0 0 auto;
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
      .index-content {
        display: flex;
        flex-direction: column;
        gap: 15px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        .index-card {
          background-color: #f8fafc;
          border: 1px solid #eaeff5;
          height: 72px;
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: center;
          // justify-content: center;
          padding: 0 25px;
          box-sizing: border-box;
          gap: 15px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          &:hover {
            background-color: #ffffff;
            border-color: #ffffff;
            transform: translateY(-5px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

            .icon-box {
              width: 40px;
              height: 40px;
              color: #13c2c2; /* 你的主题绿 */
              transform: scale(1.1);
            }

            /* 4. 箭头变色 + 向右移动 */
            .arrow-icon {
              color: #13c2c2;
              transform: translateX(5px);
            }
          }

          .icon-box {
            width: 50px;
            height: 50px;
            background-color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 图标微阴影 */
            transition: transform 0.3s ease; /* 图标单独的缩放动画 */
            color: #606266;
          }
          .text-box {
            display: flex;
            flex-direction: column;
            flex: 1; /* 占满中间剩余空间 */
            .card-title {
              font-size: 16px;
              font-weight: 600;
              color: #303133;
              margin-bottom: 4px;
            }
            .card-desc {
              font-size: 12px;
              color: #909399;
            }
          }
          &:hover {
            background-color: #e6e8eb; // 加个悬停效果
          }
        }
      }
    }
    .status-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
      :deep(.el-card__body) {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding-top: 10px;
      }
      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .status-list {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 0 10px; /* 两侧留白 */
      }

      .status-item {
        display: flex;
        align-items: center;
        padding: 15px 5px; /* 上下间距加大，更透气 */
        border-bottom: 1px solid #f5f7fa; /* 极细的分割线 */
        transition: all 0.2s;
        cursor: pointer;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background-color: #fcfcfc; /* 极其微弱的悬停色，不抢眼 */
          
          /* 悬停时，标题变色 */
          .item-info .title-row .item-title {
              color: #13c2c2;
          }
        }

        .icon-anchor {
          width: 36px;
          height: 36px;
          border-radius: 50%; /* 圆形 */
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 14px;
          flex-shrink: 0;
          font-size: 18px; /* 图标大小 */

          /* 颜色的变体：背景淡色，图标深色 */
          &.bg-success { background-color: #f0fdfa; color: #13c2c2; }
          &.bg-warning { background-color: #fdf6ec; color: #e6a23c; }
          &.bg-info    { background-color: #f4f4f5; color: #909399; }
        }

        /* 中间文字区 */
        .item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow: hidden;

          .title-row {
             display: flex; 
             align-items: center;
             .item-title {
                font-size: 14px;
                color: #303133;
                font-weight: 500;
                /* 文字超长省略 */
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: color 0.2s;
             }
          }

          .meta-row {
             display: flex;
             align-items: center;
             .deadline {
                font-size: 12px;
                color: #999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
             }
          }
        }

        /* 右侧标签微调 */
        .status-tag {
           margin-left: 10px;
           background-color: transparent; 
           border: none;
           font-weight: bold;
           
           &.el-tag--success { color: #13c2c2; background: #f0fdfa; }
           &.el-tag--warning { color: #e6a23c; background: #fdf6ec; }
           &.el-tag--info    { color: #909399; background: #f4f4f5; }
        }
      }
    }
  }

  .notice-card {
    flex: 1;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);

    .notice-title {
      display: flex;
      justify-content: space-between;
      .notice-more {
        display: flex;
        align-items: center;
        gap: 3px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        &:hover {
          .arrow-icon {
            color: #13c2c2;
          }
          color: #13c2c2;
          transform: scale(1.05);
        }
      }
    }
    .notice-content {
      display: flex;
      align-items: center;
      padding: 15px 10px;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 10px;
      &:last-child {
        margin-bottom: 0;
      }
      &:hover {
        background-color: #f0fdfa;
        color: #13c2c2;
        transform: scale(1.02);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(19, 194, 194, 0.1);
        border-radius: 6px;
        border-bottom-color: transparent;
      }
      .notice-tag {
        margin-right: 10px;
      }
    }
  }
}

.arrow-icon {
  color: #dcdfe6; /* 平时是浅灰 */
  font-size: 20px;
  transition: color 0.3s ease;
}

.second-title {
  font-size: var(--card-title);
  font-weight: var(--card-weight);
}
</style>
