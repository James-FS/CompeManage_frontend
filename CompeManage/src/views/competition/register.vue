<script setup>
import { ref, computed } from 'vue'
import { Search,ArrowRight, Calendar, User, Bell } from '@element-plus/icons-vue' // 引入必要的图标
import { ElPagination } from 'element-plus'
// 1. 定义所有的学科分类 (模拟数据)
const allCategories = [
  '全部',
  '计算机/软件',
  '数学/建模',
  '电子/自动化',
  '机械工程',
  '艺术/设计',
  '经济/金融',
  '创新创业',
  '外语',
  '土木建筑',
  '化工/材料',
  '法学',
  '体育',
  '文学/新闻',
  '物理',
  '生命科学',
  '环境工程',
  '医学',
  '教育学',
  '哲学',
]

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
    status: 1, // 1:报名中
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
    status: 2, // 2:即将截止
    tags: ['个人赛'],
  },
  {
    id: 5,
    title: 'ACM国际大学生程序设计竞赛校内选拔赛',
    level: '校级',
    organizer: '计算机学院',
    timeRange: '2026-04-01 至 2026-04-05',
    status: 3, // 3:筹备中
    tags: ['团队赛'],
  },
])

// 2. 定义筛选状态
const query = ref({
  keyword: '', // 搜索关键词
  category: '全部', // 当前选中的分类
  level: '全部', // 当前选中的级别
  status: 'all', // 当前选中的状态
})

const getStatusConfig = (status) => {
  const map = {
    1: { label: '立即报名', tagType: 'success', tagText: '报名中' },
    2: { label: '即将截止', tagType: 'danger', tagText: '急' },
    3: { label: '等待开启', tagType: 'info', tagText: '筹备中' },
    0: { label: '查看公示', tagType: 'info', tagText: '已结束' },
  }
  return map[status]
}

let currentPage = ref(1)
let pageSize = ref(10)
let total = ref(5000)
</script>

<template>
  <div class="page-container">
    <div class="filter-panel">
      <div class="search-row">
        <el-input v-model="query.keyword" placeholder="搜索赛事名称" prefix-icon="Search" clearable>
          <template #append><el-button type="primary">搜索</el-button></template>
        </el-input>
      </div>

      <el-divider class="filter-divider" />

      <div class="discipline-row">
        <span class="filter-label">学科分类：</span>
        <div class="options-area">
          <span
            v-for="cat in allCategories"
            :key="cat"
            class="filter-tag"
            :class="{ active: query.category === cat }"
            @click="query.category = cat"
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
            :class="{ active: query.level === lvl }"
            @click="query.level = lvl"
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
            :class="{ active: query.status === value }"
            @click="query.status = value"
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
            <el-button link type="info" class="sub-btn" @click.stop="handleNotice(item.id)">
              <el-icon><Bell /></el-icon> 通知
            </el-button>

            <el-button
              :type="item.status === 0 ? '' : 'primary'"
              :disabled="item.status === 3"
              
              class="primary-btn"
            >
              {{ getStatusConfig(item.status).label }}
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
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
  min-height: 100%;
}
.filter-panel {
  box-sizing: border-box;
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
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

.pagination-container{
    
}
</style>
