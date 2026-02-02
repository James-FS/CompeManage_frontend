<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Trophy, UploadFilled, Medal, InfoFilled } from '@element-plus/icons-vue'
import api from '@/api' // 假设你已封装好 API

const router = useRouter()
const formRef = ref(null)
const isSubmitting = ref(false)

// 🔍 搜索相关
const searchLoading = ref(false)
const compOptions = ref([]) // 搜索结果列表

// 📝 表单数据模型
const form = reactive({
  compID: null,        // 选中的赛事ID
  compName: '',        // 回显用的赛事名 (提交时后端可能不需要，但前端展示用)
  awardLevel: '',      // 标准等级 (用于统计)
  awardSpecific: '',   // 证书具体名称 (如: 金奖、最佳创意奖)
  teamName: '',        // 团队/项目名称
  teammates: '',       // 队友姓名备注
  certImage: '',       // 证书图片URL
  awardDate: '',       // 获奖日期
})

const token = localStorage.getItem('token')
const uploadHeaders = { Authorization: `Bearer ${token}` }

// 🚩 校验规则
const rules = {
  compID: [{ required: true, message: '必须锁定一个具体的赛事', trigger: 'change' }],
  awardLevel: [{ required: true, message: '请选择标准归档等级', trigger: 'change' }],
  awardSpecific: [{ required: true, message: '请填写证书上的具体奖项名称', trigger: 'blur' }],
  certImage: [{ required: true, message: '请上传获奖证书证明', trigger: 'change' }],
  awardDate: [{ required: true, message: '请选择获奖日期', trigger: 'change' }],
}

// 🔎 核心：远程搜索赛事 (带年份显示)
const onSearchComp = async (query) => {
  if (query) {
    searchLoading.value = true
    try {
      // 调用后端模糊搜索接口
      // 后端应返回按年份倒序排列的列表
      const res = await api.getCompetitionList({ keyword: query, page_size: 20 })
      if (res.code === 200) {
        compOptions.value = res.data.list.map(item => ({
          value: item.id,
          label: item.comp_name,
          year: item.year,         
          level: item.comp_level,
          organizer: item.organizer
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

// 选中赛事回调
const handleCompChange = (val) => {
  const selected = compOptions.value.find(item => item.value === val)
  if (selected) {
    form.compName = selected.label
  }
}

// 📤 上传成功回调
const handleUploadSuccess = (response) => {
  if (response.code === 200) {
    form.certImage = response.data.url
    ElMessage.success('证书上传成功')
  } else {
    ElMessage.error('上传失败，请重试')
  }
}

// 🚀 提交申报
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true
      try {
        // 构造提交数据
        const payload = {
            comp_id: form.compID,
            award_level: form.awardLevel,      // 标准等级
            award_specific: form.awardSpecific,// 具体名称
            team_name: form.teamName || '个人参赛', 
            teammates: form.teammates,         // 队友备注
            cert_image: form.certImage,
            award_date: form.awardDate
        }

        const res = await api.declareExternalAward(payload)
        
        if (res.code === 200) {
          ElMessage.success({
            message: '申报成功！已自动归档至“我的竞赛档案”',
            duration: 2000
          })
          router.push('/reg/my-reg') // 跳回列表页
        }
      } catch (error) {
        console.error(error)
        ElMessage.error('申报提交失败，请联系管理员')
      } finally {
        isSubmitting.value = false
      }
    }
  })
}

const goBack = () => router.back()
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
                    <span class="comp-meta">
                      <span class="organizer">{{ item.organizer }}</span>
                      <el-tag size="small" type="info" effect="plain">{{ item.level }}</el-tag>
                    </span>
                  </div>
                </el-option>
              </el-select>
              <div class="help-text">
                <el-icon><InfoFilled /></el-icon> 
                如果没有找到对应年份的赛事，请联系学院管理员在后台“竞赛目录”中添加。
              </div>
            </el-form-item>
          </div>

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
               <el-form-item label="获奖日期 (证书落款时间)" prop="awardDate">
                 <el-date-picker 
                    v-model="form.awardDate" 
                    type="date" 
                    placeholder="选择日期" 
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                 />
              </el-form-item>
               <el-form-item label="团队/项目名称" prop="teamName">
                  <el-input v-model="form.teamName" placeholder="个人参赛可不填" />
               </el-form-item>
            </div>

            <el-form-item label="团队成员备注 (仅供审核参考)" prop="teammates">
              <el-input 
                v-model="form.teammates" 
                type="textarea" 
                :rows="2"
                placeholder="如果是团队赛，请列出所有队友姓名（如：张三、李四），方便老师核对证书信息。" 
              />
            </el-form-item>
          </div>

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
                  <!-- <div class="upload-tip">支持 JPG/PNG 格式，确保文字清晰可见</div> -->
                </div>
              </el-upload>
            </el-form-item>
          </div>

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
</template>

<style scoped lang="scss">
/* 页面背景 */
.paper-container {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding: 30px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* 纸张主体 */
.paper-sheet {
  width: 100%;
  max-width: 760px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 40px;
}

/* 顶部 Header (荣誉红) */
.paper-header {
  background: linear-gradient(135deg, #a71d31 0%, #7d1524 100%);
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

/* 提示条样式 */
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

/* 表单区块 */
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

/* 搜索框和帮助文本 */
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

/* 网格布局 */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 10px;
}

/* 上传组件美化 */
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
    border-color: #a71d31;
    background-color: #fffbfb;
    .upload-icon { color: #a71d31; }
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
  
  .upload-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 6px;
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

/* 底部按钮区 */
.form-footer {
  margin-top: 50px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #f2f2f2;

  .btn-submit {
    background-color: #a71d31;
    border-color: #a71d31;
    padding: 12px 36px;
    font-size: 15px;
    letter-spacing: 1px;
    
    &:hover {
      background-color: #c9243f;
      border-color: #c9243f;
    }
  }
  
  .btn-cancel {
    padding: 12px 24px;
  }
}

/* =================================
   下拉框自定义项 (需要写在全局或非scoped里，
   但Vue3支持在scoped里用 :deep 没法穿透popper，
   所以最好加一个 style 标签或用 popper-class)
   ================================= */
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

.comp-select-popper .comp-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comp-select-popper .organizer {
  font-size: 12px;
  color: #909399;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>