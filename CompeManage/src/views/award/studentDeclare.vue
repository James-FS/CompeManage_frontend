<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft, Trophy, UploadFilled, InfoFilled, Plus, Delete, User, Postcard, Iphone, Message 
} from '@element-plus/icons-vue'
import api from '@/api'
import { debounce } from '@/utils/debounce'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const isSubmitting = ref(false)

// 搜索相关
const searchLoading = ref(false)
const compOptions = ref([]) // 搜索结果列表

// ==================== 学生选择相关变量 ====================
const studentDialogVisible = ref(false)
const studentLoading = ref(false)
const studentList = ref([])
const currentMemberEditIndex = ref(-1) // -1表示新增，>=0表示编辑第几个成员
const isSelectingLeader = ref(false) // true: 选队长，false: 选队员
const searchForm = reactive({
  name: '',
  username: '',
  college: '',
})
const studentCurrentPage = ref(1)
const studentPageSize = ref(10)
const studentTotal = ref(0)

// 表单数据模型
const form = reactive({
  compID: null,
  compName: '',
  awardLevel: '',
  awardSpecific: '',
  teamName: '',
  certImage: '',
  awardDate: '',
  
  // ✅ 添加队长和成员信息
  leader: {
    name: '',
    stuID: '',
    phone: '',
    email: '',
    college: '',
  },
  members: [], // 团队成员列表（不包括队长）
})

const token = localStorage.getItem('token')
const uploadHeaders = { Authorization: `Bearer ${token}` }

// 校验规则
const rules = {
  compID: [{ required: true, message: '必须锁定一个具体的赛事', trigger: 'change' }],
  awardLevel: [{ required: true, message: '请选择标准归档等级', trigger: 'change' }],
  awardSpecific: [{ required: true, message: '请填写证书上的具体奖项名称', trigger: 'blur' }],
  certImage: [{ required: true, message: '请上传获奖证书证明', trigger: 'change' }],
  awardDate: [{ required: true, message: '请选择获奖日期', trigger: 'change' }],
}

// ==================== 赛事搜索相关方法 ====================

const onSearchComp = async (query) => {
  if (query) {
    searchLoading.value = true
    try {
      const res = await api.searchCompList({ keyword: query, page_size: 20 })
      if (res.code === 200) {
        compOptions.value = res.data.map(item => ({
          value: item.id,
          label: item.comp_name,
          year: item.year,
        }))
      }
    } catch (error) {
      console.error(error)
    } finally {
      searchLoading.value = false
    }
  } else {
    compOptions.value = []
  }
}

const handleCompChange = (val) => {
  const selected = compOptions.value.find(item => item.value === val)
  if (selected) {
    form.compName = selected.label
  }
}

// ==================== 学生选择相关方法 ====================

// 打开学生选择弹窗
const openStudentSelect = (target = 'leader') => {
  if (target === 'leader') {
    isSelectingLeader.value = true
    currentMemberEditIndex.value = -1
  } else {
    isSelectingLeader.value = false
    currentMemberEditIndex.value = target // -1 表示新增成员，>=0 表示编辑成员
  }
  studentDialogVisible.value = true
  fetchStudentList()
}

const debouncedSearch = debounce(() => {
  studentCurrentPage.value = 1
  fetchStudentList()
}, 500)

// 分页处理
const handleStudentSizeChange = (val) => {
  studentPageSize.value = val
  studentCurrentPage.value = 1
  fetchStudentList()
}

const handleStudentCurrentChange = (val) => {
  studentCurrentPage.value = val
  fetchStudentList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.name = ''
  searchForm.username = ''
  searchForm.college = ''
  studentCurrentPage.value = 1
  fetchStudentList()
}

const handleDialogClose = () => {
  isSelectingLeader.value = false
  currentMemberEditIndex.value = -1
}

// 确认选择学生
const selectStudent = (row) => {
  if (isSelectingLeader.value) {
    // 选择队长
    form.leader.name = row.name
    form.leader.stuID = row.username
    form.leader.college = row.college
    form.leader.phone = ''
    form.leader.email = ''
    ElMessage.success(`已选择队长：${row.name}，请补充手机号和邮箱`)
  } else if (currentMemberEditIndex.value === -1) {
    // 新增成员模式
    form.members.push({
      name: row.name,
      stuID: row.username,
      phone: '',
      email: '',
      college: row.college,
    })
    ElMessage.success(`已添加成员：${row.name}，请补充手机号和邮箱`)
  } else {
    // 编辑已有成员模式
    const member = form.members[currentMemberEditIndex.value]
    member.name = row.name
    member.stuID = row.username
    member.college = row.college
    ElMessage.success(`成员已更新：${row.name}`)
  }

  studentDialogVisible.value = false
  isSelectingLeader.value = false
}

