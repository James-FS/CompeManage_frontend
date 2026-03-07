<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, UploadFilled, Delete, CircleCheck, View, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { post } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const compID = route.params.id

const loading = ref(false)
const fileList = ref([])
const tableData = ref([])

// 弹窗相关
const dialogVisible = ref(false)
const currentRow = ref(null)
// 弹窗内编辑用的临时成员列表
const editMembers = ref([])

const templateHeaders = [
  '奖项等级', '获奖项目名称', '负责人', '学号', '所属学院', '指导老师',
  '成员1', '学号1', '成员2', '学号2', '成员3', '学号3',
  '成员4', '学号4', '成员5', '学号5',
]

const downloadTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '获奖录入')
  XLSX.writeFile(workbook, `Award_Template_${compID}.xlsx`)
}

const handleFileChange = async (uploadFile, uploadFiles) => {
  fileList.value = uploadFiles
  if (!uploadFile?.raw) return
  try {
    loading.value = true
    const buffer = await uploadFile.raw.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (!rows || rows.length <= 1) {
      tableData.value = []
      ElMessage.warning('模板中暂无可导入数据')
      return
    }

    tableData.value = rows.slice(1)
      .filter((row) => row.length > 0)
      .map((row, index) => ({
        id: index + 1,
        award_level: row[0] || '',
        project_name: row[1] || '',
        leader_name: row[2] || '',
        leader_id: row[3] || '',
        college: row[4] || '',
        advisor: row[5] || '',
        member1: row[6] || '',  member1_id: row[7] || '',
        member2: row[8] || '',  member2_id: row[9] || '',
        member3: row[10] || '', member3_id: row[11] || '',
        member4: row[12] || '', member4_id: row[13] || '',
        member5: row[14] || '', member5_id: row[15] || '',
      }))
  } catch (error) {
    console.error(error)
    ElMessage.error('解析 Excel 失败，请检查文件格式')
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

// 打开详情弹窗，初始化临时编辑数据
const openDetail = (row) => {
  currentRow.value = row
  // 将 row 中的成员数据转为数组，方便弹窗内增删
  const members = []
  for (let i = 1; i <= 5; i++) {
    const name = row[`member${i}`]
    const id = row[`member${i}_id`]
    if (name || id) {
      members.push({ name: name || '', id: id || '' })
    }
  }
  editMembers.value = members
  dialogVisible.value = true
}

// 添加成员（最多5人）
const addMember = () => {
  if (editMembers.value.length >= 5) {
    ElMessage.warning('最多添加5名成员')
    return
  }
  editMembers.value.push({ name: '', id: '' })
}

// 删除某个成员
const removeMember = (index) => {
  editMembers.value.splice(index, 1)
}

// 弹窗确认：将编辑结果写回 row
const confirmEdit = () => {
  if (!currentRow.value) return

  // 清空原有成员字段
  for (let i = 1; i <= 5; i++) {
    currentRow.value[`member${i}`] = ''
    currentRow.value[`member${i}_id`] = ''
  }
  // 写回新的成员数据
  editMembers.value.forEach((m, idx) => {
    currentRow.value[`member${idx + 1}`] = m.name
    currentRow.value[`member${idx + 1}_id`] = m.id
  })

  ElMessage.success('修改已保存')
  dialogVisible.value = false
}

// 获取有效成员数量（用于主表摘要显示）
const getMemberCount = (row) => {
  let count = 0
  for (let i = 1; i <= 5; i++) {
    if (row[`member${i}`] || row[`member${i}_id`]) count++
  }
  return count
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
    '所属学院': item.college,
    '指导老师': item.advisor,
    '成员1': item.member1, '学号1': item.member1_id,
    '成员2': item.member2, '学号2': item.member2_id,
    '成员3': item.member3, '学号3': item.member3_id,
    '成员4': item.member4, '学号4': item.member4_id,
    '成员5': item.member5, '学号5': item.member5_id,
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
          <span style="font-size: 12px">提示：成员不包括负责人，最多可填5名成员；点击「成员」列可查看或编辑成员信息</span>
        </template>
      </el-alert>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        height="calc(100vh - 420px)"
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
        <el-table-column prop="college" label="所属学院" width="160">
          <template #default="{ row }">
            <el-input v-model="row.college" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="advisor" label="指导老师" width="120">
          <template #default="{ row }">
            <el-input v-model="row.advisor" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="成员" width="110" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openDetail(row)">
              {{ getMemberCount(row) > 0 ? `${getMemberCount(row)} 人` : '添加' }}
            </el-button>
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

    <!-- 成员详情/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="成员信息"
      width="480px"
      align-center
      :close-on-click-modal="false"
    >
      <template v-if="currentRow">



        <!-- 成员列表（可编辑/增删） -->
        <div class="section-title">
          成员列表
          <el-button
            v-if="editMembers.length < 5"
            type="primary"
            link
            :icon="Plus"
            @click="addMember"
          >添加成员</el-button>
        </div>

        <div v-if="editMembers.length === 0" class="no-member">
          暂无成员，点击「添加成员」新增
        </div>

        <div v-else class="member-list">
          <div
            v-for="(m, idx) in editMembers"
            :key="idx"
            class="member-row"
          >
            <span class="member-index">{{ idx + 1 }}</span>
            <el-input v-model="m.name" size="small" placeholder="姓名" style="width: 130px" />
            <el-input v-model="m.id" size="small" placeholder="学号" style="width: 150px" />
            <el-button link type="danger" :icon="Delete" @click="removeMember(idx)" />
          </div>
        </div>
      </template>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit">确认保存</el-button>
      </template>
    </el-dialog>
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

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-member {
  font-size: 12px;
  color: #909399;
  padding: 12px 0;
  text-align: center;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .member-index {
    font-size: 12px;
    color: #909399;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }
}
</style>