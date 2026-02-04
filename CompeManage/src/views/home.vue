<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import {
  Trophy, Bell, ArrowRight, Promotion,
  Checked, Management, Histogram, Timer,
  Document, UserFilled, Calendar, Refresh,
  Warning, CircleCheck, Phone, QuestionFilled,
  DataLine
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const role = computed(() => userStore.role || 'student')
const currentDate = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
})

const notices = ref([
  { id: 1, title: '关于启动2026年“挑战杯”大学生创业计划竞赛校赛的通知', date: '02-01', tag: '置顶', type: 'danger' },
  { id: 2, title: '2026年全国大学生数学建模竞赛报名缴费说明', date: '01-28', tag: '最新', type: 'primary' },
  { id: 3, title: '关于公布2025年度学科竞赛获奖名单的公示', date: '01-25', tag: '公示', type: 'warning' },
  { id: 4, title: '教务处关于规范学科竞赛学分认定的补充规定', date: '01-20', tag: '通知', type: 'info' },
  { id: 5, title: '计算机设计大赛校内选拔赛路演安排', date: '01-15', tag: '赛事', type: 'success' },
])

const upcomingEvents = ref([
  { id: 1, title: '蓝桥杯软件赛 - 报名截止', date: '2026-02-15', daysLeft: 3, color: '#F56C6C' },
  { id: 2, title: '互联网+大赛 - 校赛初审', date: '2026-02-20', daysLeft: 8, color: '#E6A23C' },
  { id: 3, title: 'ACM校队选拔 - 报名截止', date: '2026-02-28', daysLeft: 16, color: '#409EFF' },
])

const myProgressList = computed(() => {
  if (role.value === 'student') {
    return [
      { title: '互联网+创新创业大赛', action: '报名审核', status: '被退回', time: '10分钟前', state: 'danger', icon: Warning },
      { title: '蓝桥杯软件赛', action: '资格确认', status: '已通过', time: '昨天', state: 'success', icon: CircleCheck },
      { title: '全国大学生数学建模', action: '缴费状态', status: '处理中', time: '2天前', state: 'primary', icon: Refresh },
    ]
  } else {
    return [
      { title: '张三 - 互联网+大赛', action: '报名表审核', status: '已驳回', time: '刚刚', state: 'danger', icon: Warning },
      { title: '李四 - 蓝桥杯', action: '获奖证书', status: '已归档', time: '1小时前', state: 'success', icon: CircleCheck },
      { title: '王五 - 数学建模', action: '材料提交', status: '待审核', time: '3小时前', state: 'primary', icon: Refresh },
    ]
  }
})

const quickFunctions = computed(() => {
  const map = {
    school_admin: [
      { label: '赛事目录', path: '/competition/list', icon: Trophy, color: '#F56C6C' },
      { label: '目录审核', path: '/competition/audit', icon: Checked, color: '#409EFF' },
      { label: '权限管理', path: '/permission', icon: UserFilled, color: '#909399' },
      { label: '数据看板', path: '/statistics/dashboard', icon: Histogram, color: '#F56C6C' },
    ],
    student: [
      { label: '赛事报名', path: '/competition/list', icon: Trophy, color: '#F56C6C' },
      { label: '作品提交', path: '/register/work', icon: Document, color: '#409EFF' },
      { label: '我的获奖', path: '/award/student', icon: Checked, color: '#67C23A' },
      { label: '个人中心', path: '/profile', icon: UserFilled, color: '#909399' },
    ],
  }
  return map[role.value] || map['student']
})

const bannerStats = computed(() => {
  return [
    { label: '报名中赛事', value: '8', icon: Promotion },
    { label: '进行中赛事', value: '5', icon: Trophy },
    { label: '我的待办', value: '3', icon: Bell },
  ]
})
</script>

