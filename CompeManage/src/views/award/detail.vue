<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Search, Plus, Download, Upload, Delete, Edit, 
  Trophy, Medal, UserFilled, Refresh, MoreFilled 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const compID = route.params.id

// 1. 状态定义
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const queryParams = ref({
  page: 1,
  size: 10,
  keyword: '', 
  level: '',
})

// 2. 模拟数据 (Mock Data)
const mockData = [
  {
    id: 1,
    level: '特等奖',
    projectName: '基于Vue3的智慧校园管理系统',
    studentName: '林萧',
    studentID: '2021001001',
    isTeam: true,
    members: '顾里, 南湘, 唐宛如',
    college: '计算机学院',
    advisor: '宫洺',
    avatarColor: '#722ed1',
  },
  {
    id: 2,
    level: '一等奖',
    projectName: '无人机集群协同控制算法研究',
    studentName: '楚雨荨',
    studentID: '2022002002',
    isTeam: true,
    members: '慕容云海, 端木磊',
    college: '自动化学院',
    advisor: '叶烁',
    avatarColor: '#f56a00',
  },
  {
    id: 3,
    level: '一等奖',
    projectName: '一种新型环保降解材料',
    studentName: '陆之昂',
    studentID: '2021003003',
    isTeam: false, 
    college: '化工学院',
    advisor: '傅小司',
    avatarColor: '#1890ff',
  },
  {
    id: 4,
    level: '二等奖',
    projectName: '传统非遗文化的数字化传承',
    studentName: '方一凡',
    studentID: '2023004004',
    isTeam: true,
    members: '乔英子, 林磊儿',
    college: '人文学院',
    advisor: '李萌',
    avatarColor: '#52c41a',
  },
  {
    id: 5,
    level: '二等奖',
    projectName: '校园二手交易小程序',
    studentName: '余淮',
    studentID: '2022005005',
    isTeam: false,
    college: '软件学院',
    advisor: '张平',
    avatarColor: '#faad14',
  },
  {
    id: 6,
    level: '三等奖',
    projectName: '智能垃圾分类垃圾桶',
    studentName: '路星河',
    studentID: '2022006006',
    isTeam: false,
    college: '机械学院',
    advisor: '潘主任',
    avatarColor: '#eb2f96',
  },
   {
    id: 7,
    level: '三等奖',
    projectName: '英语口语AI陪练',
    studentName: '李诗情',
    studentID: '2021007007',
    isTeam: true,
    members: '肖鹤云',
    college: '外语学院',
    advisor: '卢笛',
    avatarColor: '#13c2c2',
  },
  {
    id: 8,
    level: '优秀奖',
    projectName: '-',
    studentName: '张万森',
    studentID: '2023008008',
    isTeam: false,
    college: '理学院',
    advisor: '林北星',
    avatarColor: '#2f54eb',
  },
]

// 统计数据
const stats = computed(() => {
  const data = tableData.value
  return {
    total: data.length,
    level1: data.filter(i => i.level.includes('特') || i.level.includes('一')).length,
    level2: data.filter(i => i.level.includes('二')).length,
    level3: data.filter(i => i.level.includes('三')).length,
  }
})

const fetchData = async () => {
  loading.value = true
  // 模拟请求延迟
  setTimeout(() => {
    tableData.value = mockData
    total.value = mockData.length
    loading.value = false
  }, 500)
}

const handleExport = () => {
  ElMessage.success('正在下载 Excel 名单...')
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
    .then(() => ElMessage.success('删除成功'))
}

