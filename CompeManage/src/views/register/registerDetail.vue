<script setup>
import { ref, reactive, onMounted,computed } from 'vue'
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
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
let maxMembers = ref()
let minMembers = ref()
let need_advisor = ref()
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

const compInfo = ref({})
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
  // 队员列表
  members: [{ name: '', stuID: '', phone: '', email: '', college: '' }],
  fileList: [],
})

/* --- 3. 校验规则 --- */
const rules = {
  teamName: [{ required: true, message: '请输入团队名称', trigger: 'blur' }],
  'leader.name': [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  'leader.stuID': [{ required: true, message: '请输入学号', trigger: 'blur' }],
  'leader.phone': [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  'leader.email': [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  'leader.college': [{ required: true, message: '请输入所属学院', trigger: 'blur' }],
}

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
  formData.members.push({ name: '', stuID: '', phone: '', email: '', college: '' })
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
      if (data.attachment_url) {
        const urls = data.attachment_url.split(',')
        formData.fileList = urls.map((url) => ({
          name: url.substring(url.lastIndexOf('/') + 1),
          url: url,
          status: 'success', // 标记为已成功，防止重复上传
        }))
      }
      const leaderData = data.members.find((m) => m.is_leader)
      const memberData = data.members.filter((m) => !m.is_leader)
      if (leaderData) {
        formData.leader = {
          name: leaderData.name,
          stuID: leaderData.student_id || leaderData.stu_id, // 兼容后端字段名
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
          stuID: m.student_id || m.stu_id,
          phone: m.phone,
          email: m.email,
          college: m.college,
        }))
      } else {
        // 如果没有队员(比如个人赛)，清空默认的一个空对象
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
    if (maxMembers.value > 1) {
      compInfo.value.compType = 2
      compInfo.value.limitText = `团队赛 (${minMembers.value}-${maxMembers.value}人)`
    } else {
      compInfo.value.compType = 1
      compInfo.value.limitText = '个人赛'
    }
  }
}

async function submitVerify() {
  if (!formRef.value) return
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
  }
  try {
    let response
    if (pageStatus.value === 2) {
      // 驳回状态 -> 调用重新提交接口 (PUT)
      response = await api.resubmitReg(submitData)
    } else {
      response = await api.submitReg(submitData)
    }
    if (response.code == 200) {
      ElMessage.success(pageStatus.value === 2 ? '重新提交成功！' : '报名成功！')
      router.back()
    }
  } catch (error) {
    ElMessage.error(error.message || '报名失败')
  }
}

