<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, Timer, DocumentChecked } from '@element-plus/icons-vue'
import api from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('registration')
const myRegList = ref([])
const myAwardList = ref([])
const total = ref(0)

// ✅ 监听 Tab 切换
watch(activeTab, (newTab) => {
  if (newTab === 'registration') {
    fetchMyRegList()
  } else if (newTab === 'award') {
    fetchMyAwardList()
  }
})

async function fetchMyRegList() {
  loading.value = true
  try {
    const response = await api.getMyReg()
    if (response.code == 200) {
      myRegList.value = response.data.list || []
      total.value = response.data.total
    } else {
      ElMessage.error('获取列表失败:' + response.message)
    }
  } catch (error) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchMyAwardList() {
  loading.value = true
  try {
    const response = await api.getMyAwardList()
    if (response.code == 200) {
      myAwardList.value = response.data.list || []
      total.value = response.data.total
    } else {
      ElMessage.error('获取列表失败:' + response.message)
    }
  } catch (error) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const goDetail = (id) => {
  router.push(`/register/detail/${id}`)
}

const goDeclare = () => {
  router.push('/award/student/declare')
}

const goSubmitWork = (item, state) => {
  if (state.disabled) return
  router.push({ name: 'work-detail', params: { id: item.id } })
}

const getActionState = (item) => {
  if (item.status !== 1) {
    return {
      disabled: true,
      btnText: '资格审核中',
      btnType: 'info',
      tip: '您的报名尚未通过审核，暂无法提交作品',
    }
  }

  if (!item.submit_start_time || !item.submit_end_time) {
    return { disabled: true, btnText: '暂无提交', btnType: 'info', tip: '该赛事未配置提交时间' }
  }

  const now = new Date().getTime()
  const start = new Date(item.submit_start_time).getTime()
  const end = new Date(item.submit_end_time).getTime()

  if (now < start) {
    return {
      disabled: true,
      btnText: '通道未开启',
      btnType: 'info',
      tip: `开启时间：${item.submit_start_time}`,
    }
  }
  if (now > end) {
    return { disabled: true, btnText: '提交已截止', btnType: 'warning', tip: '作品提交通道已关闭' }
  }

  return {
    disabled: false,
    btnText: item.work_url ? '修改作品' : '提交作品',
    btnType: 'primary',
    tip: item.work_url ? '截止前可覆盖提交' : '请在截止前完成提交',
  }
}

const getStatusTag = (status) => {
  const map = {
    0: { type: 'warning', text: '待审核' },
    1: { type: 'success', text: '已报名' },
    2: { type: 'danger', text: '已驳回' },
    3: { type: 'info', text: '申报补录' }
  }
  return map[status] || { type: 'info', text: '未知' }
}

onMounted(() => {
  fetchMyRegList()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">我的竞赛中心</h2>
        <!-- <span class="subtitle">My Competition Center</span> -->
      </div>
      <el-button type="primary" @click="goDeclare" class="declare-btn">
        <el-icon class="mr-1"><Trophy /></el-icon> 申报校外奖项
      </el-button>
    </div>


    <el-tabs v-model="activeTab" class="custom-tabs">
      <el-tab-pane label="我的报名" name="registration">
        <div v-loading="loading" class="list-wrapper">
          <el-empty v-if="myRegList.length === 0" description="暂无参赛记录" />
          
          <div class="comp-list">
            <div v-for="item in myRegList" :key="item.id" class="comp-card">
              <div class="comp-info" @click="goDetail(item.comp_id)">
                <div class="name-row">
                  <el-tag
                    :type="getStatusTag(item.status).type"
                    effect="dark"
                    size="small"
                    class="status-badge"
                  >
                    {{ getStatusTag(item.status).text }}
                  </el-tag>
                  <h3 class="comp-name">{{ item.comp_name }}</h3>
                </div>

                <div class="meta-row">
                  <span class="meta-item" v-if="item.submit_start_time">
                    <el-icon><Timer /></el-icon>
                    作品提交：{{ item.submit_start_time }} ~ {{ item.submit_end_time }}
                  </span>
                  <span class="meta-item" v-else>
                    <el-icon><Timer /></el-icon> 作品提交时间待定
                  </span>
                </div>
              </div>

              <div class="comp-action">
                <el-button 
                  link 
                  type="primary" 
                  @click="goDetail(item.comp_id)"
                  class="view-btn"
                >
                  查看详情
                </el-button>

                <template v-for="state in [getActionState(item)]" :key="item.id">
                  <div class="submit-wrapper">
                    <div class="status-tip" v-if="!state.disabled">{{ state.tip }}</div>
                    
                    <el-tooltip :content="state.tip" :disabled="!state.disabled" placement="top">
                      <div class="btn-wrap">
                        <el-button
                          :type="state.btnType"
                          :disabled="state.disabled"
                          @click="goSubmitWork(item, state)"
                          class="submit-btn"
                        >
                          <el-icon v-if="item.work_url" class="mr-1"><DocumentChecked /></el-icon>
                          {{ state.btnText }}
                        </el-button>
                      </div>
                    </el-tooltip>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的获奖" name="award">
        <div v-loading="loading" class="list-wrapper">
          <el-empty v-if="myAwardList.length === 0" description="暂无获奖记录" />
          
         
          <div class="award-list" v-if="myAwardList.length > 0">
            <div v-for="award in myAwardList" :key="award.id" class="award-card">
              <h4>{{ award.comp_name }}</h4>
              <p>{{ award.award_level }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<style scoped lang="scss">
.page-container {
  box-sizing: border-box;
  padding: 24px;
  flex-direction: column;
  min-height: calc(100vh - 110px);
  display: flex;
  margin: 0px 30px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .title { margin: 0; font-size: 22px; color: #303133; }
  .subtitle { font-size: 12px; color: #909399; }
  
  .declare-btn {
    background-color: #a71d31; 
    border-color: #a71d31;
    &:hover { background-color: #c9243f; border-color: #c9243f; }
  }
}

.list-wrapper {
  min-height: 300px;
  margin-top: 10px;
}

.comp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 卡片样式 */
.comp-card {
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #ebeef5;
  
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #dcdfe6;
  }

  .comp-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer; /* 点击左侧也能进详情 */

    .name-row {
      display: flex;
      align-items: center;
      gap: 12px;
      .status-badge { flex-shrink: 0; }
      .comp-name {
        margin: 0;
        font-size: 18px;
        color: #303133;
        font-weight: 600;
        line-height: 1.4;
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 14px;
      color: #909399;
      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        .el-icon { margin-top: -1px; }
      }
    }
  }

  /* 右侧操作区 */
  .comp-action {
    margin-left: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px; /* 两个按钮之间的间距 */

    .view-btn {
      font-size: 14px;
    }

    .submit-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-end; /* 右对齐 */
      gap: 4px;

      .status-tip {
        font-size: 12px;
        color: #13c2c2; /* 青色提示 */
        margin-right: 2px;
      }

      .submit-btn {
        width: 110px;
        height: 38px;
        font-weight: 600;
        
        /* 只有未禁用的 primary 按钮才加阴影效果 */
        &.el-button--primary:not(.is-disabled) {
          background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(19, 194, 194, 0.3);
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(19, 194, 194, 0.4);
          }
        }
      }
    }
  }
}

.mr-1 { margin-right: 4px; }

:deep(.el-tabs__item) {
  font-size: 15px;
  height: 45px;
  &.is-active { font-weight: bold; }
}
</style>