// 辅助：奖项样式映射
const getLevelStyle = (level) => {
  if (level.includes('特')) return { color: '#722ed1', bg: '#f9f0ff', label: '特等奖' }
  if (level.includes('一')) return { color: '#cf1322', bg: '#fff1f0', label: '一等奖' }
  if (level.includes('二')) return { color: '#d46b08', bg: '#fff7e6', label: '二等奖' }
  if (level.includes('三')) return { color: '#096dd9', bg: '#e6f7ff', label: '三等奖' }
  return { color: '#595959', bg: '#fafafa', label: '优秀奖' }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="award-page-container">
    
    <div class="stat-header">
      <div class="stat-group">
        <div class="stat-item">
          <div class="val">{{ stats.total }}</div>
          <div class="lbl">获奖总数</div>
        </div>
        <div class="divider"></div>
        <div class="stat-item">
          <div class="val text-gold">{{ stats.level1 }}</div>
          <div class="lbl">特/一等奖</div>
        </div>
        <div class="stat-item">
          <div class="val text-silver">{{ stats.level2 }}</div>
          <div class="lbl">二等奖</div>
        </div>
        <div class="stat-item">
          <div class="val text-bronze">{{ stats.level3 }}</div>
          <div class="lbl">三等奖</div>
        </div>
      </div>
      
      </div>

    <div class="table-wrapper">
      
      <div class="toolbar">
        <div class="left-tools">
          <el-input 
            v-model="queryParams.keyword" 
            placeholder="搜索姓名 / 学号 / 项目" 
            prefix-icon="Search"
            class="search-box"
            clearable
          />
          <el-select v-model="queryParams.level" placeholder="所有等级" clearable style="width: 140px">
            <el-option label="特等奖" value="特等奖" />
            <el-option label="一等奖" value="一等奖" />
            <el-option label="二等奖" value="二等奖" />
            <el-option label="三等奖" value="三等奖" />
          </el-select>
          <el-button :icon="Refresh" circle @click="fetchData" />
        </div>

        <div class="right-tools">
          <el-button type="primary" plain :icon="Upload">导入名单</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出 Excel</el-button>
          <el-button type="primary" :icon="Plus" class="add-btn">手动录入</el-button>
        </div>
      </div>

      <el-table 
        :data="tableData" 
        v-loading="loading" 
        style="width: 100%" 
        class="custom-table"
        header-cell-class-name="table-header"
      >
        <el-table-column type="index" label="#" width="60" align="center" />
        
        <el-table-column prop="level" label="奖项" width="120" align="center">
          <template #default="{ row }">
            <el-tag 
              :color="getLevelStyle(row.level).bg" 
              :style="{ color: getLevelStyle(row.level).color, borderColor: 'transparent', fontWeight: 'bold' }"
            >
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="projectName" label="获奖项目" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
             <span class="project-name">{{ row.projectName && row.projectName !== '-' ? row.projectName : '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="获奖者信息" min-width="240">
          <template #default="{ row }">
            <div class="winner-cell">
              <div class="avatar-circle" :style="{ backgroundColor: row.avatarColor || '#409eff' }">
                {{ row.studentName.charAt(0) }}
              </div>
              <div class="winner-info">
                <div class="main-row">
                  <span class="name">{{ row.studentName }}</span>
                  <span class="sid">{{ row.studentID }}</span>
                  <el-tag v-if="row.isTeam" size="small" effect="light" round class="team-tag">团队</el-tag>
                </div>
                <div v-if="row.isTeam && row.members" class="sub-row">
                  <el-tooltip :content="row.members" placement="top" effect="light">
                    <span class="members-text">
                      <el-icon class="icon"><MoreFilled /></el-icon> 成员: {{ row.members }}
                    </span>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="college" label="所属学院" width="180" show-overflow-tooltip />
        <el-table-column prop="advisor" label="指导老师" width="120" />

        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" :icon="Edit" />
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" />
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-footer">
        <el-pagination 
          background
          layout="total, sizes, prev, pager, next, jumper" 
          :total="total"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          @current-change="fetchData"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.award-page-container {
  padding: 24px 30px;
  background-color: var(--background-color);
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 1. 顶部看板 */
.stat-header {
  background: #fff;
  border-radius: 8px;
  padding: 20px 30px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);

  .stat-group {
    display: flex;
    align-items: center;
    gap: 40px;

    .stat-item {
      .val { font-size: 24px; font-weight: 800; color: #303133; line-height: 1.1; }
      .lbl { font-size: 13px; color: #909399; margin-top: 4px; }
      
      .text-gold { color: #fa8c16; }
      .text-silver { color: #8c8c8c; }
      .text-bronze { color: #d48806; }
    }
    .divider {
      width: 1px;
      height: 30px;
      background: #e4e7ed;
    }
  }
}

/* 2. 表格容器 */
.table-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  flex: 1; /* 撑满剩余高度 */
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;

  .left-tools {
    display: flex;
    gap: 12px;
    .search-box { width: 260px; }
  }
  .right-tools {
    display: flex;
    gap: 12px;
  }
}

/* 表格样式微调 */
.custom-table {
  :deep(.table-header) {
    background-color: #fafafa !important;
    color: #606266;
    font-weight: 600;
    height: 48px;
  }
  
  :deep(.el-table__cell) {
    padding: 12px 0;
  }
}

.project-name {
  font-weight: 500;
  color: #303133;
}

/* 获奖者单元格 */
.winner-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .avatar-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .winner-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0; /* 防止溢出 */
    
    .main-row {
      display: flex;
      align-items: center;
      gap: 8px;
      .name { font-weight: 600; color: #303133; }
      .sid { font-size: 12px; color: #909399; font-family: monospace; }
      .team-tag { transform: scale(0.9); }
    }

    .sub-row {
      .members-text {
        font-size: 12px;
        color: #909399;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
        cursor: help;
        
        .icon { font-size: 12px; vertical-align: -1px; }
      }
    }
  }
}

.action-btns {
  :deep(.el-button) { font-size: 16px; padding: 4px; }
}

.pagination-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>