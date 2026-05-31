<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Promotion, Paperclip, Document } from '@element-plus/icons-vue'
import { formatTime } from '@/utils/format'
import api from '@/api'
const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const isSubmitting = ref(false)
const uploadRef = ref(null) // 上传组件引用
const noticeID = ref(null)
const token = localStorage.getItem('token')
const uploadHeaders = { Authorization: `Bearer ${token}` }

// 1. 判断模式
const isEditMode = computed(() => {
  const id = route.params.id
  return id && id !== '0' && id !== 0
})

// 2. 表单数据
const form = reactive({
  title: '',
  content: '',
  fileList: [],
  publish_time: '',
  compID: route.query.compID || '',
})

// 3. 校验规则
const rules = {
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }],
}

const goBack = () => {
  router.back()
}

const isSuccessCode = (code) => code === 0 || code === 200

const getRespMessage = (resp, fallback) => resp?.message || resp?.msg || fallback

// 6. 提交
// const handleSubmit = async () => {
//   if (!formRef.value) return
//   await formRef.value.validate((valid) => {
//     if (valid) {
//       isSubmitting.value = true
//       setTimeout(() => {
//         isSubmitting.value = false
//         ElMessage.success(isEditMode.value ? '修改已保存' : '通知已发布')
//         goBack()
//       }, 800)
//     }
//   })
// }

const handleFileChange = (uploadFile, uploadFiles) => {
  form.fileList = uploadFiles
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      isSubmitting.value = true
      // 判断是否有“待上传”的文件 (status === 'ready')
      const hasNewFile = form.fileList.some((f) => f.status === 'ready')
      if (hasNewFile) {
        // 有新文件：手动触发上传，等待 onSuccess 回调
        uploadRef.value.submit()
      } else {
        // 无新文件：直接提交表单
        finalSubmit()
      }
    }
  })
}

const handleUploadSuccess = (response, uploadFile, uploadFiles) => {
  if (response.code !== 200) {
    ElMessage.error(response.msg || '上传失败')
    isSubmitting.value = false
    return
  }

  // 必须手动把后端返回的 URL 赋给文件对象
  uploadFile.url = response.data.url

  // 检查是否所有文件都处理完毕 (全部变成 success)
  const isAllSuccess = uploadFiles.every((item) => item.status === 'success')
  if (isAllSuccess) {
    finalSubmit() // 所有文件上传完毕，执行最终提交
  }
}

const handleUploadError = () => {
  ElMessage.error('网络错误，文件上传失败')
  isSubmitting.value = false
}

// 7. 最终提交 (构造 FormData)
const finalSubmit = async () => {
  try {
    if (!form.compID) {
      ElMessage.error('缺少赛事ID，请从“赛事通知列表”进入发布页')
      isSubmitting.value = false
      return
    }

    // 提取所有文件的 URL，拼成字符串
    const attachmentStr = form.fileList
      .map((f) => f.url || (f.response && f.response.data.url))
      .filter((url) => url)
      .join(',')

    const params = new FormData()
    params.append('title', form.title)
    params.append('content', form.content)
    params.append('publish_time', formatTime(new Date()))
    params.append('compID', form.compID)
    params.append('attachment', attachmentStr)

    // 根据模式调用不同接口
    let createRes
    if (isEditMode.value) {
      createRes = await api.updateNotice(noticeID.value, params)
    } else {
      createRes = await api.createNotice(params)
    }

    if (!isSuccessCode(createRes?.code)) {
      ElMessage.error(getRespMessage(createRes, '创建通知失败'))
      isSubmitting.value = false
      return
    }

    const noticeIdToPublish =
      createRes?.data?.notice?.ID ||
      createRes?.data?.notice?.id ||
      createRes?.data?.id ||
      Number(noticeID.value)

    if (!noticeIdToPublish) {
      ElMessage.error('未获取到通知ID，无法发布')
      isSubmitting.value = false
      return
    }

    const publishRes = await api.publishNotice(noticeIdToPublish)

    if (isSuccessCode(publishRes?.code)) {
      ElMessage.success(isEditMode.value ? '修改已保存' : '通知发布成功')
      router.back()
    } else {
      ElMessage.error(getRespMessage(publishRes, '发布失败'))
    }
  } catch (error) {
    console.error(error)
    const backendMsg = error?.response?.data?.message || error?.response?.data?.msg
    ElMessage.error(backendMsg || error?.message || '操作失败')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  noticeID.value = route.params.id
  if (isEditMode.value) {
    // 编辑模式：获取通知详情回显
    loadNoticeDetail()
  }
})

// 加载通知详情用于编辑
const loadNoticeDetail = async () => {
  try {
    const res = await api.getNoticeDetail(noticeID.value)
    if (isSuccessCode(res?.code)) {
      const notice = res.data?.notice || res.data
      if (notice) {
        form.title = notice.title || ''
        form.content = notice.content || ''
        form.compID = notice.compID || notice.competition_detail_id || ''
        // 如果有附件，回显文件列表
        if (notice.attachment) {
          const urls = notice.attachment.split(',')
          form.fileList = urls.map((url, index) => ({
            name: `附件${index + 1}`,
            url: url.trim(),
            status: 'success'
          }))
        }
      }
    }
  } catch (error) {
    console.error('获取通知详情失败', error)
    ElMessage.error('加载通知信息失败')
  }
}
</script>