// 获取学生列表
async function fetchStudentList() {
  studentLoading.value = true
  try {
    const response = await api.getStudentList({
      page: studentCurrentPage.value,
      page_size: studentPageSize.value,
      role: 'student',
      search: searchForm.name || searchForm.username || '',
    })
    if (response.code === 200) {
      studentList.value = response.data.list
      studentTotal.value = response.data.total
    }
  } catch (error) {
    ElMessage.error('获取学生列表失败，请稍后重试')
  } finally {
    studentLoading.value = false
  }
}

// 添加成员
function addMember() {
  openStudentSelect(-1)
}

// 删除成员
function removeMember(index) {
  form.members.splice(index, 1)
  ElMessage.success('成员已删除')
}

// ==================== 上传和提交相关方法 ====================

const handleUploadSuccess = (response) => {
  if (response.code === 200) {
    form.certImage = response.data.url
    ElMessage.success('证书上传成功')
  } else {
    ElMessage.error('上传失败，请重试')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      //  检查队长是否已选择
      if (!form.leader.name) {
        ElMessage.error('请先选择队长')
        return
      }

      //  检查队长手机号和邮箱
      if (!form.leader.phone) {
        ElMessage.error('请填写队长手机号')
        return
      }
      if (!form.leader.email) {
        ElMessage.error('请填写队长邮箱')
        return
      }

      //  如果有团队成员，检查成员信息完整性
      for (let i = 0; i < form.members.length; i++) {
        const member = form.members[i]
        if (!member.phone) {
          ElMessage.error(`成员${i + 1}的手机号不能为空`)
          return
        }
        if (!member.email) {
          ElMessage.error(`成员${i + 1}的邮箱不能为空`)
          return
        }
      }

      isSubmitting.value = true
      try {
        //  构造符合后端期望的数据结构
        const payload = {
          comp_id: form.compID,
          award_level: form.awardLevel,
          award_name: form.awardSpecific,
          team_name: form.teamName || '个人参赛',
          proof_url: form.certImage,
          members: [
            {
              name: form.leader.name,
              student_id: form.leader.stuID,
              phone: form.leader.phone,
              email: form.leader.email,
              college: form.leader.college,
              is_leader: true,
            },
            // 添加其他团队成员
            ...form.members.map(m => ({
              name: m.name,
              student_id: m.stuID,
              phone: m.phone,
              email: m.email,
              college: m.college,
              is_leader: false,
            }))
          ]
        }

        const res = await api.submitAward(payload)

        if (res.code === 200) {
          ElMessage.success({
            message: '补录申报成功！',
            duration: 2000
          })
          setTimeout(() => {
            router.back()
          }, 2000)
        } else {
          ElMessage.error(res.msg || '补录申报失败')
        }
      } catch (error) {
        console.error(error)
      } finally {
        isSubmitting.value = false
      }
    }
  })
}

const goBack = () => router.back()

onMounted(() => {
  const compId = route.query.comp_id
  const compName = route.query.comp_name
  if (compId && compName) {
    form.compID = Number(compId)
    form.compName = compName
    compOptions.value = [{
      value: Number(compId),
      label: compName,
      year: '',
    }]
  }

  const saved = sessionStorage.getItem('resubmitAward')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.comp_id === form.compID) {
        form.awardLevel = data.award_level || ''
        form.awardSpecific = data.award_name || ''
        form.teamName = data.team_name || ''
        form.certImage = data.proof_url || ''

        const members = data.members || []
        const leader = members.find(m => m.is_leader)
        if (leader) {
          form.leader = {
            name: leader.name || '',
            stuID: leader.stu_id || '',
            phone: leader.phone || '',
            email: leader.email || '',
            college: leader.college || '',
          }
        }
        form.members = members
          .filter(m => !m.is_leader)
          .map(m => ({
            name: m.name || '',
            stuID: m.stu_id || '',
            phone: m.phone || '',
            email: m.email || '',
            college: m.college || '',
          }))
      }
    } catch (e) {
      console.error('回显申报数据失败', e)
    }
    sessionStorage.removeItem('resubmitAward')
  }
})
</script>

