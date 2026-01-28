<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting, Select, User, UserFilled } from '@element-plus/icons-vue'
import { api } from '@/api'
import { formatToGoTime } from '@/utils/format'
const route = useRoute()

const isSaving = ref(false)
const formRef = ref(null)

// 默认时间范围选中时的具体时间点 (00:00:00 - 23:59:59)
const defaultTime = [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 2, 1, 23, 59, 59)]

const gradeOptions = [
  { label: '大一', value: 1 },
  { label: '大二', value: 2 },
  { label: '大三', value: 3 },
  { label: '大四', value: 4 },
  { label: '研究生', value: 9 }, // 9 代表特殊处理
]

const competitionYear = ref(2026)
const getEntranceYear = (gradeValue) => {
  if (gradeValue === 9) return '不限年份'
  // 简单的减法逻辑，足以覆盖90%的情况
  return `${competitionYear.value - gradeValue}级`
}
// 表单数据模型
const form = reactive({
  type: 1, // 1:个人, 2:团队
  minMember: 1,
  maxMember: 3,
  timeRange: [], // [开始时间, 结束时间]
  workTimeRange: [], // 作品提交时间范围
  grades: [], // 限制年级
  advisorRequired: 0, // 指导老师是否必填
  attachmentType: 1, // 0:无, 1:选填, 2:必填
})

// 校验规则
const rules = {
  timeRange: [{ required: true, message: '请设置报名起止时间', trigger: 'change' }],
}

// 切换赛制时的逻辑处理
const handleTypeChange = (val) => {
  if (val === 1) {
    // 如果切回个人赛，重置团队限制
    form.minMember = 1
    form.maxMember = 1
  } else {
    // 切到团队赛，给个默认值
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
      // 模拟构造发送给后端的数据
      const submitData = {
        comp_id: Number(route.params.id),
        participant_type: form.type,
        min_team_member: form.type === 2 ? form.minMember : 1,
        max_team_member: form.type === 2 ? form.maxMember : 1,
        grade_requirement: form.grades,
        need_advisor: form.allowAdvisor ? (form.advisorRequired ? 2 : 1) : 0,
        need_attachment: form.attachmentType,
        reg_start_time: formatToGoTime(form.timeRange[0]),
        reg_end_time: formatToGoTime(form.timeRange[1]),
        submit_start_time: form.workTimeRange.length === 2 ? formatToGoTime(form.workTimeRange[0]) : null,
        submit_end_time: form.workTimeRange.length === 2 ? formatToGoTime(form.workTimeRange[1]) : null,
      }

      try {
        const response = await api.saveRegConfig(submitData)
        if (response.code === 200) {
          ElMessage.success('报名设置已更新')
        }
      } catch (err) {
      } finally {
        isSaving.value = false
        fetchConfig()
      }
    } else {
      ElMessage.error('表单验证未通过，请检查输入项')
    }
  })
}

// 获取已有设置
async function fetchConfig() {
  const compID = Number(route.params.id)
  try {
    const response = await api.getRegConfig(compID)
    if (response.code === 200) {
      const data = response.data
      form.type = data.participant_type
      form.minMember = data.min_team_member || 1
      form.maxMember = data.max_team_member || 1
      form.timeRange = [data.reg_start_time, data.reg_end_time]
      form.workTimeRange = [data.submit_start_time, data.submit_end_time]
      form.grades = data.grade_requirement || []
      form.advisorRequired = data.need_advisor
      form.attachmentType = data.need_attachment
      if (data.need_advisor === 0) {
        form.allowAdvisor = false
        form.advisorRequired = false
      } else {
        form.allowAdvisor = true
        form.advisorRequired = (data.need_advisor === 2)
      }
      if (data.reg_start_time && data.reg_end_time) {
        form.timeRange = [new Date(data.reg_start_time), new Date(data.reg_end_time)]
      } else {
        form.timeRange = []
      }

      if(data.submit_start_time && data.submit_end_time) {
        form.workTimeRange = [new Date(data.submit_start_time), new Date(data.submit_end_time)]
      } else {
        form.workTimeRange = []
      }
    }
  } catch (error) {
    ElMessage.error(error.message || '获取报名配置失败')
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
            <el-tag type="info" size="small" effect="plain" class="ml-2"
              >当前赛事：第十届互联网大赛</el-tag
            >
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

            <!-- <div class="form-tip">
            {{ form.type === 1 ? '个人赛固定为 1 人' : '包括队长在内的人数范围' }}
          </div> -->
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
              ><span style="float: left">{{ item.label }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 10px">
                {{ getEntranceYear(item.value) }}
              </span></el-option
            >
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

        <div class="form-section-title">材料提交</div>

        <el-form-item label="附件上传要求">
          <el-radio-group v-model="form.attachmentType">
            <el-radio :value="0" border>无需附件</el-radio>
            <el-radio :value="1" border>选填 (可选上传)</el-radio>
            <el-radio :value="2" border class="is-required-radio">必须上传 (必填)</el-radio>
          </el-radio-group>
          <!-- <div class="form-tip">通常用于收集报名表、项目计划书等文件</div> -->
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.config-container {
  box-sizing: border-box;
  padding: 20px;
  background-color: var(--background-color); /* 假设你有这个全局变量，没有就删掉 */
  height: calc(100vh - 60px);
  display: flex;
  justify-content: center; /* 居中显示，更像表单 */
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

/* 分组标题样式 */
.form-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #909399;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  line-height: 1;
}

/* 团队人数输入框布局 */
.flex-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .separator {
    color: #909399;
  }

  .suffix {
    margin-left: 10px;
    color: #606266;
    font-size: 13px;
  }
}

/* 垂直布局辅助 */
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

/* 提示文字 */
.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 6px;
}

.ml-2 {
  margin-left: 8px;
}
.mr-1 {
  margin-right: 4px;
}

// :deep(.is-required-radio.is-checked) {
//   --el-radio-button-checked-bg-color: #f56c6c;
//   --el-radio-button-checked-border-color: #f56c6c;
//   --el-color-primary: #f56c6c; /* 让选中的点变成红色 */
// }
</style>
