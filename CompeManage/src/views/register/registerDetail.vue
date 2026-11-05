<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/api'
import { nextTick } from 'vue'
import {
  User,
  Iphone,
  Message,
  Postcard,
  ArrowLeft,
  Plus,
  Delete,
  Trophy,
  Document,
  UserFilled,
  UploadFilled,
  Search,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { debounce } from '@/utils/debounce'
import { isValidPhone, isValidEmail, phoneRule, emailRule } from '@/utils/validators'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
let maxMembers = ref()
let minMembers = ref()
let need_advisor = ref(0)
let need_attachment = ref()
let trackOptions = ref([]) // 赛道配置（含子赛道）
const participationType = ref('individual')
const currentStudent = ref(null)
const savedRegistrationID = ref(null)
const canChooseParticipationType = computed(() => compInfo.value.compType === 2 && minMembers.value <= 1 && maxMembers.value > 1)
const uploadedUrls = ref([])
const uploadRef = ref(null)
const token = localStorage.getItem('token')
const uploadHeaders = {
  Authorization: `Bearer ${token}`,
}
const pageStatus = ref(0) // 0(未报名), 1(已报名/待审), 2(被驳回)
const rejectReason = ref('') // 驳回理由
const isReadOnly = computed(() => pageStatus.value === 1) // 是否只读
const isSelectingLeader = ref(false)
const compInfo = ref({})
const isSelectingAdvisor = ref(false)
const collegeList = ref([])
const departmentList = ref([])
const formData = reactive({
  teamName: '',
  leader: {
    name: '',
    stuID: '',
    phone: '',
    email: '',
    college: '',
    is_leader: true,
  },
  // 队员列表 - 默认为空
  members: [],
  fileList: [],
  advisorInfo: {
    id: null,
    username: '',
    name: '',
    phone: '',
    email: '',
    college: '',
  },
  trackName: '', // 选择的赛道
  subTrackTitle: '', // 选择的赛题（子赛道）
  track: '', // 提交给后端的赛道字符串
})

const emptyLeader = () => ({ name: '', stuID: '', phone: '', email: '', college: '', is_leader: true })
const applyCurrentStudent = () => {
  const u = currentStudent.value
  if (u && participationType.value === 'individual') formData.leader = { ...emptyLeader(), name: u.name, stuID: u.username, college: u.college || '' }
}
watch(participationType, (type) => {
  formData.members = []
  formData.leader = emptyLeader()
  if (type === 'individual') applyCurrentStudent()
  formRef.value?.clearValidate()
}, { flush: 'sync' })
async function loadCurrentStudent() {
  const user = JSON.parse(localStorage.getItem('userInfo') || '{}')
  if (!user.username) return
  try {
    const res = await api.getStudentList({ page: 1, page_size: 10, role: 'student', search: user.username })
    currentStudent.value = res.data?.list?.find(u => u.username === user.username) || null
  } catch { ElMessage.error('加载本人信息失败，请刷新后重试') }
}

/* --- 校验规则 --- */
const rules = {
  teamName: [{ required: true, whitespace: true, message: '请输入参赛项目名称', trigger: 'blur' }],
  'leader.name': [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  'leader.phone': [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    phoneRule, // 使用验证工具
  ],
  'leader.email': [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    emailRule, // 使用验证工具
  ],
  trackName: [],
  subTrackTitle: [],
}

const subTrackOptions = computed(() => {
  const current = trackOptions.value.find((item) => item.trackName === formData.trackName)
  return current?.subTrack || []
})

const hasTrackConfig = computed(() => trackOptions.value.length > 0)

const hasSubTrackForCurrentTrack = computed(() => subTrackOptions.value.length > 0)

const updateSubTrackRule = () => {
  if (hasTrackConfig.value && hasSubTrackForCurrentTrack.value) {
    rules.trackName = [{ required: true, message: '请选择赛道', trigger: 'change' }]
    rules.subTrackTitle = [{ required: true, message: '请选择赛题', trigger: 'change' }]
  } else if (hasTrackConfig.value) {
    rules.trackName = [{ required: true, message: '请选择赛道', trigger: 'change' }]
    rules.subTrackTitle = []
  } else {
    rules.trackName = []
    rules.subTrackTitle = []
  }
}

const buildTrackValue = (trackName, subTrackTitle) => {
  if (!trackName) return ''
  if (!subTrackTitle) return trackName
  return `${trackName} / ${subTrackTitle}`
}

const syncTrackValue = () => {
  if (!formData.trackName) {
    formData.track = ''
    formData.subTrackTitle = ''
    return
  }

  if (!hasSubTrackForCurrentTrack.value) {
    formData.subTrackTitle = ''
    formData.track = formData.trackName
    return
  }

  if (!formData.subTrackTitle) {
    formData.track = ''
    return
  }

  formData.track = buildTrackValue(formData.trackName, formData.subTrackTitle)
}

const parseSavedTrackValue = async (savedTrack) => {
  if (!savedTrack) {
    formData.trackName = ''
    formData.subTrackTitle = ''
    formData.track = ''
    return
  }

  // 直接按 " / " 分割
  const parts = savedTrack.split(' / ')
  
  if (parts.length === 2) {
    formData.trackName = parts[0].trim()
    formData.subTrackTitle = parts[1].trim()
    console.log(formData.subTrackTitle)
    console.log('formData 转普通对象:', JSON.parse(JSON.stringify(formData)))
    formData.track = savedTrack
  } else if (parts.length === 1) {
    // 只有赛道，没有赛题
    formData.trackName = parts[0].trim()
    formData.subTrackTitle = ''
    formData.track = parts[0].trim()
  } else {
    // 其他情况，保持原值
    formData.track = savedTrack
  }
  
}

watch(
  () => formData.trackName,
  (newTrackName, oldTrackName) => {
    // 只有在手动切换（即 oldTrackName 有值且不是回显初始化）时才清空
    // 或者在解析回显数据时，暂时禁用这个清空逻辑
    if (oldTrackName && newTrackName !== oldTrackName) {
      formData.subTrackTitle = ''
    }
    
    // 更新子赛题的可选项列表 (subTrackOptions)
    const currentTrack = trackOptions.value.find(t => t.trackName === newTrackName)
    subTrackOptions.value = currentTrack ? currentTrack.subTrack : []
    
    updateSubTrackRule()
    syncTrackValue()
  }
)

watch(
  () => formData.subTrackTitle,
  () => {
    syncTrackValue()
  }
)

// ==================== 学生选择相关变量 ====================
const studentDialogVisible = ref(false)
const studentLoading = ref(false)
const studentList = ref([])
const currentMemberEditIndex = ref(-1) // -1表示新增，>=0表示编辑第几个成员
const searchForm = reactive({
  name: '',
  username: '',
  college: '',
})
const studentCurrentPage = ref(1)
const studentPageSize = ref(10)
const studentTotal = ref(0)

// ==================== 学生选择相关方法 ====================

// 打开学生选择弹窗
const openStudentSelect = (target = -1) => {
  searchForm.name = ''; searchForm.username = ''; searchForm.college = ''; studentCurrentPage.value = 1
  if (target === 'advisor') {
    //  选择指导老师
    isSelectingAdvisor.value = true
    isSelectingLeader.value = false
    currentMemberEditIndex.value = -1
  } else if (target === 'leader') {
    isSelectingLeader.value = true
    isSelectingAdvisor.value = false
    currentMemberEditIndex.value = -1
  } else {
    isSelectingLeader.value = false
    isSelectingAdvisor.value = false
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
  isSelectingAdvisor.value = false
  currentMemberEditIndex.value = -1
}

//  确认选择学生
const selectStudent = (row) => {
  if (isSelectingAdvisor.value) {
    formData.advisorInfo = {
      id: row.id,
      username: row.username,
      name: row.name,
      phone: '', // 前端手动填写
      email: '', // 前端手动填写
      college: row.college || '',
    }
    ElMessage.success(`已选择指导老师：${row.name}`)
  } else if (isSelectingLeader.value) {
    if (formData.members.some(m => m.stuID === row.username)) return ElMessage.warning('该学生已在团队中，请勿重复选择')
    // 选择队长
    formData.leader.name = row.name
    formData.leader.stuID = row.username
    formData.leader.college = row.college
    // 电话和邮箱需要手动填写，清空之前的
    formData.leader.phone = ''
    formData.leader.email = ''
    ElMessage.success(`已选择队长：${row.name}，请补充手机号和邮箱`)
  } else if (currentMemberEditIndex.value === -1) {
    if (row.username === formData.leader.stuID || formData.members.some(m => m.stuID === row.username)) return ElMessage.warning('该学生已在团队中，请勿重复选择')
    if (formData.members.length >= maxMembers.value - 1) return ElMessage.warning(`参赛人数不能超过${maxMembers.value}人`)
    // 新增成员模式
    formData.members.push({
      name: row.name,
      stuID: row.username,
      phone: '',
      email: '',
      college: row.college,
    })
    ElMessage.success(`已添加成员：${row.name}，请补充手机号和邮箱`)
  } else {
    // 编辑已有成员模式
    if (row.username === formData.leader.stuID || formData.members.some((m, index) => index !== currentMemberEditIndex.value && m.stuID === row.username)) return ElMessage.warning('该学生已在团队中，请勿重复选择')
    const member = formData.members[currentMemberEditIndex.value]
    if (member.stuID !== row.username) { member.phone = ''; member.email = '' }
    member.name = row.name
    member.stuID = row.username
    member.college = row.college
    // 保留已有的电话和邮箱，或者清空让用户重新填
    // member.phone = ''
    // member.email = ''
    ElMessage.success(`成员已更新：${row.name}`)
  }

  studentDialogVisible.value = false
  isSelectingLeader.value = false
  isSelectingAdvisor.value = false
}

// ==================== 原有方法 ====================

const handleUploadSuccess = (response, uploadFile, uploadFiles) => {
  if (response.code !== 200) {
    ElMessage.error(response.msg || '附件上传失败')
    return
  }

  // 检查是否所有文件都上传完成了
  // Element Plus 会把文件状态更新为 'success'
  const isAllSuccess = uploadFiles.every((item) => item.status === 'success')

  if (isAllSuccess) {
    const urls = uploadFiles.map((item) => {
      return item.response?.data?.url || item.url
    })

    const finalAttachmentUrl = urls.join(',')
    submitForm(finalAttachmentUrl)
  }
}

const handleUploadError = (err, file, fileList) => {
  ElMessage.error(`文件 ${file.name} 上传失败，请检查网络后重试`)
}

const handleExceed = () => {
  ElMessage.warning('附件数量超出限制')
}

function addMember() {
  if (formData.members.length >= maxMembers.value - 1) {
    ElMessage.warning(`团队成员最多只能添加到${maxMembers.value}人`)
    return
  }
  // 改为打开学生选择面板
  openStudentSelect(-1)
}

function removeMember(index) {
  formData.members.splice(index, 1)
}

async function checkRegStatus() {
  const compID = Number(route.params.id)
  try {
    const response = await api.getRegStatus(compID)
    if (response.code == 200) {
      const data = response.data
      if (!data) {
        pageStatus.value = 0
        return
      }
      if (data.status == 2) {
        pageStatus.value = 2 // 被驳回 (编辑模式)
        rejectReason.value = data.reject_reason || ''
      } else {
        pageStatus.value = 1
      }
      savedRegistrationID.value = data.id
      participationType.value = compInfo.value.compType === 2 && (!canChooseParticipationType.value || (data.members || []).length > 1) ? 'team' : 'individual'
      formData.teamName = data.team_name
       console.log('data.track =', data.track)  // 加这一行看看后端返回的值
      await parseSavedTrackValue(data.track || '')
      console.log("formData",formData);
      if (data.attachment_url) {
        const urls = data.attachment_url.split(',')
        formData.fileList = urls.map((url) => ({
          name: url.substring(url.lastIndexOf('/') + 1),
          url: url,
          status: 'success', // 标记为已成功，防止重复上传
        }))
      }

      if (data.advisor_info) {
        try {
          // 如果是 JSON 字符串，先解析
          const advisorData = typeof data.advisor_info === 'string' 
            ? JSON.parse(data.advisor_info) 
            : data.advisor_info
          
          formData.advisorInfo = {
            id: advisorData.id || null,
            username: advisorData.username || '',
            name: advisorData.name || '',
            phone: advisorData.phone || '',
            email: advisorData.email || '',
            college: advisorData.college || '',
          }
        } catch (e) {
          console.error('解析指导老师信息失败:', e)
        }
      }

      const leaderData = (data.members || []).find((m) => m.is_leader)
      const memberData = (data.members || []).filter((m) => !m.is_leader)
      if (leaderData) {
        formData.leader = {
          name: leaderData.name,
          stuID: leaderData.student_id || leaderData.stu_id || leaderData.username, // 兼容后端字段名
          phone: leaderData.phone,
          email: leaderData.email,
          college: leaderData.college,
          is_leader: true,
        }
      }

      // 映射队员
      if (memberData.length > 0) {
        formData.members = memberData.map((m) => ({
          name: m.name,
          stuID: m.student_id || m.stu_id || m.username,
          phone: m.phone,
          email: m.email,
          college: m.college,
        }))
      } else {
        // 改为空数组
        formData.members = []
      }
    }
  } catch (error) {
    ElMessage.error(error.message || '获取报名状态失败')
  }
}

async function fetchRegSettings() {
  const compID = Number(route.params.id)
  const response = await api.getRegConfig(compID)
  if (response.code == 200) {
    const config = response.data
    maxMembers.value = Number(config.max_team_member) || 1
    minMembers.value = Number(config.min_team_member) || 1
    compInfo.value.title = config.comp_name
    need_advisor.value = Number(config.need_advisor) || 0
    need_attachment.value = config.need_attachment
    
    // 获取赛道配置（含子赛道）
    if (config.track && config.track.length > 0) {
      trackOptions.value = config.track
        .map((item) => {
          const trackName = (item?.trackName || '').trim()
          const subTrack = Array.isArray(item?.subTrack)
            ? item.subTrack
                .map((sub) => ({ title: (sub?.title || '').trim() }))
                .filter((sub) => sub.title)
            : []
          return { trackName, subTrack }
        })
        .filter((item) => item.trackName)

      updateSubTrackRule()
    } else {
      trackOptions.value = []
      updateSubTrackRule()
    }

    if (Number(config.participant_type) === 2 || (!config.participant_type && maxMembers.value > 1)) {
      compInfo.value.compType = 2
      compInfo.value.limitText = `团队赛 (${minMembers.value}-${maxMembers.value}人)`
    } else {
      compInfo.value.compType = 1
      compInfo.value.limitText = '个人赛'
    }
    participationType.value = compInfo.value.compType === 2 && !canChooseParticipationType.value ? 'team' : 'individual'
  } else {
    ElMessage.error(response.msg || '获取报名配置失败')
  }
}

async function fetchStudentList() {
  studentLoading.value = true
  const role = isSelectingAdvisor.value ? 'teacher' : 'student'
  try {
    const response = await api.getStudentList({
      page: studentCurrentPage.value,
      page_size: studentPageSize.value,
      role: role,
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

async function submitVerify() {
  if (!formRef.value) return
  
  if (!formData.leader.stuID) return ElMessage.error(participationType.value === 'team' ? '请先选择队长' : '请先加载本人信息')
  if (participationType.value === 'team') {
    const count = formData.members.length + 1
    const minimum = Math.max(2, minMembers.value)
    if (count < minimum || count > maxMembers.value) return ElMessage.error(`团队参赛人数须为${minimum}-${maxMembers.value}人（含队长）`)
    if (currentStudent.value && ![formData.leader, ...formData.members].some(m => m.stuID === currentStudent.value.username)) return ElMessage.error('请将申报人本人添加到参赛成员中')
  }
  // 检查赛道是否必填
  if (hasTrackConfig.value && !formData.trackName) {
    ElMessage.error('请选择赛道')
    return
  }

  if (hasSubTrackForCurrentTrack.value && !formData.subTrackTitle) {
    ElMessage.error('请选择赛题')
    return
  }
  
  if (need_advisor.value === 2 && !formData.advisorInfo.name) {
    ElMessage.error('该赛事要求必须选择指导老师')
    return
  }
  
  await formRef.value.validate((valid) => {
    if (valid) {
      // 核心判断：有没有待上传的文件？
      if (formData.fileList.some((f) => f.status === 'ready')) {
        uploadRef.value.submit()
      } else {
        const urls = formData.fileList.map((f) => f.response?.data?.url || f.url)
        submitForm(urls.join(','))
      }
    } else {
      ElMessage.error('请完善表单信息')
    }
  })
}

async function submitForm(attachmentURL) {
  const compID = Number(route.params.id)
  const submitData = {
    comp_id: compID,
    reg_id: savedRegistrationID.value || undefined,
    participation_type: participationType.value,
    team_name: formData.teamName.trim(),
    leader: formData.leader,
    members: participationType.value === 'team' ? formData.members : [],
    attachment_url: attachmentURL,
    advisor_info: need_advisor.value > 0 && formData.advisorInfo.name ? { id: formData.advisorInfo.id, username: formData.advisorInfo.username, name: formData.advisorInfo.name, college: formData.advisorInfo.college } : null,
    track: formData.track, // 新增：提交赛道
  }
  try {
    let response
    if (pageStatus.value === 2) {
      // 驳回状态 -> 调用重新提交接口
      response = await api.resubmitReg(submitData)
    } else {
      response = await api.submitReg(submitData)
    }
    if (response.code == 200) {
      ElMessage.success(pageStatus.value === 2 ? '重新提交成功！' : '报名成功！')
      router.back()
    } else {
      ElMessage.error(response.msg || '报名失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '报名失败')
  }
}

async function loadColleges() {
  try {
    const res = await api.getCollegeList()
    if (res.code === 0 || res.code === 200) {
      collegeList.value = res.data || []
    }
  } catch (e) {
    console.error('加载学院列表失败', e)
  }
}

async function loadDepartments() {
  try {
    const res = await api.getDepartmentList()
    if (res.code === 0 || res.code === 200) {
      departmentList.value = res.data || []
    }
  } catch (e) {
    console.error('加载部门列表失败', e)
  }
}

onMounted(async () => {
  loadColleges()
  loadDepartments()
  await loadCurrentStudent()
  // 先获取赛道配置
  await fetchRegSettings()
  applyCurrentStudent()
  // 再获取报名状态
  await checkRegStatus()
  // 等待 DOM 更新完成
  await nextTick()
})
</script>

<template>
  <div class="page-wrapper">
    <div class="theme-header">
      <div class="header-nav">
        <el-button link class="back-link" @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回列表
        </el-button>
      </div>

      <div class="header-content">
        <h1 class="comp-title">{{ compInfo.title }}</h1>

        <div class="limit-badge">
          <el-icon><UserFilled /></el-icon>
          <span>赛制限制：</span>
          <span class="highlight">{{ compInfo.limitText }}</span>
        </div>
      </div>
      <el-icon class="bg-watermark"><Trophy /></el-icon>
    </div>

    <div class="content-area">
      <div v-if="pageStatus === 2" class="status-alert" style="margin-bottom: 20px">
        <el-alert title="报名被驳回" type="error" show-icon :closable="false">
          <template #default>
            <div>
              驳回原因：<strong>{{ rejectReason || '无' }}</strong>
              <div style="margin-top: 4px; font-size: 12px">请修改下方信息后重新提交</div>
            </div>
          </template>
        </el-alert>
      </div>

      <div v-if="pageStatus === 1" class="status-alert" style="margin-bottom: 20px">
        <el-alert
          title="您已报名该赛事"
          type="success"
          description="如需修改请联系管理员。"
          show-icon
          :closable="false"
        />
      </div>

      <div class="form-card">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-position="top"
          size="large"
          class="main-form"
          :hide-required-asterisk="true"
          :disabled="isReadOnly"
        >
          <div class="form-section">
            <h3 class="section-title">参赛信息</h3>
            <el-row>
              <el-col :span="24">
                <el-form-item label="参赛项目名称" prop="teamName" :disabled="isReadOnly">
                  <el-input v-model="formData.teamName" maxlength="255" placeholder="请输入参赛项目名称" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="form-section">
            <el-form-item label="参赛方式">
              <el-radio-group v-if="canChooseParticipationType" v-model="participationType" :disabled="isReadOnly">
                <el-radio-button value="individual">个人参赛</el-radio-button>
                <el-radio-button value="team">团队参赛</el-radio-button>
              </el-radio-group>
              <el-tag v-else>{{ participationType === 'team' ? '团队参赛' : '个人参赛' }}</el-tag>
            </el-form-item>
          </div>

          <!-- 赛道选择区域 -->
          <div class="form-section" v-if="hasTrackConfig">
            <h3 class="section-title">
              选择赛道
              <span class="required-mark">*</span>
            </h3>
            <el-row :gutter="16" class="track-select-row">
              <el-col :span="hasSubTrackForCurrentTrack ? 12 : 24" :xs="24">
                <el-form-item label="赛道" prop="trackName" :disabled="isReadOnly">
                  <el-select
                    v-model="formData.trackName"
                    placeholder="请选择参赛赛道"
                    clearable
                    :disabled="isReadOnly"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in trackOptions"
                      :key="item.trackName"
                      :label="item.trackName"
                      :value="item.trackName"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="12" :xs="24" v-if="hasSubTrackForCurrentTrack">
                <el-form-item label="赛题" prop="subTrackTitle" :disabled="isReadOnly">
                  <el-select
                    v-model="formData.subTrackTitle"
                    placeholder="请选择赛题"
                    clearable
                    :disabled="isReadOnly || !formData.trackName"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in subTrackOptions"
                      :key="item.title"
                      :label="item.title"
                      :value="item.title"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div
              v-if="formData.trackName && !hasSubTrackForCurrentTrack"
              class="track-single-tip"
            >
              当前赛道无需选择赛题，可直接填写下方报名信息。
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">{{ participationType === 'individual' ? '本人信息' : '队长信息' }}</h3>
              <el-button
                v-if="participationType === 'team' && !isReadOnly && !formData.leader.name"
                link
                type="primary"
                @click="openStudentSelect('leader')"
                :icon="Plus"
              >
                选择队长
              </el-button>
              <el-button
                v-if="participationType === 'team' && !isReadOnly && formData.leader.name"
                link
                type="primary"
                @click="openStudentSelect('leader')"
              >
                重新选择
              </el-button>
            </div>

            <div class="info-grid">
              <!-- 空状态提示 -->
              <el-empty
                v-if="!formData.leader.name"
                description="请先选择队长"
                :image-size="80"
              />

              <el-row v-else :gutter="20">
                <el-col :span="8" :xs="24">
                  <el-form-item label="姓名">
                    <el-input v-model="formData.leader.name"  :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="学号">
                    <el-input
                      v-model="formData.leader.stuID"
                      :disabled="true"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="联系电话" prop="leader.phone">
                    <el-input
                      v-model="formData.leader.phone"
                      placeholder="请输入手机号"
                      :disabled="isReadOnly"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="联系邮箱" prop="leader.email">
                    <el-input
                      v-model="formData.leader.email"
                      placeholder="请输入邮箱"
                      :disabled="isReadOnly"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="所属学院" prop="leader.college">
                    <el-input
                      v-model="formData.leader.college"
                      placeholder="所属学院"
                      :disabled="true"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>

          <div class="form-section" v-if="participationType === 'team'">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">成员列表</h3>
              <el-button link type="primary" @click="addMember" :icon="Plus" :disabled="isReadOnly">
                添加成员
              </el-button>
            </div>

            <div class="member-grid-container">
              <div v-if="formData.members.length === 0" class="empty-tip">
                <el-empty description="暂无成员，请点击上方按钮添加队员" :image-size="60" />
              </div>

              <div v-for="(m, i) in formData.members" :key="i" class="member-card">
                <div class="card-header">
                  <span class="member-index">成员 {{ i + 1 }}</span>
                  <div>
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="openStudentSelect(i)"
                      v-if="!isReadOnly"
                    >
                      重新选择
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      :icon="Delete"
                      @click="removeMember(i)"
                      v-if="!isReadOnly"
                    >
                      删除
                    </el-button>
                  </div>
                </div>

                <div class="card-body">
                  <el-row :gutter="20">
                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="姓名"
                        :prop="'members.' + i + '.name'"
                        :rules="{ required: true, message: '请输入姓名', trigger: 'blur' }"
                      >
                        <el-input
                          v-model="m.name"
                          :disabled="true"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="学号"
                        :prop="'members.' + i + '.stuID'"
                        :rules="{ required: true, message: '请输入学号', trigger: 'blur' }"
                      >
                        <el-input
                          v-model="m.stuID"
                          :disabled="true"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="联系电话"
                        :prop="'members.' + i + '.phone'"
                        :rules="[phoneRule]"
                      >
                        <el-input
                          v-model="m.phone"
                          placeholder="请输入手机号"
                          :disabled="isReadOnly"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="联系邮箱"
                        :prop="'members.' + i + '.email'"
                        :rules="[emailRule]"
                      >
                        <el-input
                          v-model="m.email"
                          placeholder="请输入邮箱"
                          :disabled="isReadOnly"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="所属学院"
                        :prop="'members.' + i + '.college'"
                        :rules="{ required: true, message: '请输入所属学院', trigger: 'blur' }"
                      >
                        <el-input
                          v-model="m.college"
                          placeholder="所属学院"
                          :disabled="true"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section" v-if="need_advisor > 0">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">
                指导老师信息
                <span v-if="need_advisor === 2" class="required-mark">*</span>
              </h3>
              <el-button
                v-if="!isReadOnly && !formData.advisorInfo.name"
                link
                type="primary"
                @click="openStudentSelect('advisor')"
                :icon="Plus"
              >
                选择指导老师
              </el-button>
              <el-button
                v-if="!isReadOnly && formData.advisorInfo.name"
                link
                type="primary"
                @click="openStudentSelect('advisor')"
              >
                重新选择
              </el-button>
            </div>

            <div class="info-grid">
              <el-empty
                v-if="!formData.advisorInfo.name"
                description="请先选择指导老师"
                :image-size="80"
              />

              <el-row v-else :gutter="20">
                <el-col :span="8" :xs="24">
                  <el-form-item label="姓名">
                    <el-input v-model="formData.advisorInfo.name" :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="工号">
                    <el-input v-model="formData.advisorInfo.username" :disabled="true" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="所属部门">
                    <el-input
                      v-model="formData.advisorInfo.college"
                      placeholder="所属部门"
                      :disabled="true"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>

          <div class="form-section" v-if="need_attachment > 0">
            <h3 class="section-title">附件材料</h3>
            <el-upload
              ref="uploadRef"
              class="simple-upload"
              drag
              action="/api/upload"
              multiple
              :auto-upload="false"
              :data="{ type: 'reg_attachment' }"
              :limit="5"
              :headers="uploadHeaders"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :on-exceed="handleExceed"
              v-model:file-list="formData.fileList"
              :disabled="isReadOnly"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">将项目计划书拖拽至此处，或 <em>点击上传</em></div>
            </el-upload>
          </div>

          <div v-if="!isReadOnly" class="form-actions">
            <el-button size="large" @click="router.back()">取消</el-button>
            <el-button type="primary" size="large" style="width: 120px" @click="submitVerify">
              确认报名
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>

  <!--  学生选择弹窗 -->
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
        <el-form-item :label="isSelectingAdvisor ? '所属部门' : '所属学院'">
          <el-select
            v-model="searchForm.college"
            :placeholder="isSelectingAdvisor ? '选择部门' : '选择学院'"
            clearable
            @change="fetchStudentList"
            @clear="fetchStudentList"
            popper-class="dept-select-popper"
            style="width: 330px"
          >
            <el-option
              v-for="item in (isSelectingAdvisor ? departmentList : collegeList)"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
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
.page-wrapper {
  /* 页面在顶栏+面包屑(约110px)之下，100vh 会固定多出滚动量 */
  min-height: calc(100vh - 110px);
  background-color: var(--background-color);
}

.theme-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark-color) 100%);
  color: #fff;
  position: relative;
  overflow: hidden;
  padding: 20px 30px 100px;

  .header-nav {
    margin-bottom: 20px;

    .back-link {
      font-size: var(--primary-font);
      color: rgba(255, 255, 255, 0.8);
      padding-left: 0;

      &:hover {
        color: #fff;
      }

      :deep(.el-icon) {
        margin-right: 4px;
      }
    }
  }

  .header-content {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;

    .comp-title {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 16px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .limit-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(4px);
      border-radius: 50px;
      font-size: var(--primary-font);

      .highlight {
        font-weight: 600;
      }
    }
  }

  .bg-watermark {
    position: absolute;
    right: 5%;
    top: 50%;
    font-size: 220px;
    color: #fff;
    opacity: 0.1;
    transform: translateY(-50%) rotate(-15deg);
    pointer-events: none;
  }
}

.content-area {
  max-width: 1200px;
  width: 100%;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 20px 40px;
  position: relative;
  z-index: 5;
  .form-card {
    background: #fff;
    border-radius: var(--card-radius);
    box-shadow: var(--card-shadow);
    padding: 40px;
    margin-top: -60px;
    border: 1px solid #ebeef5;

    .form-section {
      margin-bottom: 40px;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 20px;
        padding-left: 12px;
        border-left: 4px solid var(--primary-color);

        .required-mark {
          color: #f56c6c;
          margin-left: 4px;
          font-size: 14px;
        }
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
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
              background-color: var(--primary-color);
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

          :deep(.el-form-item__label) {
            font-size: 13px;
            padding-bottom: 4px;
          }
        }
      }
    }

    .track-select-row {
      margin-bottom: 4px;
    }

    .track-single-tip {
      margin-top: 4px;
      padding: 8px 12px;
      border-radius: var(--card-radius);
      background: #f4f8ff;
      color: #5a6b8c;
      font-size: 13px;
      line-height: 1.5;
    }
  }

  .simple-upload {
    :deep(.el-upload-dragger:hover) {
      border-color: var(--primary-color);
    }
  }

  .form-actions {
    margin-top: 50px;
    text-align: center;
    padding-top: 30px;
    border-top: 1px dashed #e4e7ed;
  }
}

.search-bar {
  margin-bottom: 15px;

  :deep(.el-form--inline .el-form-item) {
    margin-right: 15px;
  }

  :deep(.el-form--inline) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
}

.pagination-wrapper {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  padding: 15px 0;
  border-top: 1px solid #eee;
}

.footer-copyright {
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
  margin-top: 30px;
}
@media (max-width: 768px) {
  .content-area { padding: 0 12px 24px; }
  .content-area .form-card { padding: 24px 16px; }
}
</style>
