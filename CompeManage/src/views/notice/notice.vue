<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElDivider, ElCard, ElIcon } from 'element-plus'
import { Document, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import { api } from '@/api'
const route = useRoute()
const loading = ref(false)

// 通知数据
const notice = ref({
  title: '',
  content: '',
  publish_time: '',
  attachment: '',
})

// 获取通知详情
async function fetchNoticeDetail() {
  loading.value = true
  try {
    const noticeID = route.params.id || route.query.id
    
    if (!noticeID) {
      ElMessage.error('缺少通知ID参数')
      return
    }

    // 调用后端接口
    const response = await api.getNoticeDetail(noticeID)
    
    if (response.code === 200) {
      const noticeData = response.data.notice
      notice.value = {
        title: noticeData.title || '',
        content: noticeData.content || '',
        publish_time: noticeData.publish_time || '',
        attachment: noticeData.attachment || '',
      }
    } else {
      ElMessage.error(response.msg || '获取通知失败')
    }
  } catch (error) {
    console.error('获取通知详情失败:', error)
    ElMessage.error('获取通知详情失败，请重试')
  } finally {
    loading.value = false
  }
}

// 下载附件
const downloadAttachment = async () => {
  if (!notice.value.attachment) {
    ElMessage.warning('该通知没有附件')
    return
  }
  try {
    // 强制走下载分支（保留后端返回的原始文件名）
    await api.downloadFile(notice.value.attachment, false)
  } catch (error) {
    ElMessage.error('附件打开失败：' + (error.message || '未知错误'))
    console.error(error)
  }
}

onMounted(async() => {
  await fetchNoticeDetail()
  console.log("notice:", notice.value)
})
</script>

<template>
  <div class="page-container">
    <el-card class="notice-card" shadow="hover" v-loading="loading">
      <div class="card-decoration"></div>
      <div class="notice-header">
        <h2 class="header-title">
          {{ notice.title }}
        </h2>
        <div class="notice-date">
          <span>{{ notice.publish_time }}</span>
        </div>
      </div>

      <el-divider border-style="dashed" />

      <div class="notice-body">
        <!-- 通知内容 -->
        <div class="content-section" v-if="notice.content">
          <p class="content-text">{{ notice.content }}</p>
        </div>

        <!-- 附件下载 -->
        <div class="attachment-box" v-if="notice.attachment" @click="downloadAttachment">
          <div class="file-icon">
            <el-icon :size="24"><Document /></el-icon>
          </div>
          <div class="file-info">
            <span class="file-label">附件下载</span>
            <span class="file-name">{{ notice.attachment.substring(notice.attachment.lastIndexOf('/') + 1) }}</span>
          </div>
          <div class="download-hint">
            <el-icon :size="16"><Download /></el-icon>
            点击下载
          </div>
        </div>

        <!-- 没有附件的提示 -->
        <div class="no-attachment" v-else>
          <p>暂无附件</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background-color: #dcfce7;
  padding: 20px;
  background-image: radial-gradient(#13c2c2 1px, transparent 1px);
  background-size: 20px 20px;
}

.notice-card {
  width: 60%;
  min-height: 80%;
  max-height: 95%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border: none;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 10px 40px -10px rgba(19, 194, 194, 0.2);
  position: relative;
  overflow: hidden;

  .card-decoration {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #13c2c2, #36cfc9);
  }

  .notice-header {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 20px;

    .header-title {
      font-size: 22px;
      color: #303133;
      text-align: center;
      margin-bottom: 10px;
      word-break: break-word;
    }

    .notice-date {
      color: #909399;
      font-size: 14px;
    }
  }

  .notice-body {
    font-size: 16px;
    line-height: 1.6;
    color: #606266;
    padding: 0 20px 20px;

    .content-section {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8fafc;
      border-left: 4px solid #13c2c2;
      border-radius: 4px;

      .content-text {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    }

    .attachment-box {
      margin-top: 30px;
      display: flex;
      align-items: center;
      padding: 15px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;

      .file-icon {
        margin-right: 15px;
        color: #64748b;
      }

      .file-info {
        display: flex;
        flex-direction: column;
        flex: 1;

        .file-label {
          font-size: 12px;
          color: #999;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .download-hint {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: #13c2c2;
        opacity: 0;
        transform: translateX(10px);
        transition: all 0.3s;
      }

      &:hover {
        background-color: #f0fdfa;
        border-color: #13c2c2;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(19, 194, 194, 0.15);

        .download-hint {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    .no-attachment {
      margin-top: 30px;
      padding: 30px;
      text-align: center;
      background-color: #f8fafc;
      border-radius: 8px;
      color: #999;
    }
  }
}

:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.7);
}
</style>