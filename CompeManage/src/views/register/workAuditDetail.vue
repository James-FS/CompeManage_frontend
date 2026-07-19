<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/index.js'
import { ArrowLeft, Document, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref({})

const allMembers = computed(() => {
  if (!detail.value.members) return []
  const leader = detail.value.members.filter((m) => m.is_leader)
  const teammates = detail.value.members.filter((m) => !m.is_leader)
  return [...leader, ...teammates]
})

const advisorInfo = computed(() => {
  if (!detail.value.advisor_info) return null
  try {
    return typeof detail.value.advisor_info === 'string'
      ? JSON.parse(detail.value.advisor_info)
      : detail.value.advisor_info
  } catch (error) {
    return null
  }
})

const parseFileList = (urlStr) => {
  if (!urlStr) return []
  return urlStr
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      let fileName = url.substring(url.lastIndexOf('/') + 1)
      if (fileName.indexOf('_') > -1) {
        fileName = fileName.substring(fileName.indexOf('_') + 1)
      }
      return { name: fileName, url }
    })
}

const workList = computed(() => parseFileList(detail.value.work_url))

const openAttachment = async (url) => {
  if (!url) return
  try {
    // 走预览分支（api 内已封装 window.open(blobUrl, '_blank')）
    await api.downloadFile(url, true)
  } catch (error) {
    ElMessage.error('文件打开失败：' + (error.message || '未知错误'))
    console.error(error)
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await api.getRegDetail(route.params.id)
    if (res.code === 200 || res.code === 0) {
      detail.value = res.data || {}
    } else {
      ElMessage.error(res.message || '获取作品详情失败')
    }
  } catch (error) {
    ElMessage.error('获取作品详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="detail-page" v-loading="loading">
    <div class="page-header">
      <div class="header-main">
        <h2 class="page-title">作品提交详情</h2>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="info-section">
        <h3 class="section-title">基础信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="参赛赛事">{{ detail.comp_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="团队名称">{{ detail.team_name || '个人参赛' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detail.leader_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责人学号">{{ detail.stu_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系邮箱">{{ detail.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="指导老师">{{ advisorInfo?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detail.update_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="参赛赛道">{{ detail.track || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div v-if="allMembers.length > 0" class="info-section">
        <h3 class="section-title">团队成员 ({{ allMembers.length }}人)</h3>
        <el-table :data="allMembers" border stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" width="130" align="center" />
          <el-table-column label="学号" width="150" align="center">
            <template #default="scope">
              {{ scope.row.stu_id || scope.row.username || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="college" label="学院" width="180" show-overflow-tooltip />
          <el-table-column prop="phone" label="联系电话" width="140" align="center" />
          <el-table-column prop="email" label="联系邮箱" show-overflow-tooltip />
          <el-table-column label="身份" width="100" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_leader" type="primary" size="small">队长</el-tag>
              <el-tag v-else type="info" size="small">队员</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="info-section">
        <h3 class="section-title">作品资料</h3>
        <div v-if="workList.length > 0" class="attachment-list">
          <div v-for="(file, index) in workList" :key="index" class="attachment-box" @click="openAttachment(file.url)">
            <div class="file-icon-area">
              <el-icon><Document /></el-icon>
            </div>
            <div class="file-content">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-desc">点击预览或下载</div>
            </div>
            <el-icon class="download-icon"><Download /></el-icon>
          </div>
        </div>
        <div v-else class="empty-attachment">未上传作品资料</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detail-page {
  min-height: 100%;
  background-color: var(--background-color);
  padding: var(--container-padding);
  box-sizing: border-box;
}

.page-header {
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ebeef5;

  .back-btn {
    padding-left: 0;
    color: var(--el-color-primary);
    font-weight: 500;
  }

  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;

    .page-title {
      margin: 0;
      font-size: 22px;
      color: #303133;
      font-weight: 700;
    }
  }
}

.content-wrapper {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px;
}

.info-section {
  margin-bottom: 24px;

  .section-title {
    font-size: 17px;
    margin: 0 0 12px;
    color: #303133;
    font-weight: 600;
  }
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attachment-box {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #13c2c2;
    box-shadow: 0 4px 12px rgba(19, 194, 194, 0.18);
    transform: translateY(-1px);
  }

  .file-icon-area {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #f0f9f9;
    color: #13c2c2;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-size: 18px;
  }

  .file-content {
    flex: 1;

    .file-name {
      font-size: 14px;
      color: #303133;
      font-weight: 500;
      margin-bottom: 4px;
      word-break: break-all;
    }

    .file-desc {
      font-size: 12px;
      color: #909399;
    }
  }

  .download-icon {
    color: #909399;
    font-size: 18px;
  }
}

.empty-attachment {
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  color: #909399;
  text-align: center;
  font-size: 14px;
}

</style>
