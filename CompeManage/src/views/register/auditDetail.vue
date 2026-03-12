<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/index.js'
import {
  User,
  Iphone,
  Postcard,
  Message,
  Document,
  Download,
  ArrowLeft,
  CircleCheck,
  CircleClose,
  Timer,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const detail = ref({})

// 驳回弹窗控制
const rejectDialogVisible = ref(false)
const rejectReason = ref('')

// --- 计算属性 ---
// 获取所有团队成员（包括队长）
const allMembers = computed(() => {
  if (!detail.value.members) return []
  // 队长优先显示，然后是队员
  const leader = detail.value.members.filter(m => m.is_leader)
  const teammates = detail.value.members.filter(m => !m.is_leader)
  return [...leader, ...teammates]
})

// 获取指导老师信息
const advisorInfo = computed(() => {
  if (!detail.value.advisor_info) return null
  
  try {
    // 如果是字符串，解析为对象
    if (typeof detail.value.advisor_info === 'string') {
      return JSON.parse(detail.value.advisor_info)
    }
    return detail.value.advisor_info
  } catch (e) {
    console.warn('指导老师信息解析失败:', e)
    return null
  }
})

const statusMap = {
  0: { label: '待审核', type: 'warning', icon: Timer },
  1: { label: '已通过', type: 'success', icon: CircleCheck },
  2: { label: '已驳回', type: 'danger', icon: CircleClose },
}

// --- 函数区 ---
async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.getRegDetail(route.params.id)

    if (res.code === 200) {
      detail.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  } catch (error) {
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

async function auditReg() {
  try {
    const res = await api.auditReg({
      id: detail.value.id,
      status: detail.value.status,
      reason: rejectReason.value,
    })
    return res
  } catch (error) {
    ElMessage.error('审核操作失败')
    throw error
  }
}

const handlePass = () => {
  ElMessageBox.confirm(`确定通过 ${detail.value.leader_name} 的报名吗？`, '通过审核', {
    confirmButtonText: '确定通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(async () => {
    detail.value.status = 1
    await auditReg()
    ElMessage.success('审核已通过')
  })
}

const handleReject = async () => {
  if (!rejectReason.value) return ElMessage.warning('请输入驳回原因')
  detail.value.status = 2
  detail.value.reject_reason = rejectReason.value
  await auditReg()
  ElMessage.success('已驳回申请')
  rejectDialogVisible.value = false
}

const attachmentList = computed(() => {
  const urlStr = detail.value.attachment_url
  if (!urlStr) return []
  //  多个附件用逗号分隔
  const urls = urlStr.split(',')
  return urls
    .map((url) => {
      url = url.trim()
      if (!url) return null

      //  获取文件名 (去掉路径)
      // 例如: /static/202601/123456_需求.docx -> 123456_需求.docx
      let fileName = url.substring(url.lastIndexOf('/') + 1)
      //  去掉时间戳/ID前缀 (去掉第一个下划线前的内容)
      // 例如: 123456_需求.docx -> 需求.docx
      if (fileName.indexOf('_') > -1) {
        fileName = fileName.substring(fileName.indexOf('_') + 1)
      }

      return {
        name: fileName,
        url: url,
      }
    })
    .filter((item) => item !== null)
})

const workList = computed(() => {
  const urlStr = detail.value.work_url
  if (!urlStr) return []
  //  多个附件用逗号分隔
  const urls = urlStr.split(',')
  return urls
    .map((url) => {
      url = url.trim()
      if (!url) return null

      //  获取文件名 (去掉路径)
      // 例如: /static/202601/123456_需求.docx -> 123456_需求.docx
      let fileName = url.substring(url.lastIndexOf('/') + 1)
      //  去掉时间戳/ID前缀 (去掉第一个下划线前的内容)
      // 例如: 123456_需求.docx -> 需求.docx
      if (fileName.indexOf('_') > -1) {
        fileName = fileName.substring(fileName.indexOf('_') + 1)
      }

      return {
        name: fileName,
        url: url,
      }
    })
    .filter((item) => item !== null)
})

// 修改打开附件的方法，支持传入具体的 URL
const openAttachment = (url) => {
  if (!url) return
  const fullUrl = url.startsWith('http') ? url : `http://localhost:8080${url}`
  window.open(fullUrl, '_blank')
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="detail-page" v-loading="loading">
    <div class="page-header">
      <el-button link class="back-btn" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>

      <div class="header-main">
        <h2 class="page-title">报名详情审核</h2>
        <el-tag
          v-if="detail.status !== undefined"
          :type="statusMap[detail.status].type"
          effect="dark"
          round
          class="status-tag"
        >
          <div class="tag-content">
            <el-icon class="is-loading" v-if="detail.status === 0 && loading">
              <Timer />
            </el-icon>

            <el-icon v-else class="tag-icon">
              <component :is="statusMap[detail.status].icon" />
            </el-icon>

            <span>{{ statusMap[detail.status].label }}</span>
          </div>
        </el-tag>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="info-section">
        <h3 class="section-title">基础信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="参赛赛事" >
            <span class="comp-name">{{ detail.comp_name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="团队名称">
            {{ detail.team_name || '（个人参赛）' }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ detail.update_time }}
          </el-descriptions-item>
          <el-descriptions-item label="参赛赛道" >
            <span class="comp-name">{{ detail.track || '未选择' }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- <div class="info-section">
        <h3 class="section-title">负责人信息</h3>
        <div class="leader-grid">
          <div class="grid-item">
            <span class="label"
              ><el-icon><User /></el-icon> 姓名</span
            >
            <span class="value">{{ detail.leader_name }}</span>
          </div>
          <div class="grid-item">
            <span class="label"
              ><el-icon><Postcard /></el-icon> 学号</span
            >
            <span class="value">{{ detail.stu_id }}</span>
          </div>
          <div class="grid-item">
            <span class="label"
              ><el-icon><Postcard /></el-icon> 学院</span
            >
            <span class="value">{{ detail.college }}</span>
          </div>
          <div class="grid-item">
            <span class="label"
              ><el-icon><Iphone /></el-icon> 电话</span
            >
            <span class="value highlight">{{ detail.phone || '未填写' }}</span>
          </div>
          <div class="grid-item">
            <span class="label"
              ><el-icon><Message /></el-icon> 邮箱</span
            >
            <span class="value">{{ detail.email || '未填写' }}</span>
          </div>
        </div>
      </div> -->

      
      <div v-if="allMembers.length > 0" class="info-section">
        <h3 class="section-title">团队成员 ({{ allMembers.length }}人)</h3>
        <el-table :data="allMembers" border stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="student_id" label="学号" width="150">
            <template #default="scope">
              {{ scope.row.stu_id || scope.row.username || '—' }}
            </template>
          </el-table-column>
          <el-table-column prop="college" label="学院" width="150" />
          <el-table-column prop="phone" label="联系电话" width="150" />
          <el-table-column prop="email" label="联系邮箱" />
          <el-table-column label="身份" width="100" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_leader" type="primary" size="small">队长</el-tag>
              <el-tag v-else type="info" size="small">队员</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      
      <div class="info-section">
        <h3 class="section-title">指导老师信息</h3>
        <div v-if="advisorInfo" class="advisor-grid">
          <div class="grid-item">
            <span class="label"><el-icon><User /></el-icon> 姓名</span>
            <span class="value">{{ advisorInfo.name || '' }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Postcard /></el-icon> 工号</span>
            <span class="value">{{ advisorInfo.username }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Postcard /></el-icon> 所属学院</span>
            <span class="value">{{ advisorInfo.college || '' }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Iphone /></el-icon> 联系电话</span>
            <span class="value">{{ advisorInfo.phone || '' }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Message /></el-icon> 邮箱</span>
            <span class="value">{{ advisorInfo.email || '' }}</span>
          </div>
        </div>
        <div v-else class="empty-advisor">
          <span>未填写指导老师信息</span>
        </div>
      </div>

      <div class="info-section">
        <h3 class="section-title">报名材料</h3>

        <div v-if="attachmentList.length > 0" class="attachment-list">
          <div
            v-for="(file, index) in attachmentList"
            :key="index"
            class="attachment-box"
            @click="openAttachment(file.url)"
          >
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

        <div v-else class="empty-attachment">未上传附件</div>
      </div>

      <div class="info-section">
        <h3 class="section-title">作品资料</h3>

        <div v-if="workList.length > 0" class="attachment-list">
          <div
            v-for="(file, index) in workList"
            :key="index"
            class="attachment-box"
            @click="openAttachment(file.url)"
          >
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

      <div class="info-section" v-if="detail.status == 2">
        <h3 class="section-title">驳回原因</h3>
        <div class="reject-box">
         <div class="reject-content">
              {{ detail.reject_reason || '未填写驳回原因' }}
            </div>
        </div>
      </div>

      <div v-if="detail.status === 0" class="action-footer">
        <el-divider />
        <div class="btn-group">
          <el-button
            type="danger"
            plain
            size="large"
            @click="rejectDialogVisible = true"
            align-center
          >
            驳回报名
          </el-button>
          <el-button type="primary" size="large" @click="handlePass"> 通过审核 </el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="rejectDialogVisible" title="驳回申请" width="400px" align-center>
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请输入驳回原因（必填）"
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReject">确认驳回</el-button>
      </template>
    </el-dialog>
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
  border-bottom: var(--card-border);

  .back-btn {
    font-size: var(--primary-font);
    color: #606266;
    margin-bottom: 10px;
    padding-left: 0;

    &:hover {
      color: var(--primary-color);
    }
  }

  .header-main {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .page-title {
      font-size: var(--primary-title);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.2;
    }

    .status-tag {
      border: none;
      padding: 0 12px;
      height: 32px;
      :deep(.el-tag__content) {
        display: flex;
        align-items: center;
        height: 100%;
      }

      .tag-content {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;

        .el-icon {
          font-size: 30px;
        }
      }
    }
  }
}

.content-wrapper {
  background: #fff;
  padding: var(--item-padding) 30px 40px;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

  .info-section {
    margin-bottom: 40px;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 16px;
      padding-left: 10px;
      border-left: 4px solid var(--primary-color);
      line-height: 1;
    }

    .comp-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .leader-grid,
    .advisor-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      background: #fcfcfc;
      padding: 20px;
      border: var(--card-border);
      border-radius: var(--card-radius);

      .grid-item {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .label {
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .value {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);

          &.highlight {
            color: var(--primary-color);
            font-family: Arial, sans-serif;
          }
        }
      }
    }

    .empty-advisor {
      text-align: center;
      padding: 30px;
      background: #fafafa;
      color: var(--text-secondary);
      border-radius: var(--card-radius);
      border: var(--card-border);
      font-style: italic;
    }

    .attachment-box {
      display: flex;
      align-items: center;
      border: var(--card-border);
      border-radius: 6px;
      padding: 16px 20px;
      cursor: pointer;
      transition: all 0.3s;
      max-width: 600px;

      &:hover {
        border-color: var(--primary-color);
        background-color: #f0fdfa;

        .file-icon-area {
          color: var(--primary-color);
        }
      }

      .file-icon-area {
        font-size: 36px;
        color: var(--text-secondary);
        margin-right: 16px;
        display: flex;
        align-items: center;
      }

      .file-content {
        flex: 1;

        .file-name {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .file-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .download-icon {
        font-size: 20px;
        color: #c0c4cc;
      }
    }

    .empty-attachment {
      text-align: center;
      padding: 30px;
      background: #fafafa;
      color: var(--text-secondary);
      border-radius: var(--card-radius);
      font-style: italic;
    }
  }

  .action-footer {
    margin-top: 40px;

    .btn-group {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 30px;

      .el-button {
        min-width: 140px;
        font-weight: 500;
      }
    }
  }
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reject-box {
  border: var(--card-border);
  border-radius: 6px;
  background-color: #fff;
  padding: 16px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.reject-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>