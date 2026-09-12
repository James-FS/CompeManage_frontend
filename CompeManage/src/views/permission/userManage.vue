<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, User, UserFilled } from '@element-plus/icons-vue'
import api from '@/api'
import { debounce } from '@/utils/debounce'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const roleList = ref([])
const collegeList = ref([])
const userList = ref([])
const total = ref(0)
const currentUser = ref(null)
const selectedRoleId = ref(null)
const selectedManagedCollegeId = ref(null)
let requestSequence = 0

const filters = reactive({
  page: 1,
  page_size: 20,
  search: '',
  role_id: undefined,
  identity_type: undefined,
  managed_college_id: undefined,
})

const roleOrder = [
  'school_admin',
  'college_admin',
  'competition_manager',
  'teacher',
  'student',
  'expert',
  'guest',
]

const identityOptions = [
  { value: 'staff', label: '教职工' },
  { value: 'student', label: '本科生' },
  { value: 'postgraduate', label: '研究生' },
  { value: 'external', label: '外部/人工账号' },
]

const selectedRole = computed(() => roleList.value.find((role) => role.id === selectedRoleId.value))
const selectedRoleCode = computed(() => selectedRole.value?.role_code || '')
const isSelf = computed(() => currentUser.value?.id === userStore.userInfo?.id)
const originalRoleId = computed(() => currentUser.value?.role?.id ?? null)
const originalManagedCollegeId = computed(() => currentUser.value?.managed_college_id ?? null)
const isDirty = computed(() => {
  if (!currentUser.value) return false
  return selectedRoleId.value !== originalRoleId.value
    || (selectedRoleCode.value === 'college_admin'
      ? selectedManagedCollegeId.value !== originalManagedCollegeId.value
      : originalManagedCollegeId.value !== null)
})
const canSave = computed(() => {
  if (!currentUser.value || isSelf.value || saving.value || !isDirty.value || !selectedRoleId.value) return false
  if (selectedRoleCode.value === 'college_admin' && !selectedManagedCollegeId.value) return false
  return true
})

function identityLabel(value) {
  return identityOptions.find((item) => item.value === value)?.label || '待识别'
}

function roleTagType(roleCode) {
  const map = {
    school_admin: 'danger',
    college_admin: 'warning',
    competition_manager: 'primary',
    teacher: 'success',
    student: '',
    expert: 'info',
    guest: 'info',
  }
  return map[roleCode] || 'info'
}

function applyUserToEditor(user) {
  currentUser.value = user || null
  selectedRoleId.value = user?.role?.id ?? null
  selectedManagedCollegeId.value = user?.managed_college_id ?? null
}

async function loadBaseOptions() {
  const [rolesResponse, collegesResponse] = await Promise.all([
    api.getRoleList(),
    api.getCollegeList(),
  ])
  const roles = rolesResponse.data || []
  roleList.value = [...roles].sort((left, right) => {
    const leftIndex = roleOrder.indexOf(left.role_code)
    const rightIndex = roleOrder.indexOf(right.role_code)
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
  })
  collegeList.value = collegesResponse.data || []
}

async function loadUsers({ preserveSelection = true } = {}) {
  const sequence = ++requestSequence
  loading.value = true
  const selectedID = preserveSelection ? currentUser.value?.id : null
  try {
    const response = await api.getAllUsers({
      page: filters.page,
      page_size: filters.page_size,
      search: filters.search.trim() || undefined,
      role_id: filters.role_id || undefined,
      identity_type: filters.identity_type || undefined,
      managed_college_id: filters.managed_college_id || undefined,
    })
    if (sequence !== requestSequence) return
    userList.value = response.data?.list || []
    total.value = response.data?.total || 0
    if (selectedID) {
      const selected = userList.value.find((item) => item.id === selectedID)
      applyUserToEditor(selected || null)
    } else if (!preserveSelection) {
      applyUserToEditor(null)
    }
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

const debouncedSearch = debounce(() => {
  filters.page = 1
  loadUsers({ preserveSelection: false })
}, 300)

function handleFilterChange() {
  filters.page = 1
  loadUsers({ preserveSelection: false })
}

function handlePageChange(page) {
  filters.page = page
  loadUsers({ preserveSelection: false })
}

function handlePageSizeChange(size) {
  filters.page_size = size
  filters.page = 1
  loadUsers({ preserveSelection: false })
}

async function handleUserClick(user) {
  if (saving.value || currentUser.value?.id === user.id) return
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm('当前角色修改尚未保存，是否放弃修改？', '切换用户', {
        type: 'warning',
        confirmButtonText: '放弃并切换',
        cancelButtonText: '继续编辑',
      })
    } catch {
      return
    }
  }
  applyUserToEditor(user)
}

function handleRoleChange() {
  if (selectedRoleCode.value !== 'college_admin') {
    selectedManagedCollegeId.value = null
  } else if (currentUser.value?.role?.role_code === 'college_admin') {
    selectedManagedCollegeId.value = currentUser.value.managed_college_id ?? null
  }
}