<template>
  <div class="portal-home">

    <div class="welcome-banner">
      <div class="banner-left">
        <h1 class="greeting">下午好，{{ userStore.userInfo?.name }}</h1>
        <p class="sub-greeting">欢迎使用学科竞赛管理系统</p>
      </div>
      <div class="banner-right">
        <div class="stat-group">
          <div class="stat-item" v-for="stat in bannerStats" :key="stat.label">
            <div class="stat-icon-bg"><el-icon>
                <component :is="stat.icon" />
              </el-icon></div>
            <div class="stat-text">
              <span class="stat-val">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-grid">

      <div class="grid-left">
        <el-card class="portal-card notice-card">
          <template #header>
            <div class="card-header">
              <span class="header-title"><span class="deco-line"></span> 通知公告</span>
              <span class="more-link" @click="router.push('/notice/list')">更多 <el-icon>
                  <ArrowRight />
                </el-icon></span>
            </div>
          </template>
          <ul class="notice-list">
            <li v-for="item in notices" :key="item.id" class="notice-item" @click="router.push('/notice/detail')">
              <div class="notice-meta">
                <el-tag :type="item.type" size="small" effect="plain">{{ item.tag }}</el-tag>
                <span class="title">{{ item.title }}</span>
              </div>
              <span class="date">{{ item.date }}</span>
            </li>
          </ul>
        </el-card>


      </div>

      <div class="grid-right">
        <el-card class="portal-card quick-card">
          <template #header>
            <div class="card-header"><span class="header-title"><span class="deco-line" style="background:#409EFF"></span>功能模块</span></div>
          </template>
          <div class="quick-grid-compact">
            <div v-for="(item, index) in quickFunctions" :key="index" class="quick-item-compact"
              @click="router.push(item.path)">
              <div class="icon-circle" :style="{ color: item.color }">
                <el-icon :size="20">
                  <component :is="item.icon" />
                </el-icon>
              </div>
              <span class="label">{{ item.label }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="portal-card event-card">
          <template #header>
            <div class="card-header">
              <span class="header-title"><span class="deco-line" style="background:#E6A23C"></span> 近期截止</span>
            </div>
          </template>
          <div class="event-stack">
            <div v-for="ev in upcomingEvents" :key="ev.id" class="event-mini-item">
              <div class="date-box">
                <span class="d-num">{{ ev.daysLeft }}</span>
                <span class="d-txt">天</span>
              </div>
              <div class="ev-content">
                <div class="ev-title">{{ ev.title }}</div>
                <div class="ev-sub">{{ ev.date }}</div>
              </div>
            </div>
          </div>
        </el-card>

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.portal-home {
  background-color: var(--background-color);
  padding: 20px;
  box-sizing: border-box;
}

.welcome-banner {
  background-color: #ffffff;
  padding: 20px 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);


  .banner-left {
    .greeting {
      margin: 0;
      font-size: 20px;
      color: #303133;
    }

    .sub-greeting {
      margin: 6px 0 0;
      color: #909399;
      font-size: 14px;
    }
  }

  .banner-right {
    .stat-group {
      display: flex;
      gap: 30px;
      margin-right:40px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 10px;

        .stat-icon-bg {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f0fdfa;
          color: #13C2C2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .stat-text {
          display: flex;
          flex-direction: column;

          .stat-val {
            font-size: 18px;
            font-weight: bold;
            color: #303133;
            line-height: 1.2;
          }

          .stat-label {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }
  }
}

.main-grid {
  display: flex;
  gap: 20px;

  .grid-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .grid-right {
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex-shrink: 0;
  }
}

.portal-card {
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  border-radius: 4px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      font-weight: 600;
      font-size: 15px;
      color: #303133;
      display: flex;
      align-items: center;
    }

    .deco-line {
      width: 3px;
      height: 14px;
      background: #13C2C2;
      margin-right: 8px;
      border-radius: 2px;
    }

    .more-link {
      font-size: 12px;
      color: #909399;
      cursor: pointer;
      display: flex;
      align-items: center;

      &:hover {
        color: #13C2C2;
      }
    }
  }
}

/* 通知列表 */
.notice-list {
  padding: 0;
  margin: 0;
  height: 430px;
  list-style: none;

  .notice-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px dashed #ebeef5;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:hover .title {
      color: #13C2C2;
    }

    .notice-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }

    .title {
      font-size: 14px;
      color: #606266;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 450px;
    }

    .date {
      font-size: 12px;
      color: #999;
      flex-shrink: 0;
    }
  }
}



/* 右侧：近期截止 (针对窄栏优化的紧凑样式) */
.event-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin:10px 0;

  .event-mini-item {
    display: flex;
    align-items: center;
    padding: 10px;
    background: #fcfcfc;
    border: 1px solid #f0f2f5;
    border-radius: 6px;
    transition: 0.2s;

    &:hover {
      border-color: #E6A23C;
      background: #fff;
    }

    .date-box {
      width: 40px;
      text-align: center;
      margin-right: 12px;
      color: #E6A23C;

      .d-num {
        display: block;
        font-size: 18px;
        font-weight: bold;
        line-height: 1;
      }

      .d-txt {
        font-size: 10px;
      }
    }

    .ev-content {
      flex: 1;
      overflow: hidden;

      .ev-title {
        font-size: 13px;
        color: #303133;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ev-sub {
        font-size: 12px;
        color: #909399;
        margin-top: 2px;
      }
    }
  }
}

/* 右侧：功能模块 */
.quick-grid-compact {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 15px 0;

  .quick-item-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;

    .icon-circle {
      width: 40px;
      height: 40px;
      background: #f5f7fa;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
      transition: 0.3s;
    }

    .label {
      font-size: 12px;
      color: #606266;
      text-align: center;
    }

    &:hover {
      .icon-circle {
        background: #f0fdfa;
        color: #13C2C2;
      }

      .label {
        color: #13C2C2;
      }
    }
  }
}
</style>