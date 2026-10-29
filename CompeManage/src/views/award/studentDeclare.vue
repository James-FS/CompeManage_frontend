<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Trophy, UploadFilled, InfoFilled, Plus, Delete, User, Postcard, Iphone, Message, Document
} from '@element-plus/icons-vue'
import api from '@/api'
import { debounce } from '@/utils/debounce'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const isSubmitting = ref(false)
const resubmitVersion = ref(null)

// 搜索相关
const searchLoading = ref(false)
const compOptions = ref([])
const compDialogVisible = ref(false)
const compKeyword = ref('')
const compYear = ref('')
const compPage = ref(1)
const compTotal = ref(0)
const currentStudent = ref(null)
const categoryNote = '获奖类别：指国家级、省部级，国际级竞赛等同于国家级。'
const levelNote = '获奖等级：指一等奖、二等奖、三等奖，冠军（金奖）、特等奖等同于一等奖，亚军（银奖）等同于二等奖，季军（铜奖）等同于三等奖。如冠亚季军、金银铜奖从一等奖获得者中决出，则按一等奖计算。'

// 判断是否为 PDF 文件
const isPdfFile = computed(() => {
  return form.certImage && form.certImage.toLowerCase().endsWith('.pdf')
})

// 从 URL 中提取文件名
function getFileName(url) {
  if (!url) return ''
  const parts = url.split('/')
  return parts[parts.length - 1] || '证明材料.pdf'
}

// ==================== 学生选择相关变量 ====================
const studentDialogVisible = ref(false)
const studentLoading = ref(false)
const studentList = ref([])
const currentMemberEditIndex = ref(-1) // -1表示新增，>=0表示编辑第几个成员
const isSelectingAdvisor = ref(false)
const currentAdvisorEditIndex = ref(-1)
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
  participationType: 'individual',
  awardCategory: '',
  remark: '',
  advisors: [],
  awardLevel: '',
  awardLevelOther: '',
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
  teamName: [{ required: true, whitespace: true, message: '请填写参赛项目名称', trigger: 'blur' }],
  awardCategory: [{ required: true, message: '请选择获奖类别', trigger: 'change' }],
  awardLevel: [{ required: true, message: '请选择获奖等级', trigger: 'change' }],
  certImage: [{ required: true, message: '请上传获奖证书证明', trigger: 'change' }],
  awardDate: [{ required: true, message: '请选择获奖日期', trigger: 'change' }],
}

// ==================== 赛事搜索相关方法 ====================

const fetchCompList = async () => {
  searchLoading.value = true
  try {
    const res = await api.searchCompList({ keyword: compKeyword.value.trim(), year: compYear.value || undefined, page: compPage.value, page_size: 10, paginated: true })
    if (res.code === 200) {
      compOptions.value = res.data.list
      compTotal.value = res.data.total
    }
  } finally { searchLoading.value = false }
}
const searchCompetitions = () => { compPage.value = 1; fetchCompList() }
const openCompSelect = () => { compDialogVisible.value = true; fetchCompList() }
const selectCompetition = (row) => {
  form.compID = row.id
  form.compName = `[${row.year}] ${row.comp_name}`
  compDialogVisible.value = false
  formRef.value?.clearValidate('compID')
}
const applyCurrentStudent = () => {
  const u = currentStudent.value
  if (u && form.participationType === 'individual') form.leader = { name: u.name, stuID: u.username, college: u.college || '', phone: '', email: '' }
}
watch(() => form.participationType, (type) => {
  form.members = []
  if (type === 'individual') applyCurrentStudent()
  else form.leader = { name: '', stuID: '', phone: '', email: '', college: '' }
}, { flush: 'sync' })

// ==================== 学生选择相关方法 ====================

