<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Trophy, Timer, DocumentChecked, Calendar, Paperclip } from '@element-plus/icons-vue'
import api from '@/api'
import AwardChangeHistory from '@/components/AwardChangeHistory.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const route = useRoute()
const activeTab = ref(['registration', 'declaration', 'award'].includes(route.query.tab) ? route.query.tab : 'registration')
const awardTabs = [
  { name: 'declaration', label: '我的申报', empty: '暂无奖项申报记录' },
  { name: 'award', label: '我的获奖', empty: '暂无获奖记录' },
]
let requestSequence = 0
const myRegList = ref([])
const myAwardList = ref([])
const total = ref(0)
const awardQuery = ref({
  page: 1,
  size: 10,
})

watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
  total.value = 0
  myAwardList.value = []
  if (newTab === 'registration') {
    fetchMyRegList()
  } else if (newTab === 'award' || newTab === 'declaration') {
    awardQuery.value.page = 1
    fetchMyAwardList()
  }
})

async function fetchMyRegList() {
  const sequence = ++requestSequence
  loading.value = true
  try {
    const response = await api.getMyReg({ registration_only: true })
    if (sequence !== requestSequence) return
    if (response.code == 200) {
      myRegList.value = response.data.list || []
      total.value = response.data.total
    } else {
      ElMessage.error('获取列表失败:' + (response.message || response.msg || '未知错误'))
    }
  } catch (error) {
    if (sequence !== requestSequence) return
    ElMessage.error(error?.response?.data?.msg || error?.response?.data?.message || '获取列表失败')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

async function fetchMyAwardList() {
  const sequence = ++requestSequence
  loading.value = true
  try {
    const response = await api.getMyAwardList({
      page: awardQuery.value.page,
      size: awardQuery.value.size,
      ...(activeTab.value === 'declaration' ? { source: 'supplement' } : { status: 'approved' }),
    })
    if (sequence !== requestSequence) return
    if (response.code == 200) {
      myAwardList.value = response.data.list || []
      total.value = response.data.total || 0
    } else {
      ElMessage.error('获取列表失败:' + (response.message || response.msg || '未知错误'))
    }
  } catch (error) {
    if (sequence !== requestSequence) return
    ElMessage.error(error?.response?.data?.msg || error?.response?.data?.message || '获取列表失败')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

const awardStatusMap = {
  draft: { type: 'warning', text: '待审核' },
  approved: { type: 'success', text: '已通过' },
  rejected: { type: 'danger', text: '已驳回' },
}

const awardSourceMap = {
  import: { type: 'info', text: '系统导入' },
  supplement: { type: 'primary', text: '学生申报' },
}

const awardStats = computed(() => {
  const stats = { total: myAwardList.value.length, draft: 0, approved: 0, rejected: 0 }
  myAwardList.value.forEach((item) => {
    if (item.status === 'approved') stats.approved += 1
    else if (item.status === 'rejected') stats.rejected += 1
    else stats.draft += 1
  })
  return stats
})

const getAwardStatusTag = (status) => awardStatusMap[status] || { type: 'info', text: '未知状态' }
const getAwardSourceTag = (source) => awardSourceMap[source] || { type: 'info', text: '未标注' }

const getAwardCompName = (award) => award.comp_name || award?.competition?.comp_name || award?.register?.competition?.comp_name || '未关联赛事'
const getAwardTeamName = (award) => award.project_name || award.team_name || award?.register?.team_name || '个人参赛'

const formatDateTime = (value) => {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const handleAwardPageChange = (page) => {
  awardQuery.value.page = page
  fetchMyAwardList()
}

const handleAwardSizeChange = (size) => {
  awardQuery.value.size = size
  awardQuery.value.page = 1
  fetchMyAwardList()
}

const goDetail = (id) => {
  router.push(`/register/detail/${id}`)
}

const goDeclare = () => {
  router.push('/award/student/declare')
}

async function downloadProof(award) {
  try { await api.downloadFile(award.proof_url, false, '获奖证明') }
  catch (error) { if (!error.messageShown) ElMessage.error(error.message || '下载证明失败') }
}

const goResubmit = (award) => {
  const compName = getAwardCompName(award)
  sessionStorage.setItem('resubmitAward', JSON.stringify({
    comp_id: award.comp_id,
    comp_name: compName,
    participation_type: award.participation_type,
    award_category: award.award_category,
    award_time: award.award_time,
    advisor_info: award.advisor_info,
    remark: award.remark,
    award_level: award.award_level,
    award_name: award.award_name,
    team_name: getAwardTeamName(award),
    proof_url: award.proof_url || '',
    update_time: award.update_time,
    members: award.register?.members || [],
    leader: award.register?.leader || null,
  }))
  router.push(`/award/student/declare?comp_id=${award.comp_id}&comp_name=${encodeURIComponent(compName)}`)
}

const goSubmitWork = (item, state) => {
  if (state.disabled) return
  router.push({ name: 'work-detail', params: { id: item.id } })
}

const normalizeRegStatus = (status) => {
  const parsed = Number(status)
  return Number.isNaN(parsed) ? status : parsed
}

const getActionState = (item) => {
  const status = normalizeRegStatus(item.status)
  if (status !== 1 && status !== 4) {
    return {
      disabled: true,
      btnText: '资格审核中',
      btnType: 'info',
      tip: '您的报名尚未通过审核，暂无法提交作品',
    }
  }

  if (!item.submit_start_time || !item.submit_end_time) {
    return { disabled: true, btnText: '暂无提交', btnType: 'info', tip: '该赛事未配置提交时间' }
  }

  const now = new Date().getTime()
  const start = new Date(item.submit_start_time).getTime()
  const end = new Date(item.submit_end_time).getTime()

  if (now < start) {
    return {
      disabled: true,
      btnText: '通道未开启',
      btnType: 'info',
      tip: `开启时间：${item.submit_start_time}`,
    }
  }
  if (now > end) {
    return { disabled: true, btnText: '提交已截止', btnType: 'warning', tip: '作品提交通道已关闭' }
  }

  return {
    disabled: false,
    btnText: item.work_url ? '修改作品' : '提交作品',
    btnType: 'primary',
    tip: item.work_url ? '截止前可覆盖提交' : '请在截止前完成提交',
  }
}

const getStatusTag = (status) => {
  const normalizedStatus = normalizeRegStatus(status)
  const map = {
    0: { type: 'warning', text: '待审核' },
    1: { type: 'success', text: '已报名' },
    2: { type: 'danger', text: '已驳回' },
    3: { type: 'info', text: '申报补录' },
    4: { type: 'success', text: '已通过' },
    5: { type: 'danger', text: '已驳回' },
  }
  return map[normalizedStatus] || { type: 'info', text: '未知' }
}

onMounted(() => {
  if (activeTab.value === 'registration') fetchMyRegList()
  else fetchMyAwardList()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">我的竞赛中心</h2>
        <!-- <span class="subtitle">My Competition Center</span> -->
      </div>
      <el-button type="primary" @click="goDeclare" class="declare-btn">
        <el-icon class="mr-1"><Trophy /></el-icon> 申报奖项
      </el-button>
    </div>


    <el-tabs v-model="activeTab" class="custom-tabs">
      <el-tab-pane label="我的报名" name="registration">
        <div v-loading="loading" class="list-wrapper">
          <el-empty v-if="myRegList.length === 0" description="暂无参赛记录" />
          
          <div class="comp-list">
            <div v-for="item in myRegList" :key="item.id" class="comp-card">
              <div class="comp-info" @click="goDetail(item.comp_id)">
                <div class="name-row">
                  <el-tag
                    :type="getStatusTag(item.status).type"
                    effect="dark"
                    size="small"
                    class="status-badge"
                  >
                    {{ getStatusTag(item.status).text }}
                  </el-tag>
                  <h3 class="comp-name">{{ item.comp_name }}</h3>
                </div>

                <div class="meta-row">
                  <span class="meta-item" v-if="item.submit_start_time">
                    <el-icon><Timer /></el-icon>
                    作品提交：{{ item.submit_start_time }} ~ {{ item.submit_end_time }}
                  </span>
                  <span class="meta-item" v-else>
                    <el-icon><Timer /></el-icon> 作品提交时间待定
                  </span>
                </div>
              </div>

              <div class="comp-action">
                <el-button 
                  link 
                  type="primary" 
                  @click="goDetail(item.comp_id)"
                  class="view-btn"
                >
                  查看详情
                </el-button>

                <template v-for="state in [getActionState(item)]" :key="item.id">
                  <div class="submit-wrapper">
                    <div class="status-tip" v-if="!state.disabled">{{ state.tip }}</div>
                    
                    <el-tooltip :content="state.tip" :disabled="!state.disabled" placement="top">
                      <div class="btn-wrap">
                        <el-button
                          :type="state.btnType"
                          :disabled="state.disabled"
                          @click="goSubmitWork(item, state)"
                          class="submit-btn"
                        >
                          <el-icon v-if="item.work_url" class="mr-1"><DocumentChecked /></el-icon>
                          {{ state.btnText }}
                        </el-button>
                      </div>
                    </el-tooltip>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane v-for="tab in awardTabs" :key="tab.name" :label="tab.label" :name="tab.name">
        <div v-if="activeTab === tab.name" v-loading="loading" class="list-wrapper">
          <el-empty v-if="myAwardList.length === 0" :description="tab.empty" />

          <div class="award-list" v-if="myAwardList.length > 0">
            <div class="award-overview">
              <div class="overview-card">
                <div class="num">{{ total }}</div>
                <div class="label">{{ tab.name === 'declaration' ? '累计申报' : '累计获奖' }}</div>
              </div>
              <div v-if="tab.name === 'declaration'" class="overview-card approved">
                <div class="num">{{ awardStats.approved }}</div>
                <div class="label">本页已通过</div>
              </div>
              <div v-if="tab.name === 'declaration'" class="overview-card pending">
                <div class="num">{{ awardStats.draft }}</div>
                <div class="label">本页待审核</div>
              </div>
              <div v-if="tab.name === 'declaration'" class="overview-card rejected">
                <div class="num">{{ awardStats.rejected }}</div>
                <div class="label">本页已驳回</div>
              </div>
            </div>

            <div v-for="award in myAwardList" :key="award.id" class="award-card">
              <div class="award-head">
                <div class="title-wrap">
                  <h4 class="comp-title">{{ getAwardCompName(award) }}</h4>
                  <p class="team-name">参赛项目：{{ getAwardTeamName(award) }}</p>
                </div>

                <div class="tag-group">
                  <el-tag :type="getAwardSourceTag(award.source).type" effect="plain" size="small">
                    {{ getAwardSourceTag(award.source).text }}
                  </el-tag>
                  <el-tag :type="getAwardStatusTag(award.status).type" effect="dark" size="small">
                    {{ getAwardStatusTag(award.status).text }}
                  </el-tag>
                </div>
              </div>

              <div class="award-main">
                <div class="award-name">{{ award.award_level || '未填写等级' }}</div>
                <div class="award-level">{{ award.award_name || '未填写奖项名称' }}</div>
              </div>

              <div class="award-meta">
                <AwardChangeHistory :award-id="award.id" />
                <span class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  {{ tab.name === 'declaration' ? '申报时间' : '获奖时间' }}：{{ formatDateTime(tab.name === 'declaration' ? award.create_time : award.award_time) }}
                </span>
                <span class="meta-item" v-if="award.audit_time">
                  <el-icon><Calendar /></el-icon>
                  审核时间：{{ formatDateTime(award.audit_time) }}
                </span>
                <a
                  v-if="award.proof_url"
                  class="proof-link"
                  :href="award.proof_url"
                  @click.prevent="downloadProof(award)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <el-icon><Paperclip /></el-icon>
                  查看证明材料
                </a>
              </div>

              <div class="reject-box" v-if="tab.name === 'declaration' && award.status === 'rejected'">
                <span v-if="award.reject_reason">驳回原因：{{ award.reject_reason }}</span>
                <span v-else>审核未通过</span>
                <el-button type="primary" size="small" class="resubmit-btn" @click="goResubmit(award)">
                  重新申报
                </el-button>
              </div>
            </div>

            <div class="award-pagination" v-if="total > awardQuery.size">
              <el-pagination
                v-model:current-page="awardQuery.page"
                v-model:page-size="awardQuery.size"
                :total="total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                @current-change="handleAwardPageChange"
                @size-change="handleAwardSizeChange"
              />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<style scoped lang="scss">
.page-container {
  box-sizing: border-box;
  padding: var(--container-padding);
  flex-direction: column;
  min-height: calc(100vh - 110px);
  display: flex;
  margin: 0px 30px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .title { margin: 0; font-size: 22px; color: #303133; }
  .subtitle { font-size: 12px; color: #909399; }
  
  .declare-btn {
    background-color: #a71d31; 
    border-color: #a71d31;
    &:hover { background-color: #c9243f; border-color: #c9243f; }
  }
}

.list-wrapper {
  min-height: 300px;
  margin-top: 10px;
}

.comp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 卡片样式 */
.comp-card {
  background-color: #fff;
  padding: var(--item-padding);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  border: 1px solid #ebeef5;
  
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
    border-color: #dcdfe6;
  }

  .comp-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer; /* 点击左侧也能进详情 */

    .name-row {
      display: flex;
      align-items: center;
      gap: 12px;
      .status-badge { flex-shrink: 0; }
      .comp-name {
        margin: 0;
        font-size: 18px;
        color: #303133;
        font-weight: 600;
        line-height: 1.4;
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 14px;
      color: #909399;
      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        .el-icon { margin-top: -1px; }
      }
    }
  }

  /* 右侧操作区 */
  .comp-action {
    margin-left: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px; /* 两个按钮之间的间距 */

    .view-btn {
      font-size: 14px;
    }

    .submit-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-end; /* 右对齐 */
      gap: 4px;

      .status-tip {
        font-size: 12px;
        color: #13c2c2; /* 青色提示 */
        margin-right: 2px;
      }

      .submit-btn {
        width: 110px;
        height: 38px;
        font-weight: 600;
        
        /* 只有未禁用的 primary 按钮才加阴影效果 */
        &.el-button--primary:not(.is-disabled) {
          background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
          border: none;
          box-shadow: var(--primary-btn-shadow);
          &:hover {
            transform: translateY(-1px);
            box-shadow: var(--primary-btn-hover-shadow);
          }
        }
      }
    }
  }
}

.mr-1 { margin-right: 4px; }

:deep(.el-tabs__item) {
  font-size: 15px;
  height: 45px;
  &.is-active { font-weight: bold; }
}

.award-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.award-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 4px;

  .overview-card {
    border-radius: var(--card-radius);
    border: 1px solid #ebeef5;
    background: #ffffff;
    padding: 14px 16px;
    box-shadow: var(--card-shadow);

    .num {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.1;
      color: #303133;
    }

    .label {
      margin-top: 4px;
      color: #606266;
      font-size: 13px;
    }

    &.approved .num { color: #67c23a; }
    &.pending .num { color: #e6a23c; }
    &.rejected .num { color: #f56c6c; }
  }
}

.award-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: var(--card-radius);
  padding: 18px 20px;
  transition: all 0.25s ease;

  &:hover {
    border-color: #dcdfe6;
    box-shadow: var(--card-hover-shadow);
    transform: translateY(-1px);
  }

  .award-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;

    .title-wrap {
      min-width: 0;

      .comp-title {
        margin: 0;
        color: #303133;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.35;
      }

      .team-name {
        margin: 6px 0 0;
        color: #909399;
        font-size: 13px;
      }
    }

    .tag-group {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  .award-main {
    margin-top: 14px;

    .award-name {
      color: #1f2f3d;
      font-size: 16px;
      font-weight: 600;
    }

    .award-level {
      margin-top: 6px;
      color: #606266;
      font-size: 14px;
    }
  }

  .award-meta {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    color: #909399;
    font-size: 13px;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .proof-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #409eff;
      text-decoration: none;

      &:hover { color: #337ecc; }
    }
  }

  .reject-box {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: var(--card-radius);
    background: #fff2f0;
    border: 1px solid #ffccc7;
    color: #a8071a;
    font-size: 13px;
    line-height: 1.5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    .resubmit-btn {
      flex-shrink: 0;
    }
  }
}

.award-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (max-width: 1024px) {
  .award-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-container {
    margin: 0;
    padding: 14px;
  }

  .page-header {
    align-items: flex-start;
    gap: 10px;
    flex-direction: column;

    .declare-btn {
      width: 100%;
    }
  }

  .comp-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;

    .comp-action {
      margin-left: 0;
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;

      .submit-wrapper {
        align-items: flex-start;
      }
    }
  }

  .award-overview {
    grid-template-columns: 1fr;
  }

  .award-card {
    padding: 14px;

    .award-head {
      flex-direction: column;
      gap: 10px;

      .tag-group {
        width: 100%;
      }
    }
  }

  .award-pagination {
    justify-content: center;
  }
}
</style>