<template>
  <div class="paper-container">
    <div class="paper-sheet">
      
      <div class="paper-header">
        <div class="header-content">
          <div class="back-area" @click="goBack">
            <el-icon><ArrowLeft /></el-icon> 返回
          </div>
          <div class="header-divider"></div>
          <div class="header-text">
            <h1 class="main-title">校外获奖申报登记</h1>
            <p class="sub-title">EXTERNAL AWARD REGISTRATION</p>
          </div>
        </div>
        <div class="header-icon">
          <el-icon><Trophy /></el-icon>
        </div>
      </div>

      <div class="paper-body">
        
        <div class="info-alert">
          <div class="alert-icon"><el-icon><InfoFilled /></el-icon></div>
          <div class="alert-content">
            <div class="alert-title">申报须知</div>
            <div class="alert-desc">
              请务必确认赛事年份，避免选错届次（如选成去年的比赛）。
            </div>
          </div>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="declare-form">
          
          <!-- 赛事锁定 -->
          <div class="form-section">
            <div class="section-title">01 赛事锁定</div>
            
            <el-form-item label="搜索并选择赛事 (包含年份)" prop="compID">
              <el-select
                v-model="form.compID"
                filterable
                remote
                reserve-keyword
                placeholder="请输入关键词搜索（如：蓝桥杯、数学建模）"
                :remote-method="onSearchComp"
                :loading="searchLoading"
                @change="handleCompChange"
                class="search-select"
                popper-class="comp-select-popper"
              >
                <el-option
                  v-for="item in compOptions"
                  :key="item.value"
                  :label="`[${item.year}] ${item.label}`" 
                  :value="item.value"
                >
                  <div class="option-item">
                    <span class="comp-name">
                      <el-tag size="small" effect="dark" type="danger" style="margin-right:6px">
                        {{ item.year }}
                      </el-tag>
                      {{ item.label }}
                    </span>
                  </div>
                </el-option>
              </el-select>
              <div class="help-text">
                <el-icon><InfoFilled /></el-icon> 
                如果没有找到对应年份的赛事，请联系学院管理员在后台"竞赛目录"中添加。
              </div>
            </el-form-item>
          </div>

          <!-- 队长信息 -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">队长信息</h3>
              <el-button
                v-if="!form.leader.name"
                link
                type="primary"
                @click="openStudentSelect('leader')"
                :icon="Plus"
              >
                选择队长
              </el-button>
              <el-button
                v-if="form.leader.name"
                link
                type="primary"
                @click="openStudentSelect('leader')"
              >
                重新选择
              </el-button>
            </div>

            <div class="info-grid">
              <el-empty
                v-if="!form.leader.name"
                description="请先选择队长"
                :image-size="80"
              />

              <el-row v-else :gutter="20">
                <el-col :span="8" :xs="24">
                  <el-form-item label="姓名">
                    <el-input v-model="form.leader.name" :prefix-icon="User" :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="学号">
                    <el-input v-model="form.leader.stuID" :prefix-icon="Postcard" :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="学院">
                    <el-input v-model="form.leader.college" :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="12" :xs="24">
                  <el-form-item label="手机号" prop="leader.phone">
                    <el-input
                      v-model="form.leader.phone"
                      placeholder="请输入手机号"
                      :prefix-icon="Iphone"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12" :xs="24">
                  <el-form-item label="邮箱" prop="leader.email">
                    <el-input
                      v-model="form.leader.email"
                      placeholder="请输入邮箱"
                      :prefix-icon="Message"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- 团队成员 -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">团队成员</h3>
              <el-button link type="primary" @click="addMember" :icon="Plus">
                添加成员
              </el-button>
            </div>

            <div class="member-grid-container">
              <div v-if="form.members.length === 0" class="empty-tip">
                <el-empty description="暂无成员（可选）" :image-size="60" />
              </div>

              <div v-for="(m, i) in form.members" :key="i" class="member-card">
                <div class="card-header">
                  <span class="member-index">成员 {{ i + 1 }}</span>
                  <div>
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="openStudentSelect(i)"
                    >
                      重新选择
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      :icon="Delete"
                      @click="removeMember(i)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>

                <div class="card-body">
                  <el-row :gutter="20">
                    <el-col :span="8" :xs="24">
                      <el-form-item label="姓名">
                        <el-input v-model="m.name" :prefix-icon="User" :disabled="true" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8" :xs="24">
                      <el-form-item label="学号">
                        <el-input v-model="m.stuID" :prefix-icon="Postcard" :disabled="true" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8" :xs="24">
                      <el-form-item label="学院">
                        <el-input v-model="m.college" :disabled="true" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12" :xs="24">
                      <el-form-item label="手机号">
                        <el-input
                          v-model="m.phone"
                          placeholder="请输入手机号"
                          :prefix-icon="Iphone"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12" :xs="24">
                      <el-form-item label="邮箱">
                        <el-input
                          v-model="m.email"
                          placeholder="请输入邮箱"
                          :prefix-icon="Message"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </div>
          </div>

          <!-- 获奖详情 -->
          <div class="form-section">
            <div class="section-title">02 获奖详情</div>
            
            <div class="form-row-2">
              <el-form-item label="标准归档等级 (用于统计)" prop="awardLevel">
                <el-select v-model="form.awardLevel" placeholder="请对照学校标准选择" style="width: 100%">
                  <el-option label="国家级一等奖" value="国家级一等奖" />
                  <el-option label="国家级二等奖" value="国家级二等奖" />
                  <el-option label="国家级三等奖" value="国家级三等奖" />
                  <el-option label="省级一等奖" value="省级一等奖" />
                  <el-option label="省级二等奖" value="省级二等奖" />
                  <el-option label="省级三等奖" value="省级三等奖" />
                  <el-option label="校级一等奖" value="校级一等奖" />
                  <el-option label="校级二等奖" value="校级二等奖" />
                </el-select>
              </el-form-item>

              <el-form-item label="证书具体奖项名称" prop="awardSpecific">
                <el-input v-model="form.awardSpecific" placeholder="如：金奖、特等奖、最佳创意奖" />
              </el-form-item>
            </div>

            <div class="form-row-2">
              <el-form-item label="获奖日期" prop="awardDate">
                <el-date-picker 
                  v-model="form.awardDate" 
                  type="date" 
                  placeholder="选择日期" 
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="团队/项目名称">
                <el-input v-model="form.teamName" placeholder="个人参赛可不填" />
              </el-form-item>
            </div>
          </div>

          <!-- 证明件上传 -->
          <div class="form-section">
            <div class="section-title">03 证明件上传</div>
            
            <el-form-item prop="certImage">
              <el-upload
                class="cert-uploader"
                action="/api/upload"
                :headers="uploadHeaders"
                :data="{type:'award_cert'}" 
                :show-file-list="false"
                :on-success="handleUploadSuccess"
                accept=".jpg,.png,.jpeg,.pdf"
              >
                <img v-if="form.certImage" :src="form.certImage" class="cert-img" />
                <div v-else class="upload-area">
                  <el-icon class="upload-icon"><UploadFilled /></el-icon>
                  <div class="upload-text">点击上传证明材料</div>
                </div>
              </el-upload>
            </el-form-item>
          </div>

          <!-- 提交按钮 -->
          <div class="form-footer">
            <el-button @click="goBack" class="btn-cancel">取消申报</el-button>
            <el-button type="primary" :loading="isSubmitting" @click="handleSubmit" class="btn-submit">
              确认提交
            </el-button>
          </div>

        </el-form>
      </div>
    </div>
  </div>

  <!--  学生选择弹窗 -->
  <el-dialog
    v-model="studentDialogVisible"
    :title="isSelectingLeader ? '选择队长' : '选择队员'"
    width="800px"
    align-center
    append-to-body
    @close="handleDialogClose"
  >
    <div class="search-bar">
      <el-form :inline="true" :model="searchForm" class="search-form-inline">
        <el-form-item label="姓名">
          <el-input
            v-model="searchForm.name"
            placeholder="输入姓名"
            clearable
            @input="debouncedSearch"
            @clear="fetchStudentList"
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item label="学号">
          <el-input
            v-model="searchForm.username"
            placeholder="输入学号"
            clearable
            @input="debouncedSearch"
            @clear="fetchStudentList"
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item label="学院">
          <el-select
            v-model="searchForm.college"
            placeholder="选择学院"
            clearable
            @change="fetchStudentList"
            @clear="fetchStudentList"
            style="width: 180px"
          >
            <el-option label="计算机科学与网络工程学院" value="计算机科学与网络工程学院" />
            <el-option label="电子信息工程学院" value="电子信息工程学院" />
            <el-option label="经济管理学院" value="经济管理学院" />
            <el-option label="数学学院" value="数学学院" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table
      :data="studentList"
      border
      stripe
      v-loading="studentLoading"
      height="350"
      style="width: 100%"
    >
      <el-table-column prop="username" label="学号" width="120" align="center" />
      <el-table-column prop="name" label="姓名" width="120" align="center" />
      <el-table-column prop="college" label="所属学院" min-width="200" align="center" />
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="selectStudent(row)">选择</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无数据" />
      </template>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="studentCurrentPage"
        v-model:page-size="studentPageSize"
        :page-sizes="[10, 20, 30]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="studentTotal"
        @size-change="handleStudentSizeChange"
        @current-change="handleStudentCurrentChange"
      />
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
/* ... 保留原有样式 ... */

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.info-grid {
  background: #fcfcfc;
  border: 1px solid #ebeef5;
  padding: 24px;
  border-radius: 6px;
}

