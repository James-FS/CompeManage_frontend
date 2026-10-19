<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const loading = ref(false), saving = ref(false), uploading = ref(false)
const list = ref([]), total = ref(0), visible = ref(false), detail = ref(null)
const formRef = ref()
const query = reactive({ keyword: '', status: '', page: 1, size: 10 })
const form = reactive({ project_name: '', award_category: '', award_name: '', award_date: '', proof_url: '', remark: '', update_time: '' })
const statuses = { draft: { text: '待审核', type: 'warning' }, rejected: { text: '已退回', type: 'danger' }, approved: { text: '已通过', type: 'success' } }
const rules = Object.fromEntries(['project_name', 'award_category', 'award_name', 'award_date', 'proof_url'].map(key => [key, [{ required: true, message: '请填写此项', trigger: 'change' }]]))
const date = value => value ? value.slice(0, 10) : '—'
const showError = error => { if (!error.messageShown) ElMessage.error(error.message || '操作失败，请稍后重试') }
let sequence = 0
let detailSequence = 0
async function fetchList(reset = false) {
  if (reset) query.page = 1
  const current = ++sequence
  loading.value = true
  try {
    const res = await api.getAdvisorAwards({ ...query })
    if (current !== sequence) return
    list.value = res.data.list || []; total.value = res.data.total || 0
  } catch (error) { showError(error) }
  finally { if (current === sequence) loading.value = false }
}
async function openDetail(row) {
  if (saving.value || uploading.value) return
  const current = ++detailSequence
  try {
    const res = await api.getAdvisorAwardDetail(row.id)
    if (current !== detailSequence) return
    detail.value = res.data
    const a = res.data.award
    Object.assign(form, { project_name: a.project_name, award_category: a.award_category, award_name: a.award_name, award_date: a.award_time?.slice(0, 10) || '', proof_url: a.proof_url || '', remark: a.remark || '', update_time: a.update_time })
    visible.value = true
    formRef.value?.clearValidate()
  } catch (error) { showError(error) }
}
async function upload({ file, onSuccess, onError }) {
  uploading.value = true
  try {
    // Keep the existing certificate type so reuploads can reuse its file hash.
    const data = new FormData(); data.append('file', file); data.append('type', 'award_cert')
    const res = await api.uploadFile(data)
    form.proof_url = res.data.url; onSuccess(res)
    formRef.value?.clearValidate('proof_url')
  } catch (error) { onError(error); showError(error) }
  finally { uploading.value = false }
}
async function save() {
  if (!await formRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    await api.updateAdvisorAward(detail.value.award.id, { ...form })
    ElMessage.success('修改成功，等待管理员审核')
    visible.value = false
    await fetchList()
  } catch (error) { showError(error) }
  finally { saving.value = false }
}
async function downloadProof() {
  try { await api.downloadFile(form.proof_url, false, '获奖证明') }
  catch (error) { showError(error) }
}
function changesText(change) {
  const labels = { project_name: '项目名称', award_category: '获奖类别', award_name: '获奖等级', award_time: '获奖日期', proof_url: '获奖证明', remark: '备注', status: '审核状态' }
  try {
    const before = JSON.parse(change.before), after = JSON.parse(change.after)
    return Object.keys(labels).filter(key => before[key] !== after[key]).map(key => `${labels[key]}：${key === 'status' ? (statuses[before[key]]?.text || before[key]) : (before[key] || '空')} → ${key === 'status' ? (statuses[after[key]]?.text || after[key]) : (after[key] || '空')}`).join('；') || '保存填报'
  } catch { return '修改填报' }
}
onMounted(fetchList)
</script>

