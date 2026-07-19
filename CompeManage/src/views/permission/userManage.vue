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
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-input
          v-model="filters.search"
          clearable
          placeholder="搜索账号、姓名或所属单位"
          :prefix-icon="Search"
          class="search-input"
          @input="debouncedSearch"
          @clear="debouncedSearch"
        />
        <el-select v-model="filters.role_id" clearable placeholder="角色" @change="handleFilterChange">
          <el-option v-for="role in roleList" :key="role.id" :label="role.role_name" :value="role.id" />
        </el-select>
        <el-select v-model="filters.identity_type" clearable placeholder="人员身份" @change="handleFilterChange">
          <el-option v-for="item in identityOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select
          v-model="filters.managed_college_id"
          clearable
          filterable
          placeholder="管理学院"
          @change="handleFilterChange"
        >
          <el-option v-for="college in collegeList" :key="college.id" :label="college.name" :value="college.id" />
        </el-select>
      </div>
    </el-card>

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
          layout="total, sizes, prev, pager, next"
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
  gap: 16px;
  min-height: calc(100vh - 110px);
}

.filter-card :deep(.el-card__body) { padding: 16px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 12px; }
.filter-row .el-select { width: 190px; }
.search-input { width: min(360px, 100%); }

.content-grid {
  display: grid;
  grid-template-columns: minmax(340px, 430px) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
}

.user-panel,
.editor-panel { min-height: 620px; border: none; }
.panel-title { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.editor-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.actions { display: flex; gap: 8px; }

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
  padding-right: 4px;
}

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
.user-main { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.user-main span { color: var(--el-text-color-secondary); font-size: 13px; }
.user-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.pagination { justify-content: center; margin-top: 16px; }

.self-alert { margin-bottom: 16px; }
.user-descriptions { margin-bottom: 24px; }
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
  .filter-row > * { width: 100% !important; }
  .role-grid { grid-template-columns: 1fr; }
  .editor-header { align-items: flex-start; flex-direction: column; }
}
</style>