.member-grid-container {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .empty-tip {
    border: 1px dashed #dcdfe6;
    border-radius: 8px;
    padding: 20px 0;
  }

  .member-card {
    background-color: #fcfcfc;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: #dcdfe6;
      background-color: #fff;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      border-bottom: 1px solid #ebeef5;
      background-color: #fafafa;
      border-radius: 8px 8px 0 0;

      .member-index {
        font-weight: 600;
        font-size: 14px;
        color: #606266;

        &::before {
          content: '';
          display: inline-block;
          width: 3px;
          height: 12px;
          background-color: var(--primary-color, #2c5f8a);
          margin-right: 8px;
          border-radius: 2px;
        }
      }

      div {
        display: flex;
        gap: 8px;
      }
    }

    .card-body {
      padding: 20px;
      padding-bottom: 0;
    }
  }
}

.search-bar {
  margin-bottom: 15px;

  :deep(.el-form--inline .el-form-item) {
    margin-right: 15px;
  }
}

.pagination-wrapper {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  padding: 15px 0;
  border-top: 1px solid #eee;
}

/* 页面背景等原有样式保留 */
.paper-container {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding: 30px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.paper-sheet {
  width: 100%;
  max-width: 760px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 40px;
}

.paper-header {
  background: linear-gradient(135deg, #2c5f8a 0%, #1a3a56 100%);
  color: #fff;
  padding: 35px 45px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;

  .header-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 16px;
    
    .back-area {
      cursor: pointer;
      opacity: 0.8;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: opacity 0.2s;
      &:hover { opacity: 1; }
    }
    
    .header-divider {
      width: 1px;
      height: 24px;
      background: rgba(255,255,255,0.3);
    }

    .main-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .sub-title {
      margin: 4px 0 0 0;
      font-size: 11px;
      opacity: 0.7;
      letter-spacing: 2px;
      font-weight: 500;
    }
  }

  .header-icon {
    font-size: 60px;
    opacity: 0.15;
    transform: rotate(15deg) translateY(5px);
    position: absolute;
    right: 30px;
  }
}

.paper-body {
  padding: 40px 50px;
}

.info-alert {
  background: #fff8e6;
  border: 1px solid #ffeedb;
  color: #b8741a;
  padding: 16px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  margin-bottom: 35px;

  .alert-icon {
    font-size: 20px;
    margin-top: 2px;
  }
  .alert-content {
    .alert-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 4px;
      color: #92580e;
    }
    .alert-desc {
      font-size: 13px;
      line-height: 1.6;
    }
  }
}

