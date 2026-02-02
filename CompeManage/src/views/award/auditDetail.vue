<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  User,
  Iphone,
  Message,
  Postcard,
  Trophy,
  Calendar,
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

// --- 模拟数据 ---
const mockAwardDetail = {
  id: 1,
  student_name: '张三',
  student_id: '20220001',
  college: '计算机科学与网络工程学院',
  phone: '13800138000',
  email: 'zhangsan@example.com',
  comp_name: '2026年全国大学生计算机设计大赛',
  award_level: '国家级一等奖',
  award_specific: '特等奖',
  award_date: '2026-05-15',
  team_name: '智能识别小分队',
  teammates: [
    {
      name: '张三',
      student_id: '20220001',
      college: '计算机科学与网络工程学院',
    },
    {
      name: '李四',
      student_id: '20220002',
      college: '计算机科学与网络工程学院',
    },
    {
      name: '王五',
      student_id: '20220003',
      college: '人工智能学院',
    },
  ],
  cert_image: 'https://via.placeholder.com/400x300?text=Award+Certificate',
  submit_time: '2026-02-02 10:30:00',
  status: 0,
  reject_reason: '',
}

// --- 计算属性 ---
const statusMap = {
  0: { label: '待审核', type: 'warning', icon: Timer },
  1: { label: '已通过', type: 'success', icon: CircleCheck },
  2: { label: '已驳回', type: 'danger', icon: CircleClose },
}

const levelLabelMap = {
  '国家级一等奖': '国家级',
  '国家级二等奖': '国家级',
  '国家级三等奖': '国家级',
  '省级一等奖': '省级',
  '省级二等奖': '省级',
  '省级三等奖': '省级',
  '校级一等奖': '校级',
  '校级二等奖': '校级',
}

const levelColorMap = {
  '国家级': '#f56c6c',
  '省级': '#e6a23c',
  '校级': '#409eff',
}

const awardLevelGroup = computed(() => {
  const level = detail.value.award_level || ''
  return levelLabelMap[level] || '未知'
})

const awardLevelColor = computed(() => {
  return levelColorMap[awardLevelGroup.value] || '#606266'
})

const hasMultipleTeammates = computed(() => {
  return Array.isArray(detail.value.teammates) && detail.value.teammates.length > 1
})

// --- 获取详情 ---
async function fetchDetail() {
  loading.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    detail.value = mockAwardDetail
  } catch (error) {
    ElMessage.error('获取详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// --- 审核操作 ---
async function auditAward() {
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200 }
  } catch (error) {
    ElMessage.error('审核操作失败')
    throw error
  }
}

const handlePass = () => {
  ElMessageBox.confirm(
    `确定通过 ${detail.value.student_name} 的获奖申报吗？`,
    '通过审核',
    {
      confirmButtonText: '确定通过',
      cancelButtonText: '取消',
      type: 'success',
    }
  ).then(async () => {
    detail.value.status = 1
    await auditAward()
    ElMessage.success('审核已通过')
  })
}

const handleReject = async () => {
  if (!rejectReason.value.trim()) {
    return ElMessage.warning('请输入驳回原因')
  }
  detail.value.status = 2
  detail.value.reject_reason = rejectReason.value
  await auditAward()
  ElMessage.success('已驳回申请')
  rejectDialogVisible.value = false
}

