<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/api'
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
let need_advisor = ref()
let need_attachment = ref()
let trackOptions = ref([]) // 赛道配置（含子赛道）
let compType = 'team' // team / individual
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

/* --- 校验规则 --- */
const rules = {
  teamName: [{ required: true, message: '请输入团队名称', trigger: 'blur' }],
  'leader.name': [{ required: true, message: '请输入姓名', trigger: 'blur' }],
 'leader.phone': [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    phoneRule, // 使用验证工具
  ],
  'leader.email': [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    emailRule, // 使用验证工具
  ],
   'advisorInfo.phone': [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    phoneRule,
  ],
  'advisorInfo.email': [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    emailRule,
  ],
  trackName: [{ required: true, message: '请选择赛道', trigger: 'change' }],
  subTrackTitle: [],
}

const subTrackOptions = computed(() => {
  const current = trackOptions.value.find((item) => item.trackName === formData.trackName)
  return current?.subTrack || []
})

const hasTrackConfig = computed(() => trackOptions.value.length > 0)

const hasSubTrackForCurrentTrack = computed(() => subTrackOptions.value.length > 0)

const updateSubTrackRule = () => {
  rules.subTrackTitle = hasSubTrackForCurrentTrack.value
    ? [{ required: true, message: '请选择赛题', trigger: 'change' }]
    : []
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

const parseSavedTrackValue = (savedTrack) => {
  if (!savedTrack) {
    formData.trackName = ''
    formData.subTrackTitle = ''
    formData.track = ''
    return
  }

  const pureTrackMatch = trackOptions.value.find((item) => item.trackName === savedTrack)
  if (pureTrackMatch) {
    formData.trackName = pureTrackMatch.trackName
    formData.subTrackTitle = ''
    syncTrackValue()
    return
  }

  for (const item of trackOptions.value) {
    for (const sub of item.subTrack) {
      if (buildTrackValue(item.trackName, sub.title) === savedTrack) {
        formData.trackName = item.trackName
        formData.subTrackTitle = sub.title
        syncTrackValue()
        return
      }
    }
  }

  const separators = [' / ', '/', '｜', '|', ' - ', '-']
  for (const sep of separators) {
    if (savedTrack.includes(sep)) {
      const [left, ...rest] = savedTrack.split(sep)
      const right = rest.join(sep)
      const trackName = left?.trim() || ''
      const subTrackTitle = right?.trim() || ''
      const trackMatch = trackOptions.value.find((item) => item.trackName === trackName)
      if (trackMatch) {
        formData.trackName = trackName
        const subMatch = trackMatch.subTrack.find((sub) => sub.title === subTrackTitle)
        formData.subTrackTitle = subMatch ? subMatch.title : ''
        syncTrackValue()
        return
      }
    }
  }

  formData.trackName = ''
  formData.subTrackTitle = ''
  formData.track = savedTrack
}

watch(
  () => formData.trackName,
  (newTrackName, oldTrackName) => {
    if (newTrackName !== oldTrackName) {
      formData.subTrackTitle = ''
    }
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
    // 选择负责人
    formData.leader.name = row.name
    formData.leader.stuID = row.username
    formData.leader.college = row.college
    // 电话和邮箱需要手动填写，清空之前的
    formData.leader.phone = ''
    formData.leader.email = ''
    ElMessage.success(`已选择负责人：${row.name}，请补充手机号和邮箱`)
  } else if (currentMemberEditIndex.value === -1) {
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
    const member = formData.members[currentMemberEditIndex.value]
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
      formData.teamName = data.team_name
      parseSavedTrackValue(data.track || '')

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

      const leaderData = data.members.find((m) => m.is_leader)
      const memberData = data.members.filter((m) => !m.is_leader)
      if (leaderData) {
        formData.leader = {
          name: leaderData.name,
          stuID: leaderData.student_id || leaderData.username, // 兼容后端字段名
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
          stuID: m.student_id || m.username,
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
    maxMembers.value = config.max_team_member
    minMembers.value = config.min_team_member
    compInfo.value.title = config.comp_name
    need_advisor.value = config.need_advisor
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

      rules.trackName = [{ required: true, message: '请选择赛道', trigger: 'change' }]
      updateSubTrackRule()
    } else {
      trackOptions.value = []
      rules.trackName = []
      rules.subTrackTitle = []
      formData.trackName = ''
      formData.subTrackTitle = ''
      formData.track = ''
    }

    if (maxMembers.value > 1) {
      compInfo.value.compType = 2
      compInfo.value.limitText = `团队赛 (${minMembers.value}-${maxMembers.value}人)`
    } else {
      compInfo.value.compType = 1
      compInfo.value.limitText = '个人赛'
    }
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
    team_name: formData.teamName,
    leader: formData.leader,
    members: formData.members,
    attachment_url: attachmentURL,
    advisor_info: formData.advisorInfo,
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
    ElMessage.error(error.response.msg || '报名失败')
  }
}

onMounted(() => {
  ;(async () => {
    await fetchRegSettings()
    await checkRegStatus()
  })()
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
          <div class="form-section" v-if="compInfo.compType === 2">
            <h3 class="section-title">团队名称</h3>
            <el-row>
              <el-col :span="24">
                <el-form-item label="团队名称" prop="teamName" :disabled="isReadOnly">
                  <el-input v-model="formData.teamName"/>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 新增：赛道选择区域 -->
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
              <h3 class="section-title" style="margin: 0">负责人信息</h3>
              <el-button
                v-if="!isReadOnly && !formData.leader.name"
                link
                type="primary"
                @click="openStudentSelect('leader')"
                :icon="Plus"
              >
                选择负责人
              </el-button>
              <el-button
                v-if="!isReadOnly && formData.leader.name"
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
                description="请先选择负责人"
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

          <div class="form-section" v-if="compInfo.compType == 2">
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
                        :rules="{ required: true, message: '请输入手机号', trigger: 'blur' }"
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
                        :rules="{ required: true, message: '请输入邮箱', trigger: 'blur' }"
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
                  <el-form-item label="联系电话" prop="advisorInfo.phone">
                    <el-input
                      v-model="formData.advisorInfo.phone"
                      placeholder="请输入手机号"
                      :disabled="isReadOnly"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="联系邮箱" prop="advisorInfo.email">
                    <el-input
                      v-model="formData.advisorInfo.email"
                      placeholder="请输入邮箱"
                      :disabled="isReadOnly"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="所属学院">
                    <el-input
                      v-model="formData.advisorInfo.college"
                      placeholder="所属学院"
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
    :title="isSelectingAdvisor ? '选择指导老师' : isSelectingLeader ? '选择负责人' : '选择队员'"
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
        <el-form-item label="所属学院">
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
.page-wrapper {
  min-height: 100vh;
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
    max-width: 900px;
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
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  padding: 0 20px 40px;
  position: relative;
  z-index: 5;
  .form-card {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
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
      border-radius: 6px;
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
</style>