function resetEditor() {
  applyUserToEditor(currentUser.value)
}

async function saveRole() {
  if (!canSave.value) return
  saving.value = true
  try {
    const response = await api.assignUserRole(currentUser.value.id, {
      role_id: selectedRoleId.value,
      managed_college_id: selectedRoleCode.value === 'college_admin'
        ? selectedManagedCollegeId.value
        : undefined,
    })
    if (response.data?.cache_refreshed === false) {
      if (response.data?.cache_retry_queued) {
        ElMessage.warning('角色已更新，权限缓存正在后台重试刷新')
      } else {
        const ttlSeconds = response.data?.cache_ttl_seconds || 300
        ElMessage.warning(`角色已更新，但缓存刷新和重试入队均失败；旧权限最迟约 ${Math.ceil(ttlSeconds / 60)} 分钟后失效`)
      }
    } else {
      ElMessage.success('角色分配成功，请通知该用户重新登录')
    }
    await loadUsers({ preserveSelection: true })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadBaseOptions()
    await loadUsers({ preserveSelection: false })
  } catch (error) {
    ElMessage.error(error?.message || '用户管理数据加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="user-manage-page" v-loading="loading">
    <div class="filter-card">
      <el-form :inline="true" class="filter-form" label-width="90px" label-position="right">
        <el-form-item label="关键字">
          <el-input
            v-model="filters.search"
            clearable
            placeholder="账号、姓名或所属单位"
            :prefix-icon="Search"
            @input="debouncedSearch"
            @clear="debouncedSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role_id" clearable placeholder="请选择角色" @change="handleFilterChange">
            <el-option v-for="role in roleList" :key="role.id" :label="role.role_name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="人员身份">
          <el-select v-model="filters.identity_type" clearable placeholder="请选择身份" @change="handleFilterChange">
            <el-option v-for="item in identityOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="管理学院">
          <el-select
            v-model="filters.managed_college_id"
            clearable
            filterable
            placeholder="请选择学院"
            @change="handleFilterChange"
          >
            <el-option v-for="college in collegeList" :key="college.id" :label="college.name" :value="college.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="content-grid">
      <el-card class="user-panel" shadow="never">
        <template #header>
          <div class="panel-title"><el-icon><User /></el-icon><span>用户列表</span></div>
        </template>
        <div class="user-list">
          <button
            v-for="item in userList"
            :key="item.id"
            type="button"
            class="user-item"
            :class="{ active: currentUser?.id === item.id }"
            @click="handleUserClick(item)"
          >
            <div class="user-main">
              <strong>{{ item.realname || item.username }}</strong>
              <span>{{ item.username }}</span>
            </div>
            <div class="user-meta">
              <el-tag size="small" effect="plain">{{ identityLabel(item.identity_type) }}</el-tag>
              <el-tag
                v-if="item.role"
                size="small"
                :type="roleTagType(item.role.role_code)"
                effect="light"
              >
                {{ item.role.role_name }}
              </el-tag>
              <el-tag v-else size="small" type="danger">待分配</el-tag>
              <el-tag v-if="item.role_conflict" size="small" type="danger">多角色异常</el-tag>
            </div>
          </button>
          <el-empty v-if="!userList.length" description="暂无用户" />
        </div>
        <el-pagination
          class="pagination"
          background
          layout="prev, pager, next"
          :pager-count="5"
          :total="total"
          :current-page="filters.page"
          :page-size="filters.page_size"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </el-card>

      <el-card class="editor-panel" shadow="never">
        <template #header>
          <div class="editor-header">
            <div class="panel-title"><el-icon><UserFilled /></el-icon><span>角色配置</span></div>
            <div class="actions">
              <el-button :disabled="!isDirty || saving" @click="resetEditor">重置</el-button>
              <el-button type="primary" :disabled="!canSave" :loading="saving" @click="saveRole">保存</el-button>
            </div>
          </div>
        </template>

        <el-empty v-if="!currentUser" description="请从左侧选择用户" />
        <template v-else>
          <el-alert
            v-if="isSelf"
            title="为防止系统锁死，不能修改当前登录校管理员自己的角色"
            type="warning"
            show-icon
            :closable="false"
            class="self-alert"
          />
          <el-alert
            v-if="currentUser.role_conflict"
            title="该用户存在多个角色，请先执行单角色迁移后再修改"
            type="error"
            show-icon
            :closable="false"
            class="self-alert"
          />

          <el-descriptions :column="2" border class="user-descriptions">
            <el-descriptions-item label="账号">{{ currentUser.username }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ currentUser.realname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="人员身份">{{ identityLabel(currentUser.identity_type) }}</el-descriptions-item>
            <el-descriptions-item label="年级/类别">{{ currentUser.grade || '-' }}</el-descriptions-item>
            <el-descriptions-item label="所属单位" :span="2">{{ currentUser.college || '-' }}</el-descriptions-item>
          </el-descriptions>

          <div class="form-section">
            <h3>选择角色</h3>
            <el-radio-group v-model="selectedRoleId" :disabled="isSelf || currentUser.role_conflict" @change="handleRoleChange">
              <div class="role-grid">
                <el-radio v-for="role in roleList" :key="role.id" :value="role.id" border>
                  <span class="role-option">
                    <strong>{{ role.role_name }}</strong>
                    <small>{{ role.role_code }}</small>
                  </span>
                </el-radio>
              </div>
            </el-radio-group>
          </div>

          <div v-if="selectedRoleCode === 'college_admin'" class="form-section">
            <h3>管理学院</h3>
            <el-select
              v-model="selectedManagedCollegeId"
              filterable
              placeholder="请选择院管理员负责的学院"
              :disabled="isSelf || currentUser.role_conflict"
              class="college-select"
            >
              <el-option v-for="college in collegeList" :key="college.id" :label="college.name" :value="college.id" />
            </el-select>
          </div>
        </template>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.user-manage-page {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--background-color);
}

/* 与赛事目录等页面统一的筛选卡样式：白底+卡片阴影+圆角 */
.filter-card {
  box-sizing: border-box;
  padding: 20px 20px 10px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;
}

.filter-form :deep(.el-form-item) { margin-bottom: 15px; margin-left: 15px; }
.filter-form :deep(.el-input),
.filter-form :deep(.el-select) { width: 220px; }

.content-grid {
  display: grid;
  /* 左列固定宽度，不随内容伸缩，避免选中不同用户时右侧面板跟着变宽变窄；
     min-height:0 防止 flex 子项被内容撑破页面高度；
     行高 minmax(0,1fr) 让两个面板严格等于剩余空间，列表在卡片内滚动 */
  grid-template-columns: 420px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.user-panel,
.editor-panel {
  border: none;
  /* 与赛事目录内容卡一致的阴影和圆角 */
  box-shadow: var(--card-shadow);
  border-radius: 4px;
}

/* 用户列表卡片填满行高，列表区滚动、分页固定底部 */
.user-panel { display: flex; flex-direction: column; overflow: hidden; }
.user-panel :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 角色配置面板内容超高时在面板内滚动，不撑破页面 */
.editor-panel { display: flex; flex-direction: column; overflow: hidden; }
.editor-panel :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.panel-title { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.editor-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.actions { display: flex; gap: 8px; }

.user-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  /* 细滚动条，避免默认粗滚动条及出现/消失引起的宽度跳动 */
  scrollbar-width: thin;
  scrollbar-color: #c0c4cc transparent;
}
.user-list::-webkit-scrollbar { width: 6px; }
.user-list::-webkit-scrollbar-thumb { background-color: #dcdfe6; border-radius: 3px; }
.user-list::-webkit-scrollbar-track { background: transparent; }

.user-item {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}
.user-item:hover { border-color: var(--el-color-primary-light-5); background: var(--el-color-primary-light-9); }
.user-item.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.user-main { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; min-width: 0; }
.user-main strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-main span { flex-shrink: 0; color: var(--el-text-color-secondary); font-size: 13px; }
.user-meta { display: flex; flex-wrap: wrap; gap: 6px; }
/* .pagination 类直接挂在 el-pagination 根元素上（flex 容器），
   布局只保留 prev/pager/next 一行，居中显示 */
.pagination {
  justify-content: center;
  margin-top: 16px;
  flex-shrink: 0;
}

.self-alert { margin-bottom: 16px; }
.user-descriptions { margin-bottom: 24px; }
/* 固定用户信息表的列宽：table-layout:fixed + 标签列定宽，
   切换用户时表格竖线不再随姓名/单位长短左右移动 */
.user-descriptions :deep(.el-descriptions__table) { width: 100%; table-layout: fixed; }
.user-descriptions :deep(.el-descriptions__table .el-descriptions__label) { width: 22%; }
.form-section { margin-top: 24px; }
.form-section h3 { margin: 0 0 14px; font-size: 15px; }
.form-section :deep(.el-radio-group) { width: 100%; }
.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  width: 100%;
}
.role-grid :deep(.el-radio) { width: 100%; height: auto; min-height: 58px; margin: 0; }
.role-option { display: flex; flex-direction: column; gap: 4px; }
.role-option small { color: var(--el-text-color-secondary); }
.college-select { width: min(440px, 100%); }

@media (max-width: 1000px) {
  .content-grid { grid-template-columns: 1fr; }
  .user-panel, .editor-panel { min-height: auto; }
  .user-list { max-height: 430px; }
}

@media (max-width: 640px) {
  .filter-form :deep(.el-form-item) { margin-left: 0; width: 100%; }
  .filter-form :deep(.el-input),
  .filter-form :deep(.el-select) { width: 100% !important; }
  .role-grid { grid-template-columns: 1fr; }
  .editor-header { align-items: flex-start; flex-direction: column; }
}
</style>
