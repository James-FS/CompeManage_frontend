<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Setting, Select, User, UserFilled,
  Top, Bottom, Delete, Plus 
} from '@element-plus/icons-vue'
import { api } from '@/api'
import { formatToGoTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const isSaving = ref(false)
const formRef = ref(null)
const comp_name = ref('')

const defaultTime = [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 2, 1, 23, 59, 59)]

const gradeOptions = [
  { label: '大一', value: 1 },
  { label: '大二', value: 2 },
  { label: '大三', value: 3 },
  { label: '大四', value: 4 },
  { label: '研究生', value: 9 },
]

const competitionYear = ref(2026)
const getEntranceYear = (gradeValue) => {
  if (gradeValue === 9) return '不限年份'
  return `${competitionYear.value - gradeValue}级`
}

// 表单数据模型
const form = reactive({
  type: 1, 
  minMember: 1,
  maxMember: 3,
  timeRange: [], 
  workTimeRange: [], 
  grades: [], 
  advisorRequired: 0, 
  allowAdvisor: false,
  attachmentType: null,
  enableTrack: false,  // 新增：是否启用赛道配置
  tracks: [],  // 新增：赛道列表
  awards: ['一等奖', '二等奖', '三等奖'], 
})

const rules = {
  timeRange: [{ required: true, message: '请设置报名起止时间', trigger: 'change' }],
  attachmentType: [{ required: true, message: '请选择附件上传要求', trigger: 'change' }],
}



// --- 赛道操作逻辑 ---
const addTrack = () => form.tracks.push('')

const removeTrack = (index) => form.tracks.splice(index, 1)

// --- 奖项操作逻辑 (朴素版) ---
const addAward = () => form.awards.push('')

const removeAward = (index) => form.awards.splice(index, 1)

const moveUp = (index) => {
  if (index === 0) return
  const temp = form.awards[index]
  form.awards[index] = form.awards[index - 1]
  form.awards[index - 1] = temp
}

const moveDown = (index) => {
  if (index === form.awards.length - 1) return
  const temp = form.awards[index]
  form.awards[index] = form.awards[index + 1]
  form.awards[index + 1] = temp
}

const handleTypeChange = (val) => {
  if (val === 1) {
    form.minMember = 1
    form.maxMember = 1
  } else {
    form.minMember = 2
    form.maxMember = 5
  }
}

// 保存逻辑
async function handleSave() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      isSaving.value = true
      const workRange = Array.isArray(form.workTimeRange) ? form.workTimeRange : []
      const submitData = {
        comp_id: Number(route.params.id),
        participant_type: form.type,
        min_team_member: form.type === 2 ? form.minMember : 1,
        max_team_member: form.type === 2 ? form.maxMember : 1,
        grade_requirement: form.grades,
        need_advisor: form.allowAdvisor ? (form.advisorRequired ? 2 : 1) : 0,
        need_attachment: form.attachmentType,
        
        // 过滤空行提交
        award_hierarchy: form.awards.filter(item => item && item.trim() !== ''),
        // 赛道配置
        track: form.enableTrack ? form.tracks.filter(item => item && item.trim() !== '') : [],

        reg_start_time: formatToGoTime(form.timeRange[0]),
        reg_end_time: formatToGoTime(form.timeRange[1]),
        submit_start_time: workRange.length === 2 ? formatToGoTime(workRange[0]) : null,
        submit_end_time: workRange.length === 2 ? formatToGoTime(workRange[1]) : null,
      }

      try {
        const response = await api.saveRegConfig(submitData)
        if (response.code === 200) {
          ElMessage.success('报名设置已更新')
          router.back()
        }
      } catch (err) {
        console.error(err)
      } finally {
        isSaving.value = false
      }
    } else {
      ElMessage.error('表单验证未通过，请检查输入项')
    }
  })
}