.form-section {
  margin-bottom: 40px;
  
  .section-title {
    font-size: 15px;
    font-weight: 800;
    color: #303133;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #ebeef5;
      margin-left: 15px;
    }
  }
}

.search-select {
  width: 100%;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 10px;
}

.cert-uploader {
  width: 100%;
  :deep(.el-upload) {
    width: 100%;
    cursor: pointer;
    border-radius: 6px;
    overflow: hidden;
  }
}

.upload-area {
  width: 100%;
  height: 220px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #fafafa;
  transition: all 0.3s;

  &:hover {
    border-color: #2c5f8a;
    background-color: #f5f9fc;
    .upload-icon { color: #2c5f8a; }
  }

  .upload-icon {
    font-size: 48px;
    color: #c0c4cc;
    margin-bottom: 12px;
    transition: color 0.3s;
  }
  
  .upload-text {
    font-size: 15px;
    font-weight: 600;
    color: #606266;
  }
}

.cert-img {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.form-footer {
  margin-top: 50px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #f2f2f2;

  .btn-submit {
    background-color: #2c5f8a;
    border-color: #2c5f8a;
    padding: 12px 36px;
    font-size: 15px;
    letter-spacing: 1px;

    &:hover {
      background-color: #3a7ab5;
      border-color: #3a7ab5;
    }
  }
  
  .btn-cancel {
    padding: 12px 24px;
  }
}
</style>

<style>
.comp-select-popper .option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 5px 0;
}

.comp-select-popper .comp-name {
  font-weight: 600; 
  color: #303133;
  display: flex;
  align-items: center;
}
</style>