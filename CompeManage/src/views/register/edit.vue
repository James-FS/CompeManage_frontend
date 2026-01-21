<script setup>
import { ref } from 'vue'
import { Calendar, User, Bell, Setting } from '@element-plus/icons-vue' // 引入 Setting 图标
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 1. 模拟赛事列表数据 (复用之前的结构)
const compList = ref([
  {
    id: 1,
    title: '第十五届蓝桥杯全国软件和信息技术专业人才大赛',
    level: '国家级A类',
    organizer: '工信部人才交流中心',
    timeRange: '2026-03-01 至 2026-04-15',
    status: 1, // 1:报名中
    tags: ['个人赛', '省赛直通'],
  },
  {
    id: 2,
    title: '2026年中国大学生广告艺术节学院奖',
    level: '省级B类',
    organizer: '广告人杂志社',
    timeRange: '2026-02-10 至 2026-05-20',
    status: 1, 
    tags: ['团队赛'],
  },
  {
    id: 3,
    title: '第九届中国国际“互联网+”大学生创新创业大赛',
    level: '国家级A+',
    organizer: '教育部',
    timeRange: '2025-11-01 至 2026-01-15',
    status: 0, // 0:已结束
    tags: ['团队赛', '创业'],
  },
  {
    id: 4,
    title: '2026年全国大学生英语竞赛(NECCS)',
    level: '国家级B类',
    organizer: '高等学校大学外语教学研究会',
    timeRange: '2026-01-20 至 2026-03-10',
    status: 2, 
    tags: ['个人赛'],
  },
  {
    id: 5,
    title: 'ACM国际大学生程序设计竞赛校内选拔赛',
    level: '校级',
    organizer: '计算机学院',
    timeRange: '2026-04-01 至 2026-04-05',
    status: 3, 
    tags: ['团队赛'],
  },
])

// 获取状态样式 
const getStatusConfig = (status) => {
  const map = {
    1: { tagType: 'success', tagText: '报名中' },
    2: { tagType: 'danger', tagText: '急' },
    3: { tagType: 'info', tagText: '筹备中' },
    0: { tagType: 'info', tagText: '已结束' },
  }
  return map[status] || { tagType: 'info', tagText: '未知' }
}

let currentPage = ref(1)
let pageSize = ref(10)
let total = ref(100)

// 按钮操作逻辑
function NavigateToSettings(compID) {
    router.push({name: 'edit-detail', params: { id: compID } })
}

function NavigateToNotice(compID) {
    // 发布通知逻辑
    router.push({name: 'NoticeDetail', params: { id: compID } })
}
</script>

<template>
  <div class="page-container">
    
    <div class="page-header">
      <h2>赛事管理与设置</h2>
      <el-button type="primary" plain>+ 新增赛事</el-button>
    </div>

    <div class="comp-list">
      <div class="comp-item" v-for="item in compList" :key="item.id">
        <div class="comp-info">
          <div class="name-row">
            <el-tag
              :type="getStatusConfig(item.status).tagType"
              effect="dark"
              size="small"
              class="status-badge"
            >
              {{ getStatusConfig(item.status).tagText }}
            </el-tag>
            <h3 class="comp-name">{{ item.title }}</h3>
          </div>
          
          <div class="meta-row">
            <el-tag effect="plain" type="primary" size="small" class="level-tag">
              {{ item.level }}
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
            <el-tag v-for="t in item.tags" :key="t" size="small" type="info" class="extra-tag">
              {{ t }}
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
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
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
  min-height: 100vh;
}

/* 简单的头部样式 */
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
    padding: 24px;
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

        .primary-btn {
          width: 120px;
          height: 38px;
          font-weight: 600;
          border: none;
          /* 保持原有的青色渐变风格 */
          background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
          box-shadow: 0 4px 12px rgba(19, 194, 194, 0.3);
          transition: all 0.3s;
          &:hover {
               transform: translateY(-1px);
               box-shadow: 0 6px 16px rgba(19, 194, 194, 0.4);
               opacity: 0.9;
          }
        }
      }
    }
  }
}

.pagination-container{
    display: flex;
    justify-content: center;
}
</style>