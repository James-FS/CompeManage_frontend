<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, UploadFilled, Delete, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { post } from '@/utils/request'
const route = useRoute()
const router = useRouter()
const compID = route.params.id

const loading = ref(false)
const fileList = ref([])
const tableData = ref([])

const templateHeaders = [
  '奖项等级',
  '获奖项目名称',
  '负责人',
  '学号',
]

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const downloadTemplate = async () => {
  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('获奖录入')

    const headers = [
      '奖项等级',
      '获奖项目名称',
      '负责人',
      '学号',
    ]
    
    worksheet.columns = headers.map(header => ({
      header: header,
      key: header,
      width: 20
    }))

    const headerRow = worksheet.getRow(1)
    headerRow.height = 25
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      }
      cell.font = { name: '微软雅黑', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    })

    worksheet.addRow(['1', '示例项目名称', '张三', '20210001'])
    
    const exampleRow = worksheet.getRow(2)
    exampleRow.font = { color: { argb: 'FF999999' }, italic: true }
    exampleRow.eachCell(cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer]), `Award_Template_${compID}.xlsx`)
    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败')
  }
}

const handleFileChange = async (uploadFile, uploadFiles) => {
  fileList.value = uploadFiles
  if (!uploadFile?.raw) return
  
  try {
    loading.value = true
    const buffer = await uploadFile.raw.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (!rows || rows.length <= 1) {
      tableData.value = []
      ElMessage.warning('模板中暂无可导入数据')
      return
    }

    tableData.value = rows.slice(1)
      .filter(row => row[0])
      .map((row, index) => {
        return {
          id: index + 1,
          award_level:  row[0] || '',
          project_name: row[1] || '',
          leader_name:  row[2] || '',
          leader_id:    row[3] || '',
        }
      })

    ElMessage.success(`成功读取 ${tableData.value.length} 条数据`)
  } catch (error) {
    console.error(error)
    ElMessage.error('解析 Excel 失败')
  } finally {
    loading.value = false
  }
}

const handleRemoveFile = () => {
  fileList.value = []
  tableData.value = []
}

const removeRow = (index) => {
  tableData.value.splice(index, 1)
}

const submitImport = async () => {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可提交')
    return
  }

  const dataToExport = tableData.value.map((item) => ({
    '奖项等级': item.award_level,
    '获奖项目名称': item.project_name,
    '负责人': item.leader_name,
    '学号': item.leader_id,
  }))

  const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: templateHeaders })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '获奖录入')

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const file = new File([blob], `Award_Import_${compID}.xlsx`)
  const formData = new FormData()
  formData.append('file', file)

  try {
    loading.value = true
    const res = await post(`/api/award/import?comp_id=${compID}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res.code === 200) {
      ElMessage.success(res.msg || '导入成功')
      router.back()
    } else {
      ElMessage.error(res.msg || '导入失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('导入失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="import-page">
    <div class="card">
      <div class="card-title">模板与导入</div>
      <div class="card-actions">
        <el-button type="primary" :icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :file-list="fileList"
          accept=".xlsx"
          :on-change="handleFileChange"
        >
          <el-button type="success" :icon="UploadFilled">选择文件</el-button>
        </el-upload>
        <span v-if="fileList.length" class="file-name">已选择：{{ fileList[0].name }}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">导入数据预览</div>
      <el-alert type="info" :closable="false" style="margin-bottom: 12px">
        <template #default>
          <span style="font-size: 12px">提示：奖项等级需填写数字（1、2、3等），获奖项目名称是团队名称或个人赛项目名</span>
        </template>
      </el-alert>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        height="calc(100vh - 380px)"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="award_level" label="奖项等级" width="110">
          <template #default="{ row }">
            <el-input v-model="row.award_level" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="project_name" label="获奖项目名称" min-width="180">
          <template #default="{ row }">
            <el-input v-model="row.project_name" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="leader_name" label="负责人" width="110">
          <template #default="{ row }">
            <el-input v-model="row.leader_name" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="leader_id" label="学号" width="140">
          <template #default="{ row }">
            <el-input v-model="row.leader_id" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="removeRow($index)" />
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>

      <div class="footer">
        <el-button @click="handleRemoveFile">清空</el-button>
        <el-button type="primary" :icon="CircleCheck" @click="submitImport">提交导入</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.import-page {
  width: 100%;
  height: 100%;
  padding: 20px;
  background-color: var(--background-color);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.card {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  box-shadow: var(--card-shadow);

  .card-title {
    font-weight: 600;
    margin-bottom: 12px;
    color: #303133;
  }

  .card-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.file-name {
  font-size: 12px;
  color: #909399;
}

.footer {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>