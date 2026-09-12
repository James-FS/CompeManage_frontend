<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const regId = Number(route.params.regId)
const taskId = Number(route.query.task_id)

const reviewRecord = ref({})
const work = ref({ team_name: '', members: [], work_attachment_url: '', submitted_at: '' })
const competition = ref({ comp_name: '', comp_level: '' })
const loading = ref(false)
const submitting = ref(false)

const form = ref({ score: null, comment: '' })

const isEditing = computed(() => reviewRecord.value.status === 1)

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.getReviewWorkDetail(regId, { task_id: taskId })
    const data = res.data || res
    reviewRecord.value = data.review_record || {}
    work.value = data.work || {}
    competition.value = data.competition || {}
    if (reviewRecord.value.score != null) {
      form.value.score = reviewRecord.value.score
    }
    form.value.comment = reviewRecord.value.comment || ''
  } catch {
    ElMessage.error('加载作品详情失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (form.value.score == null || form.value.score === '') {
    ElMessage.warning('请输入分数')
    return
  }
  const score = Number(form.value.score)
  if (isNaN(score) || score < 0 || score > 100) {
    ElMessage.warning('分数必须在 0-100 之间')
    return
  }

  submitting.value = true
  try {
    if (isEditing.value) {
      await api.updateReview(reviewRecord.value.id, { score, comment: form.value.comment })
      ElMessage.success('评审修改成功')
    } else {
      await api.submitReview({ record_id: reviewRecord.value.id, score, comment: form.value.comment })
      ElMessage.success('评审提交成功')
    }
    router.push(`/review/expert/works/${competition.value.comp_id || 0}?task_id=${taskId}`)
  } catch {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.push(`/review/expert/works/${competition.value.comp_id || 0}?task_id=${taskId}`)
}

onMounted(loadData)
</script>

<template>
  <div class="score-container" v-loading="loading">
    <el-card shadow="never" class="score-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="icon"><EditPen /></el-icon>
            <span class="title">评审打分</span>
          </div>
          <el-button text @click="handleBack">← 返回作品列表</el-button>
        </div>
      </template>

      <el-form :model="form" label-width="100px" label-position="right" class="score-form">
        <div class="form-section-title">赛事信息</div>

        <el-form-item label="赛事名称">
          <span class="info-text">{{ competition.comp_name }}</span>
        </el-form-item>
        <el-form-item label="赛事级别">
          <span class="info-text">{{ competition.comp_level }}</span>
        </el-form-item>

        <el-divider border-style="dashed" />

        <div class="form-section-title">作品信息</div>

        <el-form-item label="团队名称">
          <span class="info-text">{{ work.team_name }}</span>
        </el-form-item>
        <el-form-item label="团队成员">
          <span class="info-text">{{ (work.members || []).map(m => m.name).join('、') }}</span>
        </el-form-item>
        <el-form-item label="提交时间">
          <span class="info-text">{{ work.submitted_at }}</span>
        </el-form-item>
        <el-form-item v-if="work.work_attachment_url" label="作品附件">
          <el-button type="primary" link size="small" @click="api.downloadFile(work.work_attachment_url, true)">查看作品</el-button>
        </el-form-item>

        <el-divider border-style="dashed" />

        <div class="form-section-title">评审打分</div>

        <el-form-item label="分数" required>
          <el-input-number
            v-model="form.score"
            :min="0"
            :max="100"
            :precision="1"
            :step="0.5"
            placeholder="请输入0-100的分数"
            style="width: 200px"
          />
          <span class="score-hint">（百分制，0-100，保留一位小数）</span>
        </el-form-item>
        <el-form-item label="评语">
          <el-input
            v-model="form.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入评审意见（选填）"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEditing ? '修改评审' : '提交评审' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.score-container {
  box-sizing: border-box;
  padding: var(--container-padding);
  background-color: var(--background-color);
  min-height: calc(100vh - 110px);
  display: flex;
  justify-content: center;
}

.score-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;

      .title {
        font-size: 16px;
        font-weight: bold;
        color: #303133;
      }
      .icon {
        font-size: 18px;
        color: #409eff;
      }
    }
  }
}

.score-form {
  padding: 10px 20px;
}

.form-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #909399;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  line-height: 1;
}

.info-text {
  color: #303133;
  font-size: 14px;
}

.score-hint {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