<template>
  <div class="paper-container">
    <div class="paper-sheet">
      <div class="paper-header">
        <div class="header-content">
          <div class="back-area" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回</span>
          </div>
          <div class="header-divider"></div>
          <div class="header-text">
            <h1 class="main-title">{{ isEditMode ? '通知公告编辑' : '发布赛事通知' }}</h1>
          </div>
        </div>

        <div class="header-decoration"></div>
      </div>

      <div class="paper-body">
        <el-form ref="formRef" :model="form" :rules="rules" class="paper-form">
          <div class="section-block">
            <div class="section-label">
              <span class="text">通知标题</span>
            </div>
            <el-form-item prop="title" class="input-item-underline">
              <el-input v-model="form.title" placeholder="在此输入通知标题" class="input-title" />
            </el-form-item>
          </div>

          <div class="section-block">
            <div class="section-label">
              <span class="text">正文内容</span>
            </div>
            <el-form-item prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :autosize="{ minRows: 12 }"
                placeholder="在此撰写通知正文..."
                resize="none"
                class="input-content"
              />
            </el-form-item>
          </div>

          <div class="section-block">
            <div class="section-label">
              <span class="text">附件材料</span>
            </div>
            <el-upload
              ref="uploadRef"
              v-model:file-list="form.fileList"
              drag
              action="/api/upload"
              multiple
              :headers="uploadHeaders"
              :data="{ type: 'notice_attachment' }"
              :auto-upload="false"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              class="paper-uploader"
            >
              <div class="upload-placeholder">
                <el-icon class="upload-icon"><Paperclip /></el-icon>
                <span>点击或拖拽文件上传</span>
              </div>
            </el-upload>
          </div>

          <div class="form-footer">
            <el-button @click="goBack" class="cancel-btn">取消</el-button>
            <el-button
              type="primary"
              :loading="isSubmitting"
              @click="handleSubmit"
              class="submit-btn"
            >
              <el-icon class="mr-1"><Promotion /></el-icon> 确认发布
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* ================= 布局容器 ================= */
.paper-container {
  background-color: #f2f4f7; /* 浅灰背景，突出白纸 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;
  box-sizing: border-box;
}

.action-bar {
  width: 100%;
  max-width: 800px;
  margin-bottom: 16px;
  .back-btn {
    font-size: 14px;
    color: #606266;
    &:hover {
      color: var(--el-color-primary);
    }
  }
}

/* ================= 纸张样式 ================= */
.paper-sheet {
  width: 100%;
  max-width: 800px; /* A4 比例限制 */
  background: #ffffff;
  border-radius: 4px; /* 纸张圆角很小 */
  overflow: hidden;
  /* 悬浮投影 */
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

/* 页眉 (深蓝风格) */
.paper-header {
  background-color: #2b4c7e; /* 深蓝 */
  color: #ffffff;
  padding: 40px 50px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-content {
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 2;
    .back-area {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.8;
      transition: opacity 0.2s;
      user-select: none;

      &:hover {
        opacity: 1;
      }

      .el-icon {
        font-size: 16px;
      }
    }
  }

  .icon-box {
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    font-size: 24px;
  }

  .main-title {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 1px;
  }
  .sub-title {
    margin: 4px 0 0 0;
    font-size: 12px;
    opacity: 0.6;
    font-family: Arial, sans-serif;
    letter-spacing: 2px;
  }

  .header-decoration {
    position: absolute;
    right: -20px;
    top: -20px;
    width: 100px;
    height: 100px;
    border: 10px solid rgba(255, 255, 255, 0.03);
    border-radius: 50%;
  }
}

/* 正文区域 */
.paper-body {
  padding: 50px 60px;
}

/* 章节样式 */
.section-block {
  margin-bottom: 40px;

  .section-label {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 16px;

    .num {
      font-size: 24px;
      font-weight: 900;
      color: #e4e7ed; /* 浅灰数字 */
      font-family: Georgia, serif;
    }
    .text {
      font-size: 14px;
      font-weight: bold;
      color: #606266;
      text-transform: uppercase;
    }
  }
}

/* 1. 标题输入框 (下划线风格) */
:deep(.input-item-underline) {
  .el-input__wrapper {
    box-shadow: none !important;
    background: transparent;
    padding: 0;
    border-bottom: 2px solid #e4e7ed; /* 只有底边框 */
    border-radius: 0;
    transition: border-color 0.3s;

    &.is-focus {
      border-color: #2b4c7e; /* 聚焦变蓝 */
    }
  }

  .el-input__inner {
    font-size: 20px;
    font-weight: bold;
    color: #303133;
    height: 40px;
    padding: 0 10px;
  }
}

/* 2. 正文输入框 (像信纸) */
:deep(.input-content .el-textarea__inner) {
  box-shadow: none !important;
  background: #fafafa; /* 极淡的灰底，区分区域 */
  border: 1px dashed #dcdfe6; /* 虚线框 */
  border-radius: 4px;
  padding: 15px;
  font-size: 15px;
  line-height: 1.8;
  color: #303133;

  &:focus {
    background: #fff;
    border-color: #2b4c7e;
  }
}

/* 3. 附件上传 */
:deep(.paper-uploader .el-upload-dragger) {
  background: #fff;
  border: 1px dashed #dcdfe6;
  padding: 20px;
  height: auto;
  border-radius: 4px;

  &:hover {
    border-color: #2b4c7e;
    background: #f2f4f7;
  }
}

.upload-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
}

/* 底部按钮 */
.form-footer {
  margin-top: 50px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #f2f2f2;
}

.paper-footer-text {
  background: #fcfcfc;
  color: #c0c4cc;
  text-align: center;
  font-size: 12px;
  padding: 12px;
  border-top: 1px solid #f2f2f2;
  font-family: monospace;
}

.mr-1 {
  margin-right: 4px;
}

/* 垂直分割线 */
.header-divider {
  width: 1px;
  height: 18px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 0 20px; /* 控制分割线左右间距 */
}
</style>
