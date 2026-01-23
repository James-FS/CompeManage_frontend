<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  User, Iphone, Postcard, Message,
  Document, Download, ArrowLeft,
  CircleCheck, CircleClose, Timer
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// import api from '@/api/index.js' 

const route = useRoute()
const router = useRouter()
const loading = ref(false)

// --- 1. 模拟数据 (Mock Data) ---
const mockData = {
  id: 101,
  comp_name: '第十五届蓝桥杯全国软件和信息技术专业人才大赛',
  team_name: '无敌风火轮队', 
  leader_name: '张三',
  stu_id: '2023001',
  phone: '13800138000',
  email: 'zhangsan@edu.cn',
  create_time: '2026-01-23 10:30:00',
  status: 0, // 0:待审核, 1:已通过, 2:已驳回
  attachment_url: '/static/reg_attachments/demo_plan.pdf',
  members: [
    { name: '张三', stu_id: '2023001', phone: '13800138000', is_leader: true },
    { name: '李四', stu_id: '2023002', phone: '13900139000', is_leader: false },
    { name: '王五', stu_id: '2023003', phone: '13700137000', is_leader: false }
  ]
}

const detail = ref({})

// 驳回弹窗控制
const rejectDialogVisible = ref(false)
const rejectReason = ref('')

// --- 2. 计算属性 ---
const teamMembers = computed(() => {
  if (!detail.value.members) return []
  return detail.value.members.filter(m => !m.is_leader)
})

const showMemberSection = computed(() => {
  return teamMembers.value.length > 0
})

const statusMap = {
  0: { label: '待审核', type: 'warning', icon: Timer },
  1: { label: '已通过', type: 'success', icon: CircleCheck },
  2: { label: '已驳回', type: 'danger', icon: CircleClose }
}

// --- 3. 逻辑方法 ---
const fetchDetail = async () => {
  loading.value = true
  // 模拟请求
  setTimeout(() => {
    detail.value = mockData 
    loading.value = false
  }, 500)
}

const handlePass = () => {
  ElMessageBox.confirm(`确定通过 [${detail.value.leader_name}] 的报名吗？`, '通过审核', {
    confirmButtonText: '确定通过',
    cancelButtonText: '取消',
    type: 'success'
  }).then(async () => {
    detail.value.status = 1 
    ElMessage.success('审核已通过')
  })
}

const handleReject = async () => {
  if (!rejectReason.value) return ElMessage.warning('请输入驳回原因')
  detail.value.status = 2 
  ElMessage.success('已驳回申请')
  rejectDialogVisible.value = false
}

const openAttachment = () => {
  if (!detail.value.attachment_url) return
  const url = detail.value.attachment_url.startsWith('http') 
    ? detail.value.attachment_url 
    : `http://localhost:8080${detail.value.attachment_url}`
  window.open(url, '_blank')
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
            <el-icon class="is-loading" v-if="detail.status === 0 && loading"><Timer /></el-icon>
            <component :is="statusMap[detail.status].icon" v-else class="tag-icon" />
            <span>{{ statusMap[detail.status].label }}</span>
          </div>
        </el-tag>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="info-section">
        <h3 class="section-title">基础信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="参赛赛事" :span="2">
            <span class="comp-name">{{ detail.comp_name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="团队名称">
            {{ detail.team_name || '（个人参赛）' }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ detail.create_time }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="info-section">
        <h3 class="section-title">负责人信息</h3>
        <div class="leader-grid">
          <div class="grid-item">
            <span class="label"><el-icon><User /></el-icon> 姓名</span>
            <span class="value">{{ detail.leader_name }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Postcard /></el-icon> 学号</span>
            <span class="value">{{ detail.stu_id }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Iphone /></el-icon> 电话</span>
            <span class="value highlight">{{ detail.phone || '未填写' }}</span>
          </div>
          <div class="grid-item">
            <span class="label"><el-icon><Message /></el-icon> 邮箱</span>
            <span class="value">{{ detail.email || '未填写' }}</span>
          </div>
        </div>
      </div>

      <div v-if="showMemberSection" class="info-section">
        <h3 class="section-title">团队成员 ({{ teamMembers.length }}人)</h3>
        <el-table :data="teamMembers" border stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="stu_id" label="学号" width="150" />
          <el-table-column prop="phone" label="联系电话" />
        </el-table>
      </div>

      <div class="info-section">
        <h3 class="section-title">附件材料</h3>
        <div v-if="detail.attachment_url" class="attachment-box" @click="openAttachment">
          <div class="file-icon-area">
            <el-icon><Document /></el-icon>
          </div>
          <div class="file-content">
            <div class="file-name">报名附件材料/项目书</div>
            <div class="file-desc">点击即可预览或下载文件</div>
          </div>
          <el-icon class="download-icon"><Download /></el-icon>
        </div>
        <div v-else class="empty-attachment">未上传附件</div>
      </div>

      <div v-if="detail.status === 0" class="action-footer">
        <el-divider />
        <div class="btn-group">
          <el-button type="danger" plain size="large" @click="rejectDialogVisible = true">
            驳回报名
          </el-button>
          <el-button type="primary" size="large" @click="handlePass">
            通过审核
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="rejectDialogVisible" title="驳回申请" width="400px">
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
  padding: 16px;
  box-sizing: border-box;
}

.page-header {
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ebeef5;
  
  .back-btn {
    font-size: 14px;
    color: #606266;
    margin-bottom: 10px;
    padding-left: 0;
    
    &:hover { color: var(--primary-color); }
  }

  .header-main {
    display: flex;
    align-items: center;
    flex-wrap: wrap; /* 防止屏幕过窄时挤压 */
    gap: 12px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.2;
    }

    .status-tag {
      padding: 0 12px;
      height: 28px;
      border: none;

      .tag-content {
        display: inline-flex;
        align-items: center;
        gap: 6px; /* 图标与文字间距 */
        white-space: nowrap;
      }
      
      .tag-icon { 
        font-size: 14px; 
      }
    }
  }
}

.content-wrapper {
  background: #fff;
  padding: 24px 30px 40px; 
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

    /* 负责人信息网格 */
    .leader-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      background: #fcfcfc;
      padding: 20px;
      border: 1px solid #ebeef5;
      border-radius: 4px;

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

    /* 附件盒子 */
    .attachment-box {
      display: flex;
      align-items: center;
      border: 1px solid #ebeef5;
      border-radius: 6px;
      padding: 16px 20px;
      cursor: pointer;
      transition: all 0.3s;
      max-width: 600px;

      &:hover {
        border-color: var(--primary-color);
        background-color: #f0fdfa; /* 浅色背景保持硬编码或定义透明度变量 */
        
        .file-icon-area { color: var(--primary-color); }
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
      border-radius: 4px;
      font-style: italic;
    }
  }

  /* 底部操作区 */
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
</style>