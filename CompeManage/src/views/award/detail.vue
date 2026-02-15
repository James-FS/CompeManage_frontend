<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Search, Plus, Download, Upload, Delete, Edit, 
  Trophy, Medal, UserFilled, Refresh, MoreFilled 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const compID = route.params.id

// 1. 状态定义
const loading = ref(false)
const tableData = ref([])
const queryParams = ref({
  page: 1,
  size: 10,
  keyword: '', 
  level: '',
})

const avatarPalette = ['#722ed1', '#f56a00', '#1890ff', '#52c41a', '#faad14', '#eb2f96', '#13c2c2', '#2f54eb']
const getAvatarColor = (seed = '') => {
  const str = String(seed)
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash + str.charCodeAt(i)) % avatarPalette.length
  return avatarPalette[hash]
}

// 统计数据
const filteredData = computed(() => {
  const keyword = queryParams.value.keyword.trim().toLowerCase()
  const level = queryParams.value.level
  return tableData.value.filter((item) => {
    const levelMatch = !level || item.level === level
    const keywordMatch = !keyword || [item.projectName, item.studentName, item.studentID, item.members]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(keyword))
    return levelMatch && keywordMatch
  })
})

const total = computed(() => filteredData.value.length)

const pagedData = computed(() => {
  const start = (queryParams.value.page - 1) * queryParams.value.size
  return filteredData.value.slice(start, start + queryParams.value.size)
})

const stats = computed(() => {
  const data = filteredData.value
  return {
    total: data.length,
    level1: data.filter(i => i.level.includes('特') || i.level.includes('一')).length,
    level2: data.filter(i => i.level.includes('二')).length,
    level3: data.filter(i => i.level.includes('三')).length,
  }
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.getCompAwards(compID)
    if (res.code === 200) {
      const list = Array.isArray(res.data) ? res.data : []
      tableData.value = list.map((item) => ({
        id: item.id,
        level: item.award_level || '优秀奖',
        projectName: item.team_name || '-',
        studentName: item.leader_name || '未知',
        studentID: item.leader_id || '-',
        isTeam: Boolean(item.team_name),
        members: '',
        college: item.college || '-',
        advisor: item.advisor || '-',
        avatarColor: getAvatarColor(item.leader_name || item.team_name),
      }))
    }
  } catch (error) {
    ElMessage.error(error.message || '获取获奖列表失败')
  } finally {
    loading.value = false
  }
}

const handleExport = async () => {
  try {
    loading.value = true
    const data = filteredData.value

    if (!data.length) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    const dataToExport = data.map((item) => ({
      '奖项等级': item.level || '-',
      '获奖项目': item.projectName || '-',
      '获奖者': item.studentName || '-',
      '学号': item.studentID || '-',
      '成员': item.members || '-',
      '所属学院': item.college || '-',
      '指导老师': item.advisor || '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()

    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '获奖名单')
    XLSX.writeFile(workbook, `获奖名单_${compID}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败：', error)
    ElMessage.error('导出失败')
  } finally {
    loading.value = false
  }
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

const goImport = () => {
  router.push({ name: 'AwardImport', params: { id: compID } })
}

const handlePageChange = (page) => {
  queryParams.value.page = page
}

const handleSizeChange = (size) => {
  queryParams.value.size = size
  queryParams.value.page = 1
}

watch(
  () => [queryParams.value.keyword, queryParams.value.level],
  () => {
    queryParams.value.page = 1
  }
)

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
          <el-button type="primary" plain :icon="Upload" @click="goImport">导入名单</el-button>
          <el-button type="success" plain :icon="Download" @click="handleExport">导出 Excel</el-button>
          <el-button type="primary" :icon="Plus" class="add-btn">手动录入</el-button>
        </div>
      </div>

      <el-table 
        :data="pagedData" 
        v-loading="loading" 
        style="width: 100%" 
        height="calc(100vh - 400px)"
        class="custom-table"
        header-cell-class-name="table-header"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        
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

        <el-table-column prop="projectName" label="获奖项目名称" min-width="240" show-overflow-tooltip align="center">
          <template #default="{ row }">
             <span class="project-name">{{ row.projectName && row.projectName !== '-' ? row.projectName : '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="获奖者信息" min-width="240" align="center">
          <template #default="{ row }">
            <div class="winner-cell">
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

        <el-table-column prop="college" label="所属学院" width="180" show-overflow-tooltip align="center"/>
        <el-table-column prop="advisor" label="指导老师" width="120" align="center" />

        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" :icon="Edit" />
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" />
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination 
          background
          layout="total, sizes, prev, pager, next, jumper" 
          :total="total"
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.award-page-container {
  width: 100%;
  height: 100%;
  padding: 20px;
  background-color: var(--background-color);
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}

/* 1. 顶部看板 */
.stat-header {
  background: #fff;
  border-radius: 4px;
  padding: 20px 30px;
  box-shadow: var(--card-shadow);

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
  border-radius: 4px;
  padding: 24px;
  box-shadow: var(--card-shadow);
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
  justify-content: center;

  .winner-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0; /* 防止溢出 */
    text-align: left;
    
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

.pagination-wrapper {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}
</style>