// 获取配置
async function fetchConfig() {
  const compID = Number(route.params.id)
  try {
    const response = await api.getRegConfig(compID)
    if (response.code === 200) {
      const data = response.data
      form.type = data.participant_type
      form.minMember = data.min_team_member || 1
      form.maxMember = data.max_team_member || 1
      form.grades = data.grade_requirement || []
      form.attachmentType = data.need_attachment ?? null
      comp_name.value = data.comp_name || ''
      
      if (data.need_advisor === 0) {
        form.allowAdvisor = false
        form.advisorRequired = false
      } else {
        form.allowAdvisor = true
        form.advisorRequired = (data.need_advisor === 2)
      }

      if (data.reg_start_time && data.reg_end_time) {
        form.timeRange = [new Date(data.reg_start_time), new Date(data.reg_end_time)]
      }
      if(data.submit_start_time && data.submit_end_time) {
        form.workTimeRange = [new Date(data.submit_start_time), new Date(data.submit_end_time)]
      }

      // 赛道回显
      if (data.track && data.track.length > 0) {
        form.enableTrack = true
        form.tracks = data.track
      } else {
        form.enableTrack = false
        form.tracks = []
      }

      // 奖项回显
      if (data.award_hierarchy) {
         try {
           form.awards = typeof data.award_hierarchy === 'string' 
             ? JSON.parse(data.award_hierarchy) 
             : data.award_hierarchy
         } catch (e) {
           form.awards = ['一等奖', '二等奖', '三等奖']
         }
      } else {
         form.awards = ['一等奖', '二等奖', '三等奖']
      }
    }
  } catch (error) {
    ElMessage.error(error.message || '获取配置失败')
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <div class="config-container">
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="icon"><Setting /></el-icon>
            <span class="title">报名规则配置</span>
            <el-tag type="info" size="small" effect="plain" class="ml-2">当前赛事：{{ comp_name }}</el-tag>
          </div>
          <el-button type="primary" :loading="isSaving" @click="handleSave">
            <el-icon><Select /></el-icon> 保存设置
          </el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140px"
        label-position="right"
        class="config-form"
      >
        <div class="form-section-title">基础模式</div>

        <el-form-item label="参赛形式" prop="type">
          <el-radio-group v-model="form.type" @change="handleTypeChange">
            <el-radio-button :value="1">
              <el-icon class="mr-1"><User /></el-icon> 个人赛
            </el-radio-button>
            <el-radio-button :value="2">
              <el-icon class="mr-1"><UserFilled /></el-icon> 团队赛
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <transition name="el-zoom-in-top">
          <el-form-item label="团队人数限制">
            <div class="flex-row">
              <el-input-number
                v-model="form.minMember"
                :min="1"
                :max="form.maxMember"
                controls-position="right"
                :disabled="form.type === 1"
              />
              <span class="separator">至</span>
              <el-input-number
                v-model="form.maxMember"
                :min="form.minMember"
                :max="20"
                controls-position="right"
                :disabled="form.type === 1"
              />
              <span class="suffix">人 / 队</span>
            </div>
          </el-form-item>
        </transition>

        <el-form-item label="报名起止时间" prop="timeRange">
          <el-date-picker
            v-model="form.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始报名"
            end-placeholder="报名截止"
            format="YYYY-MM-DD HH:mm"
            :default-time="defaultTime"
            style="width: 100%; max-width: 400px"
          />
        </el-form-item>

        <el-form-item label="作品提交时间" prop="workTimeRange">
          <el-date-picker
            v-model="form.workTimeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始提交"
            end-placeholder="提交截止"
            format="YYYY-MM-DD HH:mm"
            :default-time="defaultTime"
            style="width: 100%; max-width: 400px"
          />
        </el-form-item>

        <el-divider border-style="dashed" />

        <div class="form-section-title">资格与限制</div>

        <el-form-item label="允许参赛年级" prop="grades">
          <el-select
            v-model="form.grades"
            multiple
            collapse-tags
            max-collapse-tags="3"
            collapse-tags-tooltip
            placeholder="留空则代表全校不限年级"
            style="width: 100%; max-width: 400px"
          >
            <el-option
              v-for="item in gradeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
              <span style="float: left">{{ item.label }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 10px">
                {{ getEntranceYear(item.value) }}
              </span>
            </el-option>
          </el-select>
          <div class="form-tip">不选默认所有年级学生均可报名</div>
        </el-form-item>

        <el-form-item label="指导老师设置">
          <div class="flex-column">
            <el-switch
              v-model="form.allowAdvisor"
              active-text="允许填写指导老师"
              inactive-text="无需指导老师"
            />
            <transition name="el-fade-in">
              <div v-if="form.allowAdvisor" class="sub-option">
                <el-checkbox v-model="form.advisorRequired" label="指导老师为必填项" />
              </div>
            </transition>
          </div>
        </el-form-item>

        <el-divider border-style="dashed" />

        <!-- 新增：赛道配置区域 -->
        <div class="form-section-title">赛道配置</div>

        <el-form-item label="启用赛道">
          <el-switch
            v-model="form.enableTrack"
            active-text="启用赛道"
            inactive-text="无赛道"
          />
        </el-form-item>

        <transition name="el-fade-in">
          <el-form-item v-if="form.enableTrack" label="">
            <div class="track-list-container">
              <div v-if="form.tracks.length === 0" class="empty-state">
                <span>暂无赛道，请添加</span>
              </div>
              
              <div v-for="(item, index) in form.tracks" :key="index" class="track-row">
                <span class="track-label">赛道 {{ index + 1 }}</span>
                
                <el-input 
                  v-model="form.tracks[index]" 
                  placeholder="请输入赛道名称" 
                  style="width: 240px"
                  clearable
                />
                
                <el-button 
                  link 
                  type="danger" 
                  @click="removeTrack(index)"
                  :icon="Delete"
                  title="删除"
                />
              </div>

              <el-button 
                type="primary" 
                link 
                :icon="Plus" 
                @click="addTrack" 
                style="margin-top: 8px;"
              >
                添加赛道
              </el-button>
            </div>
          </el-form-item>
        </transition>

        <el-divider border-style="dashed" />

        <div class="form-section-title">奖项排名规则</div>

        <el-form-item>
          <div class="award-list-simple">
            <div v-for="(item, index) in form.awards" :key="index" class="award-row-simple">
              <span class="rank-label">第 {{ index + 1 }} 级</span>
              
              <el-input 
                v-model="form.awards[index]" 
                placeholder="请输入，如：一等奖" 
                style="width: 220px"
              />
              
              <div class="btn-box">
                <el-button 
                  link 
                  type="primary" 
                  :disabled="index === 0"
                  @click="moveUp(index)"
                  :icon="Top"
                  title="上移"
                />
                <el-button 
                  link 
                  type="primary" 
                  :disabled="index === form.awards.length - 1"
                  @click="moveDown(index)"
                  :icon="Bottom"
                  title="下移"
                />
                <el-button 
                  link 
                  type="danger" 
                  @click="removeAward(index)"
                  :icon="Delete"
                  title="删除"
                />
              </div>
            </div>

            <el-button type="primary" link :icon="Plus" @click="addAward" style="margin-top: 5px;">
              添加一个等级
            </el-button>
          </div>
        </el-form-item>

        <el-divider border-style="dashed" />

        <div class="form-section-title">材料提交</div>

        <el-form-item label="附件上传要求" prop="attachmentType">
          <el-radio-group v-model="form.attachmentType">
            <el-radio :value="0" border>无需附件</el-radio>
            <el-radio :value="1" border>选填 (可选上传)</el-radio>
            <el-radio :value="2" border class="is-required-radio">必须上传 (必填)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.config-container {
  box-sizing: border-box;
  padding: var(--container-padding);
  background-color: var(--background-color);
  min-height: calc(100vh - 110px);
  display: flex;
  justify-content: center;
}

.form-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;

      .title {
        font-size: 16px;
        font-weight: bold;
        color: #303133;
      }
      .icon {
        font-size: 18px;
        color: #409eff;
      }
    }
  }
}

