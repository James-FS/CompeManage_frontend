<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const compId = Number(route.params.compId)

const compName = ref('')
const reviewEndTime = ref('')
const allReviewed = ref(false)
const hasAward = ref(false)
const resultList = ref([])
const loading = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.getReviewResultList({ comp_id: compId })
    const data = res.data || res
    compName.value = data.comp_name || ''
    reviewEndTime.value = data.review_end_time || ''
    allReviewed.value = data.all_reviewed || false
    hasAward.value = data.has_award || false
    resultList.value = data.list || []
  } catch {
    ElMessage.error('加载评审结果失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/review')
}

const handleConfirm = async () => {
  if (!allReviewed.value) {
    ElMessage.warning('还有作品未完成评审，无法确认结果')
    return
  }
  const reviewEnded = !reviewEndTime.value || new Date(reviewEndTime.value) < new Date()
  if (!reviewEnded) {
    ElMessage.warning('评审窗口尚未结束，无法确认结果')
    return
  }

  try {
    const { value: form } = await ElMessageBox.prompt(
      '请输入各等级获奖人数（JSON格式），例如：[{"level":"一等奖","count":1},{"level":"二等奖","count":2}]',
      '确认生成获奖名单',
      {
        confirmButtonText: '确认生成',
        cancelButtonText: '取消',
        inputValue: '[{"level":"一等奖","count":1},{"level":"二等奖","count":2},{"level":"三等奖","count":3}]',
        inputType: 'textarea',
        inputValidator: (val) => {
          try {
            const parsed = JSON.parse(val)
            if (!Array.isArray(parsed)) return '请输入 JSON 数组'
            for (const item of parsed) {
              if (!item.level || typeof item.count !== 'number') return '每项需包含 level 和 count'
            }
            return true
          } catch {
            return 'JSON 格式不正确'
          }
        },
      }
    )

    const awardCounts = JSON.parse(form)
    await api.confirmReviewResult({ comp_id: compId, award_counts: awardCounts })
    ElMessage.success('获奖名单已生成')
    loadData()
  } catch {
    // 取消
  }
}

onMounted(loadData)
</script>

<template>
  <div class="result-container">
    <div class="header-bar">
      <el-button @click="goBack" text>← 返回仪表盘</el-button>
      <span class="title">评审结果 - {{ compName }}</span>
      <el-button
        v-if="allReviewed && !hasAward"
        type="success"
        @click="handleConfirm"
        style="margin-left: auto"
      >
        确认生成获奖
      </el-button>
      <el-tag v-if="hasAward" type="success" size="large" style="margin-left: auto">获奖名单已生成</el-tag>
    </div>

    <div class="result-table" v-loading="loading">
      <el-table :data="resultList" stripe style="width: 100%" empty-text="暂无评审结果">
        <el-table-column prop="rank" label="排名" width="70" align="center" />
        <el-table-column prop="team_name" label="团队名称" min-width="150" align="center" />
        <el-table-column label="成员" min-width="180" align="center">
          <template #default="{ row }">
            {{ (row.members || []).join('、') }}
          </template>
        </el-table-column>
        <el-table-column prop="avg_score" label="平均分" width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.is_abnormal ? '#f56c6c' : '', fontWeight: row.is_abnormal ? '600' : '' }">
              {{ row.avg_score }}
            </span>
            <el-tag v-if="row.is_abnormal" type="danger" size="small" style="margin-left: 4px">异常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="专家打分" min-width="280" align="center">
          <template #default="{ row }">
            <div v-for="(s, idx) in row.scores" :key="idx" class="score-item">
              <span class="expert-name">{{ s.expert_name }}:</span>
              <span class="expert-score">{{ s.score }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.result-container {
  padding: 20px;
  .header-bar {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    .title {
      font-size: 18px;
      font-weight: 600;
    }
  }
}
.result-table {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: var(--card-shadow);
}
.score-item {
  display: inline-block;
  margin: 0 8px;
  .expert-name {
    color: #909399;
    font-size: 12px;
  }
  .expert-score {
    font-weight: 600;
    margin-left: 2px;
  }
}
</style>