// 打开学生选择弹窗
const openAdvisorSelect = (index = -1) => {
  isSelectingAdvisor.value = true
  isSelectingLeader.value = false
  currentAdvisorEditIndex.value = index
  searchForm.name = ''
  searchForm.username = ''
  searchForm.college = ''
  studentCurrentPage.value = 1
  studentDialogVisible.value = true
  fetchStudentList()
}
const openStudentSelect = (target = 'leader') => {
  isSelectingAdvisor.value = false
  searchForm.name = ''
  searchForm.username = ''
  searchForm.college = ''
  studentCurrentPage.value = 1
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
  isSelectingAdvisor.value = false
  currentAdvisorEditIndex.value = -1
  isSelectingLeader.value = false
  currentMemberEditIndex.value = -1
}

// 确认选择学生
const selectStudent = (row) => {
  if (isSelectingAdvisor.value) {
    if (form.advisors.some((a, index) => index !== currentAdvisorEditIndex.value && (a.id === row.id || a.username === row.username))) {
      ElMessage.warning('该指导老师已添加，请勿重复选择')
      return
    }
    const advisor = { id: row.id, username: row.username, name: row.name, college: row.college || '' }
    if (currentAdvisorEditIndex.value === -1) form.advisors.push(advisor)
    else form.advisors[currentAdvisorEditIndex.value] = advisor
    studentDialogVisible.value = false
    ElMessage.success(`已选择指导老师：${row.name}`)
    return
  }
  const others = form.members.filter((_, index) => index !== currentMemberEditIndex.value)
  if ((!isSelectingLeader.value && row.username === form.leader.stuID) || others.some(m => m.stuID === row.username)) {
    ElMessage.warning('该学生已在团队中，请勿重复选择')
    return
  }
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
    if (member.stuID !== row.username) { member.phone = ''; member.email = '' }
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
      role: isSelectingAdvisor.value ? 'teacher' : 'student',
      search: searchForm.name || searchForm.username || '', // 工号/姓名任一命中即返回（后端 realname/username LIKE 双字段）
    })
    if (response.code === 200) {
      studentList.value = response.data.list.filter(row => !searchForm.college || row.college === searchForm.college)
      studentTotal.value = response.data.total
    }
  } catch (error) {
    ElMessage.error(isSelectingAdvisor.value ? '获取指导老师列表失败，请稍后重试' : '获取学生列表失败，请稍后重试')
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
      if (form.participationType === 'team' && form.members.length === 0) return ElMessage.error('团队赛请至少添加一名团队成员')
      if (!form.advisors.length || form.advisors.some(a => !a.name.trim())) return ElMessage.error('请选择指导老师')
      const participantLabel = form.participationType === 'individual' ? '本人' : '队长'
      // 检查参赛人信息
      if (!form.leader.name) {
        ElMessage.error(`请先填写${participantLabel}信息`)
        return
      }

      //  检查队长手机号和邮箱
      if (!form.leader.phone) {
        ElMessage.error(`请填写${participantLabel}手机号`)
        return
      }
      if (!form.leader.email) {
        ElMessage.error(`请填写${participantLabel}邮箱`)
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
          participation_type: form.participationType,
          award_category: form.awardCategory,
          award_level: form.awardCategory + (form.awardLevel === '其他' ? (form.awardLevelOther.trim() || '其他') : form.awardLevel),
          award_name: form.awardLevel === '其他' ? (form.awardLevelOther.trim() || '其他') : form.awardLevel,
          advisors: form.advisors.map(a => ({ id: a.id, username: a.username, name: a.name.trim(), college: (a.college || '').trim() })),
          remark: form.remark.trim(),
          award_date: form.awardDate,
          team_name: form.teamName.trim(),
          proof_url: form.certImage,
          update_time: resubmitVersion.value || undefined,
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
            ...(form.participationType === 'team' ? form.members : []).map(m => ({
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

onMounted(async () => {
  const user = JSON.parse(localStorage.getItem('userInfo') || '{}')
  if (user.username) {
    try {
      const res = await api.getStudentList({ page: 1, page_size: 10, role: 'student', search: user.username })
      currentStudent.value = res.data?.list?.find(u => u.username === user.username)
      applyCurrentStudent()
    } catch { ElMessage.error('加载本人信息失败，请刷新后重试') }
  }
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
        resubmitVersion.value = data.update_time || null
        form.participationType = data.participation_type || ((data.members || []).length > 1 ? 'team' : 'individual')
        form.awardCategory = data.award_category || (data.award_level || '').match(/国家级|省级|校级|国际级/)?.[0] || ''
        const lvMatch = (data.award_level || '').match(/一等奖|二等奖|三等奖/)
        if (lvMatch) form.awardLevel = lvMatch[0]
        else if (data.award_level) { form.awardLevel = '其他'; form.awardLevelOther = data.award_name || data.award_level }
        form.awardDate = data.award_time?.slice(0, 10) || ''
        form.remark = data.remark || ''
        const advisors = typeof data.advisor_info === 'string' ? JSON.parse(data.advisor_info || '[]') : data.advisor_info
        form.advisors = Array.isArray(advisors) ? advisors : []
        form.teamName = data.team_name || ''
        form.certImage = data.proof_url || ''

        const members = data.members || []
        const leader = members.find(m => m.is_leader)
        if (leader) {
          form.leader = {
            name: leader.name || '',
            stuID: leader.student_id || leader.stu_id || '',
            phone: leader.phone || '',
            email: leader.email || '',
            college: leader.college || '',
          }
        }
        form.members = members
          .filter(m => !m.is_leader)
          .map(m => ({
            name: m.name || '',
            stuID: m.student_id || m.stu_id || '',
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
              <el-input v-model="form.compName" readonly placeholder="请选择对应年份的赛事" @click="openCompSelect">
                <template #append><el-button @click="openCompSelect">选择赛事</el-button></template>
              </el-input>
              <div class="help-text">
                <el-icon><InfoFilled /></el-icon> 
                如果没有找到对应年份的赛事，请联系学院管理员在后台"竞赛目录"中添加。
              </div>
            </el-form-item>
          </div>

          <div class="form-section">
            <div class="section-title">02 参赛信息</div>
            <el-form-item label="参赛项目名称" prop="teamName">
              <el-input v-model="form.teamName" maxlength="255" placeholder="请输入参赛项目名称，同一赛事通过项目名称区分团队" />
            </el-form-item>
            <el-form-item label="参赛类型">
              <el-radio-group v-model="form.participationType">
                <el-radio-button value="individual">个人赛</el-radio-button>
                <el-radio-button value="team">团队赛</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>

          <!-- 队长信息 -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">{{ form.participationType === 'individual' ? '本人信息' : '队长信息' }}</h3>
              <el-button
                v-if="form.participationType === 'team' && !form.leader.name"
                link
                type="primary"
                @click="openStudentSelect('leader')"
                :icon="Plus"
              >
                选择队长
              </el-button>
              <el-button
                v-if="form.participationType === 'team' && form.leader.name"
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
                :description="form.participationType === 'individual' ? '正在加载本人信息' : '请先选择队长'"
                :image-size="80"
              />

              <el-row v-else :gutter="20">
                <el-col :span="8" :xs="24">
                  <el-form-item label="姓名">
                    <el-input v-model="form.leader.name" :prefix-icon="User" :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item :label="isSelectingAdvisor ? '工号' : '学号'">
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
          <div v-if="form.participationType === 'team'" class="form-section">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">团队成员</h3>
              <el-button link type="primary" @click="addMember" :icon="Plus">
                添加成员
              </el-button>
            </div>

            <div class="member-grid-container">
              <div v-if="form.members.length === 0" class="empty-tip">
                <el-empty description="请添加团队成员（不含队长）" :image-size="60" />
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
                      <el-form-item :label="isSelectingAdvisor ? '工号' : '学号'">
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

          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">指导老师</h3>
              <el-button link type="primary" :icon="Plus" @click="openAdvisorSelect()">添加指导老师</el-button>
            </div>
            <el-empty v-if="!form.advisors.length" description="请先选择指导老师" :image-size="60" />
            <div v-for="(advisor, index) in form.advisors" :key="index" class="info-grid advisor-card">
              <div class="section-header">
                <span>指导老师 {{ index + 1 }}</span>
                <div>
                  <el-button link type="primary" @click="openAdvisorSelect(index)">重新选择</el-button>
                  <el-button link type="danger" :icon="Delete" @click="form.advisors.splice(index, 1)">删除</el-button>
                </div>
              </div>
              <el-row :gutter="20">
                <el-col :span="8" :xs="24"><el-form-item label="姓名"><el-input v-model="advisor.name" disabled /></el-form-item></el-col>
                <el-col :span="8" :xs="24"><el-form-item label="工号"><el-input v-model="advisor.username" disabled /></el-form-item></el-col>
                <el-col :span="8" :xs="24"><el-form-item label="所属部门"><el-input v-model="advisor.college" disabled /></el-form-item></el-col>
              </el-row>
            </div>
          </div>
          <div class="form-section">
            <div class="section-title">03 获奖详情</div>
            <div class="form-row-2">
              <el-form-item prop="awardCategory">
                <template #label>获奖类别 <el-tooltip :content="categoryNote" placement="top" :show-after="150"><el-icon tabindex="0" :aria-label="categoryNote"><InfoFilled /></el-icon></el-tooltip></template>
                <el-select v-model="form.awardCategory" placeholder="请选择获奖类别" style="width: 100%">
                  <el-option v-for="category in ['校级', '省级', '国家级', '国际级']" :key="category" :label="category" :value="category" />
                </el-select>
              </el-form-item>
              <el-form-item prop="awardLevel">
                <template #label>获奖等级 <el-tooltip :content="levelNote" placement="top" :show-after="150"><el-icon tabindex="0" :aria-label="levelNote"><InfoFilled /></el-icon></el-tooltip></template>
                <el-select v-model="form.awardLevel" placeholder="请选择获奖等级" style="width: 100%">
                  <el-option v-for="level in ['一等奖', '二等奖', '三等奖', '其他']" :key="level" :label="level" :value="level" />
                <el-input v-if="form.awardLevel === '其他'" v-model="form.awardLevelOther" placeholder="请填写具体获奖等级（如：优胜奖）" style="margin-top: 8px" />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item label="获奖时间" prop="awardDate"><el-date-picker v-model="form.awardDate" type="date" placeholder="选择获奖日期" format="YYYY年M月D日" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="填写需要补充说明的信息（选填）" /></el-form-item>
          </div>

          <!-- 证明件上传 -->
          <div class="form-section">
            <div class="section-title">04 证明件上传</div>
            
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
                <img v-if="form.certImage && !isPdfFile" :src="form.certImage" class="cert-img" />
                <div v-else-if="form.certImage && isPdfFile" class="pdf-info">
                  <el-icon class="pdf-icon"><Document /></el-icon>
                  <span class="pdf-name">{{ getFileName(form.certImage) }}</span>
                </div>
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

  <el-dialog v-model="compDialogVisible" title="选择赛事" width="min(960px, 94vw)" align-center append-to-body>
    <el-form :inline="true" @submit.prevent="searchCompetitions">
      <el-form-item label="赛事名称"><el-input v-model="compKeyword" clearable placeholder="输入赛事名称或编号" @keyup.enter="searchCompetitions" @clear="searchCompetitions" /></el-form-item>
      <el-form-item label="举办年份"><el-date-picker v-model="compYear" type="year" value-format="YYYY" placeholder="全部年份" clearable @change="searchCompetitions" /></el-form-item>
      <el-form-item><el-button type="primary" @click="searchCompetitions">搜索</el-button><el-button @click="compKeyword = ''; compYear = ''; searchCompetitions()">重置</el-button></el-form-item>
    </el-form>
    <el-table :data="compOptions" v-loading="searchLoading" border stripe height="360">
      <el-table-column prop="comp_name" label="赛事名称" min-width="260" />
      <el-table-column prop="comp_code" label="赛事编号" width="150" />
      <el-table-column prop="year" label="举办年份" width="100" align="center" />
      <el-table-column prop="comp_level" label="赛事级别" width="100" align="center" />
      <el-table-column label="操作" width="90" align="center"><template #default="{ row }"><el-button link type="primary" @click="selectCompetition(row)">选择</el-button></template></el-table-column>
    </el-table>
    <div class="pagination-wrapper"><el-pagination v-model:current-page="compPage" :page-size="10" :total="compTotal" layout="total, prev, pager, next" @current-change="fetchCompList" /></div>
  </el-dialog>
  <!-- 学生选择弹窗 -->
  <el-dialog
    v-model="studentDialogVisible"
    :title="isSelectingAdvisor ? '选择指导老师' : isSelectingLeader ? '选择队长' : '选择队员'"
    width="min(800px, 94vw)"
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
        <el-form-item :label="isSelectingAdvisor ? '工号' : '学号'">
          <el-input
            v-model="searchForm.username"
            :placeholder="isSelectingAdvisor ? '输入工号' : '输入学号'"
            clearable
            @input="debouncedSearch"
            @clear="fetchStudentList"
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item v-if="!isSelectingAdvisor" label="学院">
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
      <el-table-column prop="username" :label="isSelectingAdvisor ? '工号' : '学号'" width="120" align="center" />
      <el-table-column prop="name" label="姓名" width="120" align="center" />
      <el-table-column prop="college" :label="isSelectingAdvisor ? '所属部门' : '所属学院'" min-width="200" align="center" />
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

.advisor-card { margin-bottom: 20px; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.info-grid {
  background: #fcfcfc;
  border: 1px solid #ebeef5;
  padding: var(--item-padding);
  border-radius: var(--card-radius);
}

.member-grid-container {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .empty-tip {
    border: 1px dashed #dcdfe6;
    border-radius: var(--card-radius);
    padding: 20px 0;
  }

  .member-card {
    background-color: #fcfcfc;
    border: 1px solid #ebeef5;
    border-radius: var(--card-radius);
    transition: all 0.3s;

    &:hover {
      box-shadow: var(--card-hover-shadow);
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
      border-radius: var(--card-radius) var(--card-radius) 0 0;

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
  /* 页面在顶栏+面包屑(约110px)之下，100vh 会固定多出滚动量 */
  min-height: calc(100vh - 110px);
  padding: var(--container-padding);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.paper-sheet {
  width: 100%;
  max-width: 1200px;
  background: #fff;
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
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
  border-radius: var(--card-radius);
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
    border-radius: var(--card-radius);
    overflow: hidden;
  }
}

.upload-area {
  width: 100%;
  height: 220px;
  border: 2px dashed #dcdfe6;
  border-radius: var(--card-radius);
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
  border: var(--card-border);
  border-radius: var(--card-radius);
}

.pdf-info {
  width: 100%;
  height: 220px;
  border: 2px dashed #dcdfe6;
  border-radius: var(--card-radius);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #fafafa;

  .pdf-icon {
    font-size: 48px;
    color: #c0c4cc;
    margin-bottom: 12px;
  }

  .pdf-name {
    font-size: 14px;
    font-weight: 600;
    color: #606266;
    padding: 0 20px;
    word-break: break-all;
    text-align: center;
  }
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
@media (max-width: 768px) {
  .paper-container { padding: 12px; }
  .paper-body { padding: 20px 16px; }
  .form-row-2 { grid-template-columns: 1fr; }
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