.config-form {
  padding: 10px 20px;
}

.form-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #909399;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  line-height: 1;
}

.flex-row {
  display: flex;
  align-items: center;
  gap: 10px;
  .separator { color: #909399; }
  .suffix { margin-left: 10px; color: #606266; font-size: 13px; }
}

.flex-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-option {
  margin-left: 0px;
  padding-left: 10px;
  border-left: 2px solid #e4e7ed;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 6px;
}

.ml-2 { margin-left: 8px; }
.mr-1 { margin-right: 4px; }

/* === 赛道配置样式 === */
.track-list-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 500px;
}

.empty-state {
  font-size: 13px;
  color: #909399;
  padding: 20px;
  text-align: center;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  
  .track-label {
    width: 70px;
    font-size: 13px;
    color: #606266;
  }
}

/* === 简约奖项样式 === */
.award-list-simple {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 450px;
}

.award-tip {
  font-size: 13px;
  color: #606266;
  background-color: #f4f4f5;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.award-row-simple {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .rank-label {
    width: 60px;
    font-size: 13px;
    color: #606266;
  }
  
  .btn-box {
    display: flex;
    gap: 2px;
    /* 让图标稍微大一点 */
    :deep(.el-button) {
      padding: 6px;
      font-size: 16px;
    }
  }
}
</style>