<template>
  <div class="advisor-page">
    <div class="heading"><h2>我的指导获奖</h2><p>查看学生填报，协助完善自己指导的获奖项目。</p></div>
    <el-alert title="待审核或被退回的学生填报可以修改，保存后等待管理员审核。已通过记录和系统导入记录为只读。" type="info" :closable="false" show-icon />
    <el-card class="list-card" shadow="never">
      <el-form inline @submit.prevent="fetchList(true)">
        <el-form-item label="搜索"><el-input v-model="query.keyword" placeholder="赛事 / 项目名称" clearable @keyup.enter="fetchList(true)" /></el-form-item>
        <el-form-item label="审核状态"><el-select v-model="query.status" placeholder="全部" clearable style="width: 140px" @change="fetchList(true)"><el-option v-for="(status, key) in statuses" :key="key" :label="status.text" :value="key" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="fetchList(true)">查询</el-button></el-form-item>
      </el-form>
      <el-table v-loading="loading" :data="list">
        <el-table-column prop="comp_name" label="赛事" min-width="180" />
        <el-table-column prop="project_name" label="项目名称" min-width="180" />
        <el-table-column prop="award_level" label="获奖等级" min-width="150" />
        <el-table-column label="获奖日期" width="130"><template #default="{ row }">{{ date(row.award_time) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statuses[row.status]?.type">{{ statuses[row.status]?.text || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="130" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">{{ row.can_edit ? '查看 / 修改' : '查看详情' }}</el-button></template></el-table-column>
        <template #empty>
          <el-empty description="暂无您指导的获奖项目" />
        </template>
      </el-table>
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.size" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="fetchList()" @size-change="fetchList(true)" />
    </el-card>
    <el-dialog v-model="visible" title="指导获奖详情" width="min(800px, 94vw)" :close-on-click-modal="false" :close-on-press-escape="!saving && !uploading" :show-close="!saving && !uploading" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="赛事">{{ detail.award.competition?.comp_name }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statuses[detail.award.status]?.text }}</el-descriptions-item>
          <el-descriptions-item label="指导老师" :span="2">{{ detail.award.advisors?.map(a => `${a.name}（${a.username}）`).join('、') }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-if="detail.award.reject_reason" :title="`退回原因：${detail.award.reject_reason}`" type="warning" :closable="false" class="section" />
        <h3>参赛成员</h3>
        <el-table :data="detail.award.award_members || []" size="small">
          <el-table-column prop="name" label="姓名" /><el-table-column prop="student_number" label="学号" /><el-table-column prop="college" label="学院" /><el-table-column label="身份"><template #default="{ row }">{{ row.is_leader ? '队长 / 申报人' : '成员' }}</template></el-table-column>
        </el-table>
        <h3>获奖信息</h3>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" :disabled="!detail.can_edit || saving">
          <el-form-item label="项目名称" prop="project_name"><el-input v-model="form.project_name" maxlength="255" /></el-form-item>
          <el-form-item label="获奖类别" prop="award_category"><el-select v-model="form.award_category"><el-option v-for="item in ['国家级', '省级', '校级']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
          <el-form-item label="获奖等级" prop="award_name"><el-select v-model="form.award_name"><el-option v-for="item in ['一等奖', '二等奖', '三等奖']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
          <el-form-item label="获奖日期" prop="award_date"><el-date-picker v-model="form.award_date" type="date" value-format="YYYY-MM-DD" /></el-form-item>
          <el-form-item label="证明材料" prop="proof_url"><el-upload v-if="detail.can_edit" :http-request="upload" :show-file-list="false" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" :disabled="saving || uploading"><el-button :loading="uploading">{{ form.proof_url ? '更换证明' : '上传证明' }}</el-button></el-upload><span v-else>{{ form.proof_url ? '已上传' : '暂无证明' }}</span></el-form-item>
          <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="2000" show-word-limit /></el-form-item>
        </el-form>
        <el-button v-if="form.proof_url" link type="primary" @click="downloadProof">下载当前获奖证明</el-button>
        <h3>修改记录</h3>
        <el-empty v-if="!detail.changes?.length" description="暂无教师修改记录" :image-size="45" />
        <el-timeline v-else><el-timeline-item v-for="change in detail.changes" :key="change.id" :timestamp="change.create_time"><strong>{{ change.operator_name }}</strong><p class="change-text">{{ changesText(change) }}</p></el-timeline-item></el-timeline>
      </template>
      <template #footer><el-button :disabled="saving || uploading" @click="visible = false">关闭</el-button><el-button v-if="detail?.can_edit" type="primary" :loading="saving" :disabled="uploading" @click="save">保存并送审</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.advisor-page { padding: 24px; }
.heading h2 { margin: 0 0 8px; }
.heading p { color: #64748b; margin: 0 0 20px; }
.list-card { margin-top: 20px; }
.el-pagination { margin-top: 20px; justify-content: flex-end; }
.section { margin-top: 16px; }
.change-text { overflow-wrap: anywhere; white-space: pre-wrap; }
@media (max-width: 600px) { .advisor-page { padding: 12px; } }
</style>