onMounted(() => {
  checkRegStatus()
  fetchRegSettings()
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
    <div v-if="pageStatus === 2" class="status-alert" style="margin-bottom: 20px;">
    <el-alert
      title="报名被驳回"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <div>
          驳回原因：<strong>{{ rejectReason || '无' }}</strong>
          <div style="margin-top: 4px; font-size: 12px">请修改下方信息后重新提交</div>
        </div>
      </template>
    </el-alert>
  </div>

  <div v-if="pageStatus === 1" class="status-alert" style="margin-bottom: 20px;">
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
                  <el-input v-model="formData.teamName" prefix-icon="Trophy" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="form-section">
            <h3 class="section-title">负责人信息</h3>
            <div class="info-grid">
              <el-row :gutter="20">
                <el-col :span="8" :xs="24">
                  <el-form-item label="姓名">
                    <el-input v-model="formData.leader.name" prefix-icon="User" :disabled="isReadOnly" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="学号">
                    <el-input v-model="formData.leader.stuID" prefix-icon="Postcard" :disabled="isReadOnly" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="联系电话" prop="leader.phone">
                    <el-input v-model="formData.leader.phone" placeholder="请输入手机号" :disabled="isReadOnly" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="联系邮箱" prop="leader.email">
                    <el-input v-model="formData.leader.email" placeholder="请输入邮箱" :disabled="isReadOnly" />
                  </el-form-item>
                </el-col>
                <el-col :span="8" :xs="24">
                  <el-form-item label="所属学院" prop="leader.college">
                    <el-input v-model="formData.leader.college" placeholder="请输入所属学院" :disabled="isReadOnly" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>

          <div class="form-section" v-if="compInfo.compType == 2">
            <div class="section-header">
              <h3 class="section-title" style="margin: 0">成员列表</h3>
              <el-button link type="primary" @click="addMember" :icon="Plus">添加成员</el-button>
            </div>

            <div class="member-grid-container">
              <div v-if="formData.members.length === 0" class="empty-tip">
                <el-empty description="暂无成员，请点击右上角添加" :image-size="60" />
              </div>

              <div v-for="(m, i) in formData.members" :key="i" class="member-card">
                <div class="card-header">
                  <span class="member-index">成员 {{ i + 1 }}</span>
                  <el-button
                    type="danger"
                    link
                    :icon="Delete"
                    @click="removeMember(i)"
                    v-if="formData.members.length > 1"
                  >
                    删除
                  </el-button>
                </div>

                <div class="card-body">
                  <el-row :gutter="20">
                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="姓名"
                        :prop="'members.' + i + '.name'"
                        :rules="{ required: true, message: '请输入姓名', trigger: 'blur' }"
                      >
                        <el-input v-model="m.name" placeholder="填写真实姓名" prefix-icon="User" :disabled="isReadOnly" />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="学号"
                        :prop="'members.' + i + '.stuID'"
                        :rules="{ required: true, message: '请输入学号', trigger: 'blur' }"
                      >
                        <el-input v-model="m.stuID" placeholder="填写学号" prefix-icon="Postcard" :disabled="isReadOnly" />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item
                        label="手机号"
                        :prop="'members.' + i + '.phone'"
                        :rules="{ required: true, message: '请输入手机号', trigger: 'blur' }"
                      >
                        <el-input v-model="m.phone" placeholder="填写手机号" prefix-icon="Iphone" :disabled="isReadOnly" />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12" :xs="24">
                      <el-form-item
                        label="所属学院"
                        :prop="'members.' + i + '.college'"
                        :rules="{ required: true, message: '请输入所属学院', trigger: 'blur' }"
                      >
                        <el-input
                          v-model="m.college"
                          placeholder="例如：计算机科学与网络工程学院"
                          prefix-icon="School"
                          :disabled="isReadOnly"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12" :xs="24">
                      <el-form-item
                        label="电子邮箱"
                        :prop="'members.' + i + '.email'"
                        :rules="{ required: true, message: '请输入邮箱', trigger: 'blur' }"
                      >
                        <el-input
                          v-model="m.email"
                          placeholder="接收比赛通知使用"
                          prefix-icon="Message"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </div>
          </div>

          <!-- <div class="form-section" v-if="need_advisor"> 先搁置，确认需求后再实现
            <h3 class="section-title">指导老师信息</h3>
            <div class="info-grid"> 
              
            </div>

          </div> -->

          <div class="form-section">
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

          <div  v-if="!isReadOnly" class="form-actions">
            <el-button size="large" @click="router.back()">取消</el-button>
            <el-button  type="primary" size="large" style="width: 120px" @click="submitVerify">
              确认报名
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-wrapper {
  min-height: 100vh;
  background-color: var(--background-color); /* 浅灰底色 */
}

.theme-header {
  /* 1. 渐变背景：从左上(#13c2c2) 到 右下(#08979c) */
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark-color) 100%);
  color: #fff;
  /* 3. 相对定位：为了让里面的“绝对定位水印”以我为基准 */
  position: relative;
  overflow: hidden;

  /* 
     顶部 20px：给导航栏留空
     底部 100px：这一大片空白，是留给下一个步骤的“白色卡片”上浮用的！
  */
  padding: 20px 30px 100px;
  .header-nav {
    margin-bottom: 20px; /* 和标题拉开距离 */
    .back-link {
      font-size: var(--primary-font);
      color: rgba(255, 255, 255, 0.8); /* 80%透明度的白色，看起来更高级 */
      padding-left: 0;

      &:hover {
        color: #fff; /* 鼠标放上去变全白 */
      }
      /* 修正图标间距 */
      :deep(.el-icon) {
        margin-right: 4px;
      }
    }
  }
  .header-content {
    position: relative;
    z-index: 2; /* 确保文字在水印上面 */
    max-width: 900px;
    margin: 0 auto; /* 居中 */

    .comp-title {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 16px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 微微的文字阴影，增加立体感 */
    }

    /* 那个精致的胶囊 */
    .limit-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      /* 磨砂玻璃效果核心代码 👇 */
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

  /* C. 大水印 (装饰) */
  .bg-watermark {
    position: absolute; /* 绝对定位，脱离文档流 */
    right: 5%; /* 靠右 */
    top: 50%; /* 垂直居中 */
    font-size: 220px; /* 超级大 */
    color: #fff; /* 白色 */
    opacity: 0.1; /* 只有 10% 的不透明度，若隐若现 */
    transform: translateY(-50%) rotate(-15deg); /* 居中修正 + 倾斜15度 */
    pointer-events: none; /* 让鼠标能穿透它，不会挡住点击 */
  }
}

.content-area {
  max-width: 900px;
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
    margin-top: -60px; /* 上浮，覆盖在渐变背景上 */
    border: 1px solid #ebeef5;
    .form-section {
      margin-bottom: 40px;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 20px;
        padding-left: 12px;
        border-left: 4px solid #13c2c2; /* 青色指引条 */
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
    /* 成员列表容器 */
    .member-grid-container {
      display: flex;
      flex-direction: column;
      gap: 20px; /* 卡片之间的间距 */

      .empty-tip {
        border: 1px dashed #dcdfe6;
        border-radius: 8px;
        padding: 20px 0;
      }

      /* 单个成员卡片 */
      .member-card {
        background-color: #fcfcfc; /* 卡片背景微灰，区分于白底 */
        border: 1px solid #ebeef5;
        border-radius: 8px;
        transition: all 0.3s;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* 悬浮时浮起 */
          border-color: #dcdfe6;
          background-color: #fff;
        }

        /* 卡片标题栏 */
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

            /* 左侧的小蓝条装饰 */
            &::before {
              content: '';
              display: inline-block;
              width: 3px;
              height: 12px;
              background-color: #13c2c2;
              margin-right: 8px;
              border-radius: 2px;
            }
          }
        }

        /* 卡片内容区 */
        .card-body {
          padding: 20px;
          padding-bottom: 0; /* 抵消最后一行的 margin-bottom */

          /* 让表单项的 Label 稍微小一点，不喧宾夺主 */
          :deep(.el-form-item__label) {
            font-size: 13px;
            padding-bottom: 4px;
          }
        }
      }
    }
  }

  .simple-upload {
    :deep(.el-upload-dragger:hover) {
      border-color: #13c2c2;
    }
  }

  .form-actions {
    margin-top: 50px;
    text-align: center;
    padding-top: 30px;
    border-top: 1px dashed #e4e7ed;

    .submit-btn {
      background-color: #13c2c2;
      border-color: #13c2c2;
      &:hover {
        background-color: #36cfc9;
        border-color: #36cfc9;
      }
    }
  }
}

.footer-copyright {
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
  margin-top: 30px;
}
</style>
