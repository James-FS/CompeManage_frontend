<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Upload, Trophy, Calendar, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api' // 引入 API

const router = useRouter()
const compList = ref([])
const loading = ref(false)
const queryParams = ref({
  page: 1,
  size: 10,
})
const total = ref(0)
// 获取 Token 用于上传鉴权
const token = localStorage.getItem('token')
const uploadHeaders = { Authorization: `Bearer ${token}` }

// 1. 获取赛事列表 (接入后端)
const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.getAwardCompList(queryParams.value)
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
    ElMessage.success(response.msg || `成功导入: ${uploadFile.name}`)
    // 导入成功后，可以刷新一下列表（虽然列表数据可能不变，但这是一个好习惯）
    // 或者什么都不做，直接跳转详情查看
  } else {
    ElMessage.error(response.msg || '导入失败')
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

onMounted(fetchList)
</script>

<template>
  <div class="page-container">
    <div class="comp-list" v-loading="loading">
      <el-empty v-if="compList.length === 0 && !loading" description="暂无负责的赛事" />

      <div v-for="item in compList" :key="item.id" class="comp-card" @click="goDetail(item.id)">
        <div class="comp-info">
          <div class="name-row">
            <el-tag
              v-if="item.status === 1"
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
  </div>
</template>

<style scoped lang="scss">
/* 样式保持不变，直接复用你之前的 */
.page-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  padding: 20px;
}

.comp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.comp-card {
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  border: 1px solid transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
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
        box-shadow: 0 4px 12px rgba(19, 194, 194, 0.3);
        transition: all 0.3s;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(19, 194, 194, 0.4);
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
