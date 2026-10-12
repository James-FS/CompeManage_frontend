<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, UploadFilled, Delete, Plus, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import api from '@/api'
import { get, post } from '@/utils/request'
import { useUserStore } from '@/stores/user'
const compID = useRoute().params.id
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const tableData = ref([])
const fileName = ref('')
const requireRegistration = ref(false)
const settingReady = ref(false)
const validationErrorCount = computed(() => tableData.value.filter(row => row.error).length)
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
const addRow = () => tableData.value.push(Object.fromEntries(columns.map(c => [c.key, ''])))
const errorMessage = error => error.response?.data?.message || error.message || '操作失败'
const loadSetting = async () => {
  try {
    const res = await get('/api/award/import/settings')
    requireRegistration.value = res.data.require_registration
    settingReady.value = true
  } catch (error) { ElMessage.error(errorMessage(error)) }
}
const downloadTemplate = async () => {
  try { saveAs(await api.getAwardTemplate(compID), '获奖名单导入模板.xlsx') }
  catch (error) { ElMessage.error(errorMessage(error)) }
}
const handleFileChange = async uploadFile => {
  if (!uploadFile?.raw) return
  loading.value = true
  try {
    const workbook = XLSX.read(await uploadFile.raw.arrayBuffer(), { type: 'array' })
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false })
    const headers = (rows[0] || []).map(v => String(v).trim())
    const missing = columns.filter(c => c.key !== 'remark' && !headers.includes(c.label))
    if (missing.length) throw new Error(`缺少字段：${missing.map(c => c.label).join('、')}，请下载新版模板`)
    const data = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (String(row[0] || '').trim().startsWith('说明：')) break
      if (String(row[0] || '').trim() === '示例') continue
      const item = Object.fromEntries(columns.map(c => [c.key, String(row[headers.indexOf(c.label)] || '').trim()]))
      if (!Object.values(item).some(Boolean)) continue
      item.row_number = i + 1
      data.push(item)
    }
    if (data.length > 5000) throw new Error('每批最多导入5000行')
    tableData.value = data
    fileName.value = uploadFile.name
    ElMessage.success(`读取 ${data.length} 名学生，示例和说明行已排除`)
  } catch (error) { ElMessage.error(errorMessage(error)) }
  finally { loading.value = false }
}
const submitImport = async () => {
  if (!tableData.value.length) {
    ElMessage.warning('请先导入或新增数据')
    return
  }
  loading.value = true
  try {
    const res = await post(`/api/award/import?comp_id=${compID}`, { rows: tableData.value })
    ElMessage.success(res.message || '导入成功')
    router.push({ name: 'AwardDetail', params: { id: compID } })
  } catch (error) {
    const failedRows = error.response?.data?.data?.rows
    if (Array.isArray(failedRows)) tableData.value = failedRows
  } finally { loading.value = false }
}
onMounted(loadSetting)
</script>
<template>
  <div class="import-page">
    <el-card shadow="never">
      <template #header>模板与导入</template>
      <div class="actions">
        <el-button type="primary" :icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-upload :auto-upload="false" :show-file-list="false" accept=".xlsx" :on-change="handleFileChange" :disabled="loading">
          <el-button type="success" :icon="UploadFilled" :disabled="loading">选择 Excel</el-button>
        </el-upload>
        <span>{{ fileName }}</span>
      </div>
      <div class="setting">
        <template v-if="settingReady">
          <span>当前报名要求：{{ requireRegistration ? '必须有审核通过的报名' : '无需报名' }}</span>
          <el-button v-if="userStore.role === 'school_admin'" link type="primary" @click="router.push('/award/list')">去调整</el-button>
        </template>
      </div>
    </el-card>
    <el-card shadow="never">
      <template #header>
        <div class="preview-header">
          <span>导入数据预览（{{ tableData.length }} 名学生）</span>
          <el-button :icon="Plus" :disabled="loading" @click="addRow">新增一条</el-button>
        </div>
      </template>
      <el-alert title="同一赛事内项目名称相同视为同一团队，获奖类别、等级和时间必须一致。国际级统一保存为国家级。" type="info" :closable="false" />
      <el-alert
        v-if="validationErrorCount"
        :title="`${validationErrorCount} 行需要修正；本批数据未写入，请根据下方提示修改后重新提交。`"
        type="error"
        :closable="false"
        show-icon
        style="margin-top: 12px"
      />
      <el-table :data="tableData" v-loading="loading" border height="calc(100vh - 390px)" style="margin-top: 16px">
        <el-table-column type="index" label="序号" width="65" fixed />
        <el-table-column label="原始行号" width="95" align="center">
          <template #default="{ row }">{{ row.row_number || '新增' }}</template>
        </el-table-column>
        <el-table-column v-for="column in columns" :key="column.key" :label="column.label" :min-width="column.width">
          <template #default="{ row }">
            <el-select v-if="column.key === 'award_category'" v-model="row[column.key]" :disabled="loading" @change="row.error = ''; row.existing = false">
              <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
            </el-select>
            <el-input v-else v-model="row[column.key]" :disabled="loading" :placeholder="column.key === 'award_month' ? 'YYYY-MM' : ''" @input="row.error = ''; row.existing = false" />
          </template>
        </el-table-column>
        <el-table-column label="校验结果" width="250">
          <template #default="{ row }"><span v-if="row.error" class="error">{{ row.error }}</span><el-tag v-else-if="row.existing" type="info">已存在，保留原填报归属</el-tag><span v-else>待提交校验</span></template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right"><template #default="{ $index }"><el-button link type="danger" :icon="Delete" :disabled="loading" @click="tableData.splice($index, 1)" /></template></el-table-column>
      </el-table>
      <div class="footer">
        <el-button :disabled="loading" @click="tableData = []; fileName = ''">清空</el-button>
        <el-button type="primary" :icon="CircleCheck" :loading="loading" @click="submitImport">提交导入</el-button>
      </div>
    </el-card>
  </div>
</template>
<style scoped>
.import-page { display: grid; gap: 20px; padding: var(--container-padding); }
.preview-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.actions, .setting, .footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.setting { margin-top: 20px; color: #606266; }
.footer { justify-content: flex-end; margin-top: 18px; }
.error { color: #f56c6c; }
</style>
