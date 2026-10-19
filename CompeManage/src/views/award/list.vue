<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Upload, Trophy, Calendar, User, Setting, Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { get, put } from '@/utils/request'
import api from '@/api' // 引入 API

const router = useRouter()
const userStore = useUserStore()
const compList = ref([])
const loading = ref(false)
const queryParams = ref({
  page: 1,
  size: 10,
})
const total = ref(0)
// 筛选条件：关键词（名称/编号）、级别、举办年份、进行状态；服务端过滤。
// 其中年份同时用作附件导出的年份口径
const filters = ref({ keyword: '', level: '', year: '', status: '' })
const levelOptions = ['校级', '省级', '国家级', '国际级']
// 获取 Token 用于上传鉴权
const token = localStorage.getItem('token')
const uploadHeaders = { Authorization: `Bearer ${token}` }
const buildListParams = () => {
  const { keyword, level, year, status } = filters.value
  const params = { page: queryParams.value.page, size: queryParams.value.size }
  if (keyword.trim()) params.keyword = keyword.trim()
  if (level) params.level = level
  if (year) params.year = year
  if (status) params.status = status
  return params
}

// 1. 获取赛事列表 (接入后端)
const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.getAwardCompList(buildListParams())
    if (res.code === 200) {
      compList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('加载列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
const applyFilters = () => {
  queryParams.value.page = 1
  fetchList()
}
const resetFilters = () => {
  filters.value = { keyword: '', level: '', year: '', status: '' }
  applyFilters()
}

// 2. 下载模板 (接入后端)
async function downloadTemplate(id) {
  try {
    loading.value = true

    // 1. 请求时必须声明 responseType: 'blob'
    // 注意：api.exportTemplate 需要配置 { responseType: 'blob' }
    const res = await api.getAwardTemplate(id)

    // 2. 🛡️ 智能判断：这是文件流还是 JSON 报错？
    // 如果返回的 Blob 类型是 application/json，说明后端报错了
    if (res.type === 'application/json') {
      const reader = new FileReader()
      reader.onload = () => {
        // 把 Blob 转回 JSON 字符串读出来
        const errorJson = JSON.parse(reader.result)
        ElMessage.error(errorJson.msg || '下载失败')
      }
      reader.readAsText(res)
      return // 终止下载
    }

    // 3. 正常下载流程 (如果是 Excel 流)
    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `Award_Template_${id}.xlsx`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(link.href)
    document.body.removeChild(link)

    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('网络请求失败')
  } finally {
    loading.value = false
  }
}

// 3. 导入成功回调
const handleUploadSuccess = (response, uploadFile) => {
  if (response.code === 200) {
    ElMessage.success(response.message || `成功导入: ${uploadFile.name}`)
  } else {
    ElMessage.error(response.message || '导入失败')
  }
}

// 导入失败回调
const handleUploadError = (error) => {
  console.error(error)
  ElMessage.error('网络错误，文件上传失败')
}

// 4. 跳转详情
const goDetail = (id) => {
  router.push({ name: 'AwardDetail', params: { id } })
}

// 5. 按赛事年份导出省级以上获奖附件，留空则按年份分别生成工作表
const exporting = ref(false)
async function downloadExport(kind) {
  exporting.value = true
  try {
    const exportYear = filters.value.year || ''
    const res = kind === 'projects' ? await api.exportAwardProjects(exportYear) : await api.exportAwardStudents(exportYear)
    // Blob 类型为 JSON 说明后端报错
    if (res.type?.includes('application/json')) {
      const errorJson = JSON.parse(await res.text())
      ElMessage.error(errorJson.message || errorJson.msg || '导出失败')
      return
    }
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    const yearSuffix = exportYear ? `${exportYear}年` : '全部赛事年份'
    const awardLabel = kind === 'projects' ? '获奖项目' : '获奖学生'
    link.download = `${yearSuffix}大学生参加省级以上各类竞赛${awardLabel}一览表（本科生获奖统计）.xlsx`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(link.href)
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('网络请求失败')
  } finally {
    exporting.value = false
  }
}

// 6. 全局导入设置（后端单条配置，作用于所有赛事）：导入获奖名单是否要求审核通过的报名
const importSettingsVisible = ref(false)
const requireRegistration = ref(false)
const settingsLoading = ref(false)
const settingsSaving = ref(false)
const openImportSettings = async () => {
  importSettingsVisible.value = true
  settingsLoading.value = true
  try {
    const res = await get('/api/award/import/settings')
    requireRegistration.value = res.data.require_registration
  } catch (error) {
    ElMessage.error('加载导入设置失败: ' + (error.response?.data?.message || error.message))
  } finally { settingsLoading.value = false }
}
const changeSetting = async value => {
  settingsSaving.value = true
  try {
    await put('/api/award/import/settings', { require_registration: value })
    ElMessage.success('已更新所有赛事的报名要求，历史获奖不受影响')
  } catch (error) {
    requireRegistration.value = !value
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally { settingsSaving.value = false }
}

onMounted(fetchList)
</script>

<template>
  <div class="page-container">
    <div class="filter-card">
      <el-form :inline="true" class="search-form" @submit.prevent>
        <el-form-item label="赛事名称">
          <el-input
            v-model="filters.keyword"
            placeholder="请输入赛事名称或编号"
            clearable
            style="width: 220px"
            @keyup.enter="applyFilters"
            @clear="applyFilters"
          />
        </el-form-item>
        <el-form-item label="赛事级别">
          <el-select v-model="filters.level" placeholder="全部级别" clearable style="width: 130px" @change="applyFilters">
            <el-option v-for="level in levelOptions" :key="level" :label="level" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="赛事年份">
          <!-- 同时驱动列表过滤与附件导出年份 -->
          <el-date-picker
            v-model="filters.year"
            type="year"
            placeholder="全部赛事年份"
            value-format="YYYY"
            clearable
            style="width: 130px"
            @change="applyFilters"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 130px" @change="applyFilters">
            <el-option label="进行中" value="ongoing" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="applyFilters">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div v-if="['school_admin', 'college_admin', 'competition_manager'].includes(userStore.role)" class="export-bar">
      <el-button type="success" :icon="Download" :loading="exporting" @click="downloadExport('projects')">
        导出附件1（省级以上项目）
      </el-button>
      <el-button type="primary" :icon="Download" :loading="exporting" @click="downloadExport('students')">
        导出附件2（省级以上学生）
      </el-button>
      <span v-if="userStore.role === 'school_admin'" class="settings-entry">
        <el-divider direction="vertical" />
        <el-button :icon="Setting" :disabled="settingsLoading && !importSettingsVisible" @click="openImportSettings">
          导入设置
        </el-button>
      </span>
    </div>
    <div class="comp-list" v-loading="loading">
      <el-empty v-if="compList.length === 0 && !loading" description="暂无负责的赛事" />

      <div v-for="item in compList" :key="item.id" class="comp-card" @click="goDetail(item.id)">
        <div class="comp-info">
          <div class="name-row">
            <el-tag
              v-if="item.status !== 2"
              type="success"
              effect="dark"
              size="small"
              class="status-badge"
              >进行中</el-tag
            >
            <el-tag v-else type="info" effect="dark" size="small" class="status-badge"
              >已结束</el-tag
            >

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
              <el-icon><Calendar /></el-icon> {{ item.year }}
            </span>
          </div>
        </div>

        <div class="comp-action" @click.stop>
          <div class="action-wrapper">
            <div class="btn-group">
              <el-tooltip content="下载录入模板" placement="top">
                <el-button link class="icon-btn" @click="downloadTemplate(item.id)">
                  <el-icon><Download /></el-icon>
                  <span class="btn-text">下载模板</span>
                </el-button>
              </el-tooltip>

              <el-upload
                class="upload-wrapper"
                :action="`/api/award/import?comp_id=${item.id}`"
                :headers="uploadHeaders"
                :show-file-list="false"
                accept=".xlsx"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
              >
                <el-tooltip content="导入获奖名单" placement="top">
                  <el-button link class="icon-btn">
                    <el-icon><Upload /></el-icon>
                    <span class="btn-text">导入数据</span>
                  </el-button>
                </el-tooltip>
              </el-upload>

              <div class="btn-container">
                <el-button type="primary" class="primary-btn" @click="goDetail(item.id)">
                  <el-icon style="margin-right: 4px"><Trophy /></el-icon>
                  查看结果
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.size"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50]"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </div>

    <el-dialog v-model="importSettingsVisible" title="导入设置" width="560px">
      <div class="setting-row">
        <div class="setting-text">
          <div class="setting-title">导入获奖名单需先通过报名审核</div>
          <div class="setting-hint">
            全局策略，作用于所有赛事：开启后，导入的学生须在该赛事中已有审核通过的报名记录；关闭则不做校验。历史获奖不受影响。
          </div>
        </div>
        <el-switch v-model="requireRegistration" :loading="settingsSaving" :disabled="settingsLoading" @change="changeSetting" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
/* 样式保持不变，直接复用你之前的 */
.page-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  padding: var(--container-padding);
}

.export-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .settings-entry {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
  }
}

.setting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 0;

  .setting-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .setting-hint {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.6;
    color: #909399;
  }

  .el-switch {
    margin-top: 2px;
    flex-shrink: 0;
  }
}

.comp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.comp-card {
  background-color: #fff;
  padding: var(--item-padding);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  border: 1px solid transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
    .comp-name {
      color: #13c2c2 !important;
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
      font-size: 14px;
      color: #909399;

      .divider {
        width: 1px;
        height: 12px;
        background: #e4e7ed;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;

        .el-icon {
          font-size: 16px;
          margin-top: -1px;
        }
      }
    }
  }

  .comp-action {
    margin-left: 40px;
    flex-shrink: 0;

    .action-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .btn-group {
      display: flex;
      align-items: center;
      gap: 16px;

      .icon-btn {
        font-size: 14px;
        color: #606266;
        display: flex;
        align-items: center;
        gap: 4px;

        &:hover {
          color: #13c2c2;
        }

        .btn-text {
          display: inline-block;
        }
      }

      .upload-wrapper {
        display: inline-flex;
        align-items: center;
      }

      .primary-btn {
        width: 120px;
        height: 40px;
        font-weight: 600;
        font-size: 14px;
        border: none;
        background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
        box-shadow: var(--primary-btn-shadow);
        transition: all 0.3s;

        &:hover {
          transform: translateY(-1px);
          box-shadow: var(--primary-btn-hover-shadow);
          opacity: 0.95;
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
