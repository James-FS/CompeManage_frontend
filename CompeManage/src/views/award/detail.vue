<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Upload, Edit, Refresh } from '@element-plus/icons-vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import api from '@/api'
import { put } from '@/utils/request'
import { useUserStore } from '@/stores/user'
const compID = useRoute().params.id
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const teams = ref([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const memberTeam = ref(null)
const teamEdit = ref(null)
const memberEdit = ref(null)
const saving = ref(false)
const colleges = ref([])
const filteredTeams = computed(() => teams.value.filter(t => !keyword.value || [t.project_name, ...t.members.map(m => `${m.name} ${m.student_id} ${m.college}`)].some(v => v?.includes(keyword.value.trim()))))
const pagedTeams = computed(() => filteredTeams.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
watch(keyword, () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })
const studentCount = computed(() => filteredTeams.value.reduce((n, t) => n + t.members.length, 0))
const errorMessage = e => e.response?.data?.message || e.message || '操作失败'
const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.getCompAwards(compID)
    teams.value = res.data.list || []
    if (memberTeam.value) memberTeam.value = teams.value.find(t => t.id === memberTeam.value.id) || null
  } catch (e) { ElMessage.error(errorMessage(e)) }
  finally { loading.value = false }
}
const openTeam = t => { teamEdit.value = { ...t } }
const saveTeam = async () => {
  saving.value = true
  try {
    await put(`/api/award/teams/${teamEdit.value.id}`, teamEdit.value)
    teamEdit.value = null
    await fetchData()
    ElMessage.success('获奖信息已更新')
  } catch (e) { ElMessage.error(errorMessage(e)) }
  finally { saving.value = false }
}
const saveMember = async () => {
  if (!memberEdit.value.student_id?.trim()) { ElMessage.warning('学号不能为空'); return }
  saving.value = true
  try {
    const body = { student_id: memberEdit.value.student_id, remark: memberEdit.value.remark }
    if (userStore.role === 'school_admin' && memberEdit.value.assign_college) body.submitted_college_id = memberEdit.value.assign_college
    await put(`/api/award/members/${memberEdit.value.id}`, body)
    memberEdit.value = null
    await fetchData()
    ElMessage.success('成员信息已更新')
  } catch (e) { ElMessage.error(errorMessage(e)) }
  finally { saving.value = false }
}
const handleExport = async () => {
  if (!studentCount.value) { ElMessage.warning('暂无可导出的成员数据'); return }
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('获奖名单')
  const headers = ['序号', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '备注']
  sheet.columns = headers.map((header, i) => ({ header, width: i === 0 ? 8 : i === 5 ? 35 : 22 }))
  sheet.getColumn(2).numFmt = '@'
  sheet.getColumn(7).numFmt = '@'
  let index = 0
  filteredTeams.value.forEach(t => t.members.forEach(m => sheet.addRow([++index, m.student_id, m.name, m.college, m.major, t.project_name, t.award_month, t.award_category, t.award_name, m.remark])))
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } } })
  sheet.eachRow(row => row.eachCell(c => { c.alignment = { vertical: 'middle', wrapText: true } }))
  try { saveAs(new Blob([await workbook.xlsx.writeBuffer()]), `获奖名单_${compID}.xlsx`) }
  catch (e) { ElMessage.error(errorMessage(e)) }
}
onMounted(async () => {
  await fetchData()
  if (userStore.role === 'school_admin') {
    try { colleges.value = (await api.getCollegeList()).data || [] }
    catch (e) { ElMessage.error(errorMessage(e)) }
  }
})
</script>
<template>
  <div class="award-detail">
    <el-card shadow="never">
      <template #header><div class="header"><span>获奖名单</span><span>{{ filteredTeams.length }} 个团队项目 · {{ studentCount }} 名获奖学生</span></div></template>
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索项目、姓名、学号或学院" clearable style="width: 320px" />
        <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Upload" @click="router.push({ name: 'AwardImport', params: { id: compID } })">导入名单</el-button>
        <el-button type="success" :icon="Download" @click="handleExport">导出 Excel</el-button>
      </div>
      <el-table :data="pagedTeams" v-loading="loading" border style="margin-top: 18px" max-height="calc(100vh - 260px)">
        <el-table-column type="index" label="序号" width="65" align="center" />
        <el-table-column prop="project_name" label="参赛项目名称" min-width="240" show-overflow-tooltip align="center" />
        <el-table-column prop="award_category" label="获奖类别" width="120" align="center" />
        <el-table-column prop="award_name" label="获奖等级" width="140" align="center" />
        <el-table-column prop="award_month" label="获奖时间" width="140" align="center" />
        <el-table-column label="获奖成员" min-width="240" align="center"><template #default="{ row }"><el-button link type="primary" @click="memberTeam = row">{{ row.members.map(m => m.name).join('、') || '历史成员待核对' }}（{{ row.members.length }}人）</el-button></template></el-table-column>
        <el-table-column label="操作" width="140" align="center"><template #default="{ row }"><el-button v-if="row.can_edit_team" link type="primary" :icon="Edit" @click="openTeam(row)">修改获奖信息</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="filteredTeams.length" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" style="margin-top: 18px; justify-content: flex-end" />
    </el-card>
    <el-dialog :model-value="!!memberTeam" title="获奖成员" width="1000px" @close="memberTeam = null">
      <template v-if="memberTeam">
        <p>{{ memberTeam.project_name }}</p>
        <el-table :data="memberTeam.members" border>
          <el-table-column prop="student_id" label="学号" width="150" />
          <el-table-column prop="name" label="姓名" width="110" />
          <el-table-column prop="college" label="所属学院" min-width="200" />
          <el-table-column prop="major" label="专业" min-width="180" />
          <el-table-column prop="remark" label="备注" min-width="180" />
          <el-table-column label="填报归属" width="150"><template #default="{ row }">{{ row.submitted_college_name || colleges.find(c => c.id === row.submitted_college_id)?.name || (row.submitted_college_id ? '已确认' : '待校管理员确认') }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button v-if="row.can_edit" link type="primary" @click="memberEdit = { ...row }">编辑</el-button></template></el-table-column>
        </el-table>
      </template>
    </el-dialog>
    <el-dialog :model-value="!!teamEdit" title="修改获奖信息" width="560px" @close="teamEdit = null">
      <template v-if="teamEdit">
        <el-alert title="修改将影响该团队所有获奖成员。不同学院提交的信息不会被删除。" type="info" :closable="false" />
        <el-form label-width="110px" style="margin-top: 18px">
          <el-form-item label="项目名称"><el-input v-model="teamEdit.project_name" maxlength="255" /></el-form-item>
          <el-form-item label="获奖类别"><el-select v-model="teamEdit.award_category"><el-option v-for="c in ['校赛', '国家级', '省级', '国际级']" :key="c" :label="c" :value="c" /></el-select></el-form-item>
          <el-form-item label="获奖等级"><el-input v-model="teamEdit.award_name" maxlength="100" /></el-form-item>
          <el-form-item label="获奖时间"><el-date-picker v-model="teamEdit.award_month" type="month" value-format="YYYY-MM" /></el-form-item>
        </el-form>
      </template>
      <template #footer><el-button @click="teamEdit = null">取消</el-button><el-button type="primary" :loading="saving" @click="saveTeam">保存</el-button></template>
    </el-dialog>
    <el-dialog :model-value="!!memberEdit" title="修改成员信息" width="540px" @close="memberEdit = null">
      <el-form v-if="memberEdit" label-width="110px">
        <el-form-item label="学号"><el-input v-model="memberEdit.student_id" /><div class="hint">修正学号时，姓名、学院、专业随系统学生资料更新。</div></el-form-item>
        <el-form-item label="备注"><el-input v-model="memberEdit.remark" type="textarea" maxlength="2000" /></el-form-item>
        <el-form-item v-if="userStore.role === 'school_admin' && !memberEdit.submitted_college_id" label="确认填报学院"><el-select v-model="memberEdit.assign_college" clearable filterable><el-option v-for="c in colleges" :key="c.id" :label="c.name" :value="c.id" /></el-select><div class="hint">仅用于确认历史或尚未确定的填报归属。</div></el-form-item>
      </el-form>
      <template #footer><el-button @click="memberEdit = null">取消</el-button><el-button type="primary" :loading="saving" @click="saveMember">保存</el-button></template>
    </el-dialog>
  </div>
</template>
<style scoped>
.award-detail { padding: 20px; }
.header, .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.header { justify-content: space-between; }
.hint { font-size: 12px; color: #909399; margin-top: 6px; }
</style>
