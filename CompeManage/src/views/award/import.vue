<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, UploadFilled, Delete, Plus, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import api from '@/api'
import { post } from '@/utils/request'
const compID = useRoute().params.id
const router = useRouter()
const competitionName = ref('')
const loading = ref(false)
const loadingText = ref('')
const tableData = ref([])
const fileName = ref('')
const collegeList = ref([])
const validationErrors = computed(() => tableData.value.filter(row => row.error))
const validationErrorCount = computed(() => validationErrors.value.length)
const validationDialogVisible = ref(false)
const validationReport = ref([])
const validationStage = ref('local')
const validationSourceFile = ref('')
const reportPage = ref(1)
const reportPageSize = ref(50)
const reportErrors = computed(() => validationReport.value.filter(row => row.error))
const reportPageRows = computed(() => reportErrors.value.slice((reportPage.value - 1) * reportPageSize.value, reportPage.value * reportPageSize.value))
const saveValidationReport = stage => {
  validationReport.value = tableData.value.map((row, index) => ({ ...row, sequence: index + 1 }))
  validationStage.value = stage
  validationSourceFile.value = fileName.value
  reportPage.value = 1
}
const openValidationReport = () => {
  reportPage.value = 1
  validationDialogVisible.value = true
}
watch(reportPageSize, () => { reportPage.value = 1 })
const currentPage = ref(1)
const pageSize = ref(50)
const pageRows = computed(() => tableData.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
let nextRowKey = 0
const identifyRows = rows => rows.map(row => ({ ...row, _rowKey: ++nextRowKey }))
watch([() => tableData.value.length, pageSize], () => {
  currentPage.value = Math.max(1, Math.min(currentPage.value, Math.ceil(tableData.value.length / pageSize.value)))
})
const removeRow = row => {
  const index = tableData.value.findIndex(item => item._rowKey === row._rowKey)
  if (index >= 0) tableData.value.splice(index, 1)
}
const showErrorRow = row => {
  const index = tableData.value.findIndex(item => item._rowKey === row._rowKey)
  if (index >= 0) currentPage.value = Math.floor(index / pageSize.value) + 1
}
const locateReportRow = row => {
  if (!tableData.value.some(item => item._rowKey === row._rowKey)) {
    ElMessage.info('该行已从预览中删除，请重新提交以更新校验结果')
    return
  }
  showErrorRow(row)
  validationDialogVisible.value = false
}
const clearRows = () => {
  tableData.value = []
  fileName.value = ''
  currentPage.value = 1
  validationReport.value = []
  validationDialogVisible.value = false
}
const columns = [
  { key: 'student_id', label: '学号', width: 160 },
  { key: 'name', label: '学生姓名', width: 120 },
  { key: 'college', label: '所属学院', width: 220 },
  { key: 'major', label: '所在专业', width: 200 },
  { key: 'project_name', label: '参赛项目名称', width: 260 },
  { key: 'award_month', label: '获奖时间（年/月）', width: 180 },
  { key: 'award_category', label: '获奖类别', width: 130 },
  { key: 'award_name', label: '获奖等级', width: 140 },
  { key: 'remark', label: '备注', width: 220 },
]
const categories = ['校赛', '国家级', '省级', '国际级']
const awardLevels = ['一等奖', '二等奖', '三等奖']
const exportValidationReport = () => {
  const reportColumns = [
    { label: '序号', value: row => row.sequence },
    ...columns.map(column => ({ label: column.label, value: row => row[column.key] || '' })),
    { label: '指导教师工号', value: row => row.advisor_usernames || '' },
    { label: '指导教师所在学院', value: row => row.advisor_colleges || '' },
    { label: '导入结果', value: row => row.existing ? '已存在，本次未新增或修改' : '未导入' },
    { label: '校验结果', value: row => row.error ? '校验失败' : validationStage.value === 'server' ? '本行校验通过' : '尚未完成服务端校验' },
    { label: '未导入原因', value: row => row.error || (row.existing
      ? '系统已有该记录，保留原填报归属；本批校验未通过，未新增或修改数据'
      : validationStage.value === 'server'
        ? '本行校验通过，但本批存在校验失败记录，整批未导入'
        : '本批存在解析校验错误，尚未提交导入；本行仍需服务端校验') },
    { label: '来源文件', value: () => validationSourceFile.value || '手工录入' },
  ]
  const sheet = XLSX.utils.aoa_to_sheet([
    reportColumns.map(column => column.label),
    ...validationReport.value.map(row => reportColumns.map(column => String(column.value(row)))),
  ])
  sheet['!cols'] = reportColumns.map(column => ({ wch: column.label === '未导入原因' ? 70 : column.label === '参赛项目名称' ? 30 : 22 }))
  sheet['!autofilter'] = { ref: sheet['!ref'] }
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '未导入名单')
  const sourceName = (validationSourceFile.value || `赛事${compID}`).replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_')
  XLSX.writeFile(workbook, `${sourceName}_未导入名单.xlsx`)
}
const normalizeAwardLevel = value => {
  const text = String(value || '').replace(/[\s\u3000（）()]/g, '')
  if (['一等奖', '一等', '冠军', '金奖', '特等奖'].some(label => text.includes(label))) return '一等奖'
  if (['二等奖', '二等', '亚军', '银奖'].some(label => text.includes(label))) return '二等奖'
  if (['三等奖', '三等', '季军', '铜奖'].some(label => text.includes(label))) return '三等奖'
  return ''
}
const addRow = () => {
  tableData.value.push({ ...Object.fromEntries(columns.map(c => [c.key, ''])), _rowKey: ++nextRowKey })
  currentPage.value = Math.ceil(tableData.value.length / pageSize.value)
}
const errorMessage = error => error.response?.data?.message || error.message || '操作失败'
const loadColleges = async () => {
  try {
    const res = await api.getCollegeList()
    collegeList.value = res.data || []
  } catch (error) { ElMessage.error(errorMessage(error)) }
}
const loadCompetitionName = async () => {
  try {
    const res = await api.getCompetitionDetail(compID)
    competitionName.value = res.data?.comp_name || ''
  } catch (error) { ElMessage.error(errorMessage(error)) }
}
const downloadTemplate = async () => {
  try { saveAs(await api.getAwardTemplate(compID), '获奖名单导入模板.xlsx') }
  catch (error) { ElMessage.error(errorMessage(error)) }
}
const revalidateImport = async () => {
  if (loading.value) return
  if (!tableData.value.length) {
    ElMessage.warning('请先导入或新增数据')
    return
  }
  loadingText.value = '正在重新校验，请稍候…'
  loading.value = true
  try {
    const currentRows = tableData.value
    const rows = currentRows.map(({ _rowKey, ...row }) => row)
    const res = await post(`/api/award/import/preview?comp_id=${compID}`, { rows }, { timeout: 120000 })
    const validatedRows = res.data?.rows
    if (!Array.isArray(validatedRows)) throw new Error('校验结果格式错误')
    tableData.value = validatedRows.map((row, index) => ({
      ...row,
      _rowKey: currentRows[index]?._rowKey ?? ++nextRowKey,
    }))
    saveValidationReport('server')
    const firstError = tableData.value.find(row => row.error)
    if (firstError) {
      showErrorRow(firstError)
      openValidationReport()
      ElMessage.warning('数据校验未通过')
    } else {
      validationDialogVisible.value = false
      ElMessage.success('校验通过，可以提交导入')
    }
  } catch (error) {
    if (!error.messageShown) ElMessage.error(errorMessage(error))
  } finally {
    loading.value = false
    loadingText.value = ''
  }
}
const handleFileChange = async uploadFile => {
  if (!uploadFile?.raw || loading.value) return
  loadingText.value = '正在读取 Excel…'
  loading.value = true
  await nextTick()
  try {
    const workbook = XLSX.read(await uploadFile.raw.arrayBuffer(), { type: 'array' })
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false })
    const headers = (rows[0] || []).map(v => String(v).trim())
    const columnIndexes = Object.fromEntries(columns.map(column => [column.key, headers.indexOf(column.label)]))
    if (columnIndexes.award_month < 0) columnIndexes.award_month = headers.indexOf('获奖时间（年/月/日）')
    const missing = columns.filter(c => c.key !== 'remark' && columnIndexes[c.key] < 0)
    if (missing.length) throw new Error(`缺少字段：${missing.map(c => c.label).join('、')}，请下载新版模板`)
    const data = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (String(row[0] || '').trim().startsWith('说明：')) break
      if (String(row[0] || '').trim() === '示例') continue
      const item = Object.fromEntries(columns.map(c => [c.key, String(row[columnIndexes[c.key]] || '').trim()]))
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.award_month)) item.award_month = item.award_month.slice(0, 7)
      const dottedMonth = /^(\d{4})\.(\d{1,2})$/.exec(item.award_month)
      if (dottedMonth) item.award_month = `${dottedMonth[1]}-${dottedMonth[2].padStart(2, '0')}`
      if (item.award_name) {
        const awardLevel = normalizeAwardLevel(item.award_name)
        if (awardLevel) item.award_name = awardLevel
        else item.error = `获奖等级“${item.award_name}”无法识别，请选择一等奖、二等奖或三等奖`
      }
      if (!Object.values(item).some(Boolean)) continue
      item.row_number = i + 1
      for (const [key, label] of [['advisor_usernames', '指导教师工号'], ['advisor_colleges', '指导教师所在学院']]) {
        item[key] = String(row[headers.indexOf(label)] || '').trim()
      }
      data.push(item)
    }
    if (data.length > 5000) throw new Error('每批最多导入5000行')
    tableData.value = identifyRows(data)
    currentPage.value = 1
    fileName.value = uploadFile.name
    validationDialogVisible.value = false
    if (validationErrorCount.value) saveValidationReport('local')
    else validationReport.value = []
    ElMessage.success(`已导入 ${data.length} 名学生数据`)
  } catch (error) { ElMessage.error(errorMessage(error)) }
  finally { loading.value = false }
}
const submitImport = async () => {
  if (loading.value) return
  if (!tableData.value.length) {
    ElMessage.warning('请先导入或新增数据')
    return
  }
  if (validationErrorCount.value) {
    openValidationReport()
    ElMessage.warning('请修正校验结果中的错误')
    return
  }
  loadingText.value = '正在校验并导入，请稍候…'
  loading.value = true
  try {
    const rows = tableData.value.map(({ _rowKey, ...row }) => row)
    const res = await post(`/api/award/import?comp_id=${compID}`, { rows }, { timeout: 120000, warningOnBadRequest: true })
    ElMessage.success(res.message || '导入成功')
    router.push({ name: 'AwardDetail', params: { id: compID } })
  } catch (error) {
    const failedRows = error.response?.data?.data?.rows
    if (Array.isArray(failedRows)) {
      tableData.value = identifyRows(failedRows)
      saveValidationReport('server')
      const firstError = tableData.value.find(row => row.error)
      if (firstError) showErrorRow(firstError)
      openValidationReport()
    }
  } finally { loading.value = false }
}
onMounted(() => {
  loadCompetitionName()
  loadColleges()
})
</script>
<template>
  <div class="import-page">
    <el-card class="toolbar-card" shadow="never">
      <template #header>
        <div class="page-title">
          <strong>{{ competitionName || `赛事 ${compID}` }}</strong>
          <span>获奖名单导入</span>
        </div>
      </template>
      <div class="actions">
        <el-button type="primary" :icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-upload :auto-upload="false" :show-file-list="false" accept=".xlsx" :on-change="handleFileChange" :disabled="loading">
          <el-button type="success" :icon="UploadFilled" :disabled="loading">选择 Excel</el-button>
        </el-upload>
        <span>{{ fileName }}</span>
      </div>
    </el-card>
    <el-card class="preview-card" shadow="never">
      <template #header>
        <div class="preview-header">
          <span>导入数据预览（{{ tableData.length }} 名学生）</span>
          <div class="preview-header-actions">
            <el-button v-if="reportErrors.length" type="danger" plain :disabled="loading" @click="openValidationReport">查看校验结果</el-button>
            <el-button :icon="Plus" :disabled="loading" @click="addRow">新增一条</el-button>
          </div>
        </div>
      </template>
      <el-alert title="同一赛事内项目名称相同视为同一团队，获奖类别、等级和时间必须一致。国际级统一保存为国家级。" type="info" :closable="false" />
      <div v-if="loading" class="preview-controls" role="status">{{ loadingText }}</div>
      <el-table class="preview-table" :data="pageRows" row-key="_rowKey" v-loading="loading" :element-loading-text="loadingText" border height="100%">
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
        <el-table-column align="center" header-align="center" type="index" :index="index => (currentPage - 1) * pageSize + index + 1" label="序号" width="65" fixed />
        <el-table-column align="center" header-align="center" v-for="column in columns" :key="column.key" :label="column.label" :min-width="column.width">
          <template #default="{ row }">
            <el-select
              v-if="column.key === 'college'"
              v-model="row[column.key]"
              filterable
              clearable
              fit-input-width
              placeholder="请选择学院"
              :disabled="loading"
              style="width: 180px; max-width: 100%"
              @change="row.error = ''; row.existing = false"
            >
              <el-option v-for="college in collegeList" :key="college.id" :label="college.name" :value="college.name" />
            </el-select>
            <el-select v-else-if="column.key === 'award_category'" v-model="row[column.key]" :disabled="loading" @change="row.error = ''; row.existing = false">
              <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
            </el-select>
            <el-select
              v-else-if="column.key === 'award_name'"
              v-model="row[column.key]"
              clearable
              placeholder="请选择等级"
              :disabled="loading"
              @change="row.error = ''; row.existing = false"
            >
              <el-option v-for="level in awardLevels" :key="level" :label="level" :value="level" />
            </el-select>
            <el-date-picker
              v-else-if="column.key === 'award_month'"
              v-model="row[column.key]"
              type="month"
              format="YYYY-MM"
              value-format="YYYY-MM"
              placeholder="选择月份"
              clearable
              :disabled="loading"
              style="width: 180px; max-width: 100%"
              @change="row.error = ''; row.existing = false"
            />
            <el-input v-else v-model="row[column.key]" :disabled="loading" @input="row.error = ''; row.existing = false" />
          </template>
        </el-table-column>
        <el-table-column align="center" header-align="center" label="操作" width="70" fixed="right"><template #default="{ row }"><el-button link type="danger" :icon="Delete" :disabled="loading" @click="removeRow(row)" /></template></el-table-column>
      </el-table>
      <div class="footer">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" :total="tableData.length" :disabled="loading" layout="total, sizes, prev, pager, next" />
        <el-button :disabled="loading" @click="clearRows">清空</el-button>
        <el-button type="primary" :icon="CircleCheck" :loading="loading" @click="submitImport">提交导入</el-button>
      </div>
    </el-card>
    <el-dialog v-model="validationDialogVisible" title="校验失败结果" width="min(1100px, 94vw)" append-to-body destroy-on-close align-center>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>本次导入 {{ validationReport.length }} 行，其中 {{ reportErrors.length }} 行校验失败。</template>
        <div>修改预览数据后，请重新提交更新校验结果。</div>
      </el-alert>
      <el-table :data="reportPageRows" row-key="_rowKey" border max-height="48vh" class="validation-result-table">
        <el-table-column align="center" header-align="center" prop="sequence" label="序号" width="75" />
        <el-table-column align="center" header-align="center" prop="student_id" label="学号" width="150" />
        <el-table-column align="center" header-align="center" prop="name" label="学生姓名" width="110" />
        <el-table-column align="center" header-align="center" prop="college" label="所属学院" min-width="160" />
        <el-table-column align="center" header-align="center" prop="project_name" label="参赛项目名称" min-width="180" />
        <el-table-column align="center" header-align="center" prop="error" label="未导入原因" min-width="300" />
        <el-table-column align="center" header-align="center" label="操作" width="110" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="locateReportRow(row)">定位修改</el-button></template></el-table-column>
      </el-table>
      <template #footer>
        <div class="validation-dialog-footer">
          <el-pagination v-model:current-page="reportPage" v-model:page-size="reportPageSize" :page-sizes="[20, 50, 100]" :total="reportErrors.length" layout="total, sizes, prev, pager, next" />
          <el-button :icon="Download" type="primary" @click="exportValidationReport">导出未导入名单（{{ validationReport.length }} 行）</el-button>
          <el-button type="primary" :loading="loading" @click="revalidateImport">重新校验</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<style scoped>
.import-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: var(--container-padding);
}
.toolbar-card { flex: 0 0 auto; }
:deep(.preview-card.el-card) { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
:deep(.preview-card .el-card__header) { flex: 0 0 auto; }
:deep(.preview-card .el-card__body) { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }
:deep(.preview-card .el-alert) { flex: 0 0 auto; }
.page-title { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; }
.page-title strong { font-size: 18px; }
.preview-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.preview-header-actions { display: flex; align-items: center; }
.preview-table { flex: 1 1 auto; min-height: 0; margin-top: 12px; }
:deep(.preview-table .el-input__inner),
:deep(.preview-table .el-select__selected-item),
:deep(.preview-table .el-select__input) { text-align: center; }
:deep(.preview-table .el-select__selection) { justify-content: center; }
.preview-controls { display: flex; flex: 0 0 auto; align-items: center; gap: 16px; margin-top: 8px; }
.preview-controls { color: #606266; font-size: 14px; }
.actions, .footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.footer { flex: 0 0 auto; justify-content: flex-end; margin-top: 12px; }
.validation-result-table { margin-top: 16px; }
.validation-dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
</style>
