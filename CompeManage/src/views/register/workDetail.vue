<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Document, 
  UploadFilled, 
  Delete, 
  Timer, 
  CircleCheck,
  Download 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const regID = Number(route.params.id) // 这里接收的是 报名ID

const loading = ref(false)
const submitting = ref(false)
const compName = ref('')
const canSubmit = ref(false) // 是否在允许提交的时间段内
const timeRangeText = ref('')

// 文件列表
const regFileList = ref([])  // 报名附件(只读)
const workFileList = ref([]) // 作品附件(可编辑)

// 上传组件引用
const uploadRef = ref(null)
const token = localStorage.getItem('token')
const uploadHeaders = { Authorization: `Bearer ${token}` }

// --- 1. 初始化数据 ---
async function initData() {
  loading.value = true
  try {
    const res = await api.getMyReg({ id: regID })
    if (res.code === 200 && res.data.list && res.data.list.length > 0) {
      const data = res.data.list[0] // 取第一条
      compName.value = data.comp_name
      
      // 1. 解析时间状态
      const startStr = data.submit_start_time
      const endStr = data.submit_end_time
      
      if (!startStr || startStr.startsWith('0001')) {
         canSubmit.value = false
         timeRangeText.value = '未设置时间'
      } else {
         timeRangeText.value = `${startStr} ~ ${endStr}`
         const now = new Date().getTime()
         const start = new Date(startStr).getTime()
         const end = new Date(endStr).getTime()
         
         // 严格判断时间窗口
         canSubmit.value = (now >= start && now <= end)
      }

      // reg_url -> 报名附件
      regFileList.value = parseFileString(data.reg_url)
      // work_url -> 作品附件
      workFileList.value = parseFileString(data.work_url)
      
    } else {
      ElMessage.error('未找到该报名记录')
    }

  } catch (error) {
    ElMessage.error('加载信息失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 辅助：解析逗号分隔的 URL
function parseFileString(urlStr) {
  if (!urlStr) return []
  return urlStr.split(',').filter(item => item).map(url => {
    let name = url.substring(url.lastIndexOf('/') + 1)
    if (name.indexOf('_') > -1) name = name.substring(name.indexOf('_') + 1)
    return { name, url }
  })
}

// 打开文件
function openFile(url) {
  const fullUrl = url.startsWith('http') ? url : `/api${url}`
  window.open(fullUrl, '_blank')
}

// 移除作品文件
function removeWorkFile(index) {
  workFileList.value.splice(index, 1)
}

// --- 2. 上传逻辑 ---
const handleUploadSuccess = (response, uploadFile) => {
  if (response.code === 200) {
    const newFileUrl = response.data.url
    const newFileName = response.data.filename || uploadFile.name
    
    // 追加到作品列表
    workFileList.value.push({
      name: newFileName,
      url: newFileUrl
    })
    
    uploadRef.value.clearFiles()
    ElMessage.success('文件上传成功')
  } else {
    ElMessage.error(response.msg || '上传失败')
  }
}

const handleUploadError = () => {
  ElMessage.error('网络错误，上传失败')
}

// --- 3. 提交逻辑 ---
async function submitWork() {
  if (workFileList.value.length === 0) {
    return ElMessage.warning('请至少上传一份作品文件')
  }

  submitting.value = true
  try {
    // 拼接 URL
    const finalUrl = workFileList.value.map(f => f.url).join(',')
    
    await api.submitWork({
      reg_id: regID,
      work_attachment_url: finalUrl
    })
    
    ElMessage.success('作品提交成功！')
    router.back()
  } catch (error) {
    ElMessage.error(error.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <el-button link class="back-btn" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
      <div class="header-main">
        <h2 class="page-title">{{ compName }} - 作品提交</h2>
        <el-tag :type="canSubmit ? 'success' : 'info'" effect="dark" round>
          {{ canSubmit ? '提交通道开放中' : '通道关闭' }}
        </el-tag>
      </div>
      <div class="time-tip">
        <el-icon><Timer /></el-icon> 提交时间：{{ timeRangeText }}
      </div>
    </div>

    <div class="content-wrapper">
      
      <el-alert
        v-if="!canSubmit"
        title="当前不在作品提交时间段内，无法进行上传或修改操作。"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />
      
      <div class="section">
        <h3 class="section-title">报名材料 (参考)</h3>
        <div v-if="regFileList.length > 0" class="file-grid">
           <div 
             v-for="(file, idx) in regFileList" 
             :key="idx" 
             class="file-box readonly"
             @click="openFile(file.url)"
           >
              <div class="icon-wrapper"><el-icon><Document /></el-icon></div>
              <div class="info">
                <div class="name" :title="file.name">{{ file.name }}</div>
                <div class="action-hint">点击查看</div>
              </div>
           </div>
        </div>
        <div v-else class="empty-text">报名时未提交附件</div>
      </div>

      <el-divider />

      <div class="section">
        <h3 class="section-title">参赛作品附件</h3>
        <div class="subtitle">
           请上传您的作品文件（代码、文档、视频等）。截止时间前可多次修改，<span class="highlight">最终以列表中的文件为准。</span>
        </div>
        
        <div class="work-list-container">
           <div 
             v-for="(file, idx) in workFileList" 
             :key="idx" 
             class="file-box work-item"
           >
              <div class="left-part" @click="openFile(file.url)">
                <div class="icon-wrapper"><el-icon><Document /></el-icon></div>
                <div class="info">
                  <div class="name" :title="file.name">{{ file.name }}</div>
                  <div class="action-hint">已上传</div>
                </div>
              </div>
              
              <div class="right-part" v-if="canSubmit">
                 <el-button 
                   type="danger" 
                   link 
                   :icon="Delete" 
                   @click="removeWorkFile(idx)"
                 >删除</el-button>
              </div>
           </div>
        </div>

        <div class="upload-area" v-if="canSubmit">
          <el-upload
            ref="uploadRef"
            drag
            action="/api/upload"
            :headers="uploadHeaders"
            :data="{ type: 'competition_work' }"
            multiple
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :show-file-list="false" 
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处，或 <em>点击上传新文件</em>
            </div>
          </el-upload>
        </div>
      </div>

      <div class="action-footer">
         <el-button size="large" @click="router.back()">取消</el-button>
         <el-button 
           type="primary" 
           size="large" 
           :disabled="!canSubmit" 
           :loading="submitting"
           @click="submitWork"
         >
           <el-icon style="margin-right:6px"><CircleCheck /></el-icon>
           保存并提交作品
         </el-button>
      </div>

    </div>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 20px;
}

.page-header {
  background: #fff;
  padding: 20px 30px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ebeef5;

  .back-btn {
    padding-left: 0;
    margin-bottom: 10px;
    font-size: 14px;
    color: #606266;
    &:hover { color: var(--primary-color); }
  }
  .header-main {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
    .page-title {
      font-size: 22px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }
  .time-tip {
    font-size: 13px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.content-wrapper {
  background: #fff;
  padding: 30px 40px;
  border-radius: 0 0 8px 8px;
  min-height: 500px;
}

.section {
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    padding-left: 10px;
    border-left: 4px solid var(--primary-color);
    line-height: 1;
  }
  .subtitle {
    font-size: 13px;
    color: #909399;
    margin-bottom: 16px;
    padding-left: 14px;
    .highlight { color: #e6a23c; font-weight: 500; }
  }
}

/* 文件网格 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* 通用文件盒子样式 */
.file-box {
  display: flex;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px 16px;
  background: #fbfbfb;
  transition: all 0.2s;

  .icon-wrapper {
    font-size: 28px;
    color: #909399;
    margin-right: 12px;
    display: flex;
    align-items: center;
  }
  .info {
    flex: 1;
    overflow: hidden;
    .name {
      font-size: 14px;
      color: #303133;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }
    .action-hint {
      font-size: 12px;
      color: #c0c4cc;
    }
  }

  /* 只读样式 */
  &.readonly {
    cursor: pointer;
    &:hover {
      border-color: var(--primary-color);
      background: #f0fdfa;
      .icon-wrapper { color: var(--primary-color); }
      .action-hint { color: var(--primary-color); }
    }
  }

  /* 作品列表项样式 */
  &.work-item {
    background: #fff;
    padding: 0;
    overflow: hidden;

    .left-part {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      &:hover {
        background: #f9f9f9;
        .name { color: var(--primary-color); }
      }
    }
    .right-part {
      padding: 0 16px;
      border-left: 1px solid #ebeef5;
      height: 100%;
      display: flex;
      align-items: center;
    }
  }
}

.work-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.empty-text {
  color: #909399;
  font-size: 13px;
  padding-left: 14px;
  font-style: italic;
}

.upload-area {
  margin-top: 10px;
  :deep(.el-upload-dragger) {
    padding: 20px 10px;
    border-color: #dcdfe6;
    &:hover { border-color: var(--primary-color); }
  }
}

.action-footer {
  margin-top: 50px;
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>