// --- 证书预览 ---
const openCertificate = () => {
  if (!detail.value.cert_image) return ElMessage.warning('暂无证书图片')
  const url = detail.value.cert_image.startsWith('http')
    ? detail.value.cert_image
    : `http://localhost:8080${detail.value.cert_image}`
  window.open(url, '_blank')
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="detail-page" v-loading="loading">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button link class="back-btn" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>

      <div class="header-main">
        <div class="header-title-group">
          <el-icon class="header-icon"><Trophy /></el-icon>
          <h2 class="page-title">获奖申报审核</h2>
        </div>

        <el-tag
          v-if="detail.status !== undefined"
          :type="statusMap[detail.status].type"
          effect="dark"
          round
          class="status-tag"
        >
          <div class="tag-content">
            <el-icon class="tag-icon">
              <component :is="statusMap[detail.status].icon" />
            </el-icon>
            <span>{{ statusMap[detail.status].label }}</span>
          </div>
        </el-tag>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 学生基础信息 -->
      <div class="info-section">
        <h3 class="section-title">学生信息</h3>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="姓名" :span="1">
            <span class="font-weight-600">{{ detail.student_name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="学号" :span="1">
            {{ detail.student_id }}
          </el-descriptions-item>
          <el-descriptions-item label="所属学院" :span="1">
            {{ detail.college || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话" :span="1">
            <span class="highlight">{{ detail.phone || '未填写' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="邮箱" :span="2">
            {{ detail.email || '未填写' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

                   <!-- 获奖信息 (核心内容) -->
      <div class="info-section">
        <h3 class="section-title">获奖详情</h3>
        <div class="award-info-grid">
          <!-- 第一行：左边赛事名称 | 右边具体奖项等级 -->
          <div class="award-item">
            <div class="item-label">参赛赛事</div>
            <div class="item-value comp-name">{{ detail.comp_name }}</div>
          </div>

          <div class="award-item">
            <div class="item-label">具体奖项等级</div>
            <div class="item-value">{{ awardLevelGroup }}{{ detail.award_specific }}</div>
          </div>

          <!-- 获奖日期 -->
          <div class="award-item">
            <div class="item-label">获奖日期</div>
            <div class="item-value">
              <el-icon><Calendar /></el-icon>
              {{ detail.award_date }}
            </div>
          </div>

          <!-- 团队/项目名称 -->
          <div class="award-item">
            <div class="item-label">团队/项目名</div>
            <div class="item-value">{{ detail.team_name || '（个人参赛）' }}</div>
          </div>

          <!-- 申报时间 -->
          <div class="award-item">
            <div class="item-label">申报时间</div>
            <div class="item-value">{{ detail.submit_time }}</div>
          </div>
        </div>
      </div>

      <!-- 团队成员信息 (若有多人) -->
      <div v-if="hasMultipleTeammates" class="info-section">
        <h3 class="section-title">团队成员信息 ({{ detail.teammates.length }}人)</h3>
        <el-table :data="detail.teammates" border stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" width="140" />
          <el-table-column prop="student_id" label="学号" width="160" />
          <el-table-column prop="college" label="所属学院" />
        </el-table>
      </div>

      <!-- 证书材料 -->
      <div class="info-section">
        <h3 class="section-title">证明材料</h3>

        <div v-if="detail.cert_image" class="certificate-box" @click="openCertificate">
          <div class="cert-preview">
            <img :src="detail.cert_image" :alt="detail.award_specific" class="cert-image" />
          </div>
          <div class="cert-info">
            <div class="cert-name">获奖证书</div>
            <div class="cert-desc">点击查看大图或下载</div>
          </div>
          <el-icon class="download-icon"><Download /></el-icon>
        </div>

        <div v-else class="empty-box">
          <el-icon><Trophy /></el-icon>
          <div>暂无证书图片</div>
        </div>
      </div>

      <!-- 驳回原因 (若被驳回) -->
      <div v-if="detail.status === 2" class="info-section">
        <h3 class="section-title">驳回原因</h3>
        <div class="reject-box">
          <div class="reject-label">
            <el-icon><CircleClose /></el-icon>
            <span>不通过</span>
          </div>
          <div class="reject-content">
            {{ detail.reject_reason || '未填写驳回原因' }}
          </div>
        </div>
      </div>

      <!-- 审核操作区 -->
      <div v-if="detail.status === 0" class="action-footer">
        <el-divider />
        <div class="btn-group">
          <el-button
            type="danger"
            plain
            size="large"
            @click="rejectDialogVisible = true"
          >
            驳回申报
          </el-button>
          <el-button type="primary" size="large" @click="handlePass">
            通过审核
          </el-button>
        </div>
      </div>
    </div>

    <!-- 驳回对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回获奖申报" width="400px" align-center>
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请输入驳回原因（必填），如：证书信息不清晰、参赛信息错误等"
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

/* ====== 页面头部 ====== */
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

    &:hover {
      color: var(--primary-color);
    }
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;

    .header-title-group {
      display: flex;
      align-items: center;
      gap: 10px;

      .header-icon {
        font-size: 24px;
        color: var(--primary-color);
      }

      .page-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        line-height: 1.2;
      }
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

        .tag-icon {
          font-size: 16px;
        }
      }
    }
  }
}

/* ====== 内容区域 ====== */
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

    .font-weight-600 {
      font-weight: 600;
    }

    .highlight {
      color: var(--primary-color);
      font-family: Arial, sans-serif;
      font-weight: 500;
    }
  }
}

/* ====== 获奖信息网格 ====== */
.award-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;

  .award-item {
    background: #fcfcfc;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .item-label {
      font-size: 12px;
      color: #909399;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .item-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 6px;

      &.comp-name {
        word-break: break-word;
      }
    }

    // ✨ 具体奖项等级的标签样式
    .item-value-badge {
      display: flex;
      align-items: center;
      justify-content: flex-start;

      :deep(.el-tag) {
        border: 1.5px solid;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 600;
      }
    }
  }
}

/* ====== 证书卡片 ====== */
.certificate-box {
  display: flex;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  gap: 16px;

  &:hover {
    border-color: var(--primary-color);
    background-color: #f0fdfa;

    .cert-preview {
      box-shadow: 0 4px 12px rgba(19, 194, 194, 0.15);
    }
  }

  .cert-preview {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    border-radius: 4px;
    overflow: hidden;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: box-shadow 0.3s;

    .cert-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .cert-info {
    flex: 1;

    .cert-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .cert-desc {
      font-size: 12px;
      color: #909399;
    }
  }

  .download-icon {
    font-size: 20px;
    color: #c0c4cc;
    flex-shrink: 0;
  }
}

/* ====== 空状态 ====== */
.empty-box {
  text-align: center;
  padding: 40px 20px;
  background: #fafafa;
  border-radius: 6px;
  color: #909399;

  .el-icon {
    font-size: 32px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
}

/* ====== 驳回原因框 ====== */
.reject-box {
  background: #fef0f0;
  border: 1px solid #fde2e4;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;

  .reject-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #f56c6c;
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;

    .el-icon {
      font-size: 16px;
    }
  }

  .reject-content {
    font-size: 14px;
    color: #606266;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

/* ====== 底部操作区 ====== */
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

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .award-info-grid {
    grid-template-columns: 1fr;

    .award-item.large {
      grid-column: span 1;
    }
  }

  .header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .certificate-box {
    flex-direction: column;
    align-items: flex-start;

    .cert-preview {
      width: 100%;
      height: 200px;
    }
  }
}
</style>