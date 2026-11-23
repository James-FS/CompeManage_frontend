<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { UserFilled, ArrowRight, Lock, Folder, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { getPermissionReference } from './referenceData'

const treeRef = ref(null)
const isSaving = ref(false)
const checkStrictly = ref(false)
const loadController = new AbortController()
const loadingPermissions = ref(true)

const defaultProps = {
  children: 'children',
  label: 'name',
}

const tagTypes = ['danger', 'warning', '', 'success', 'info']
const getTagTypeByIndex = (index) => {
  return tagTypes[index % tagTypes.length]
}
const roleList = ref([])
const permissionData = shallowRef(null)
const rootPermissionIds = computed(() => permissionData.value?.map(node => node.id) ?? [])
const currentRole = ref(null)

const handleRoleClick = (role) => {
  if (isSaving.value || currentRole.value?.id === role.id) return
  currentRole.value = role
}

watch([currentRole, permissionData], async ([role, permissions], _, onCleanup) => {
  if (!role || !permissions) return
  let obsolete = false
  onCleanup(() => { obsolete = true })
  checkStrictly.value = true
  await nextTick()
  if (obsolete || loadController.signal.aborted) return
  treeRef.value?.setCheckedKeys(role.permissions?.map(permission => permission.id) ?? [])
  checkStrictly.value = false
})

function listToTree(list) {
  const nodes = new Map(list.map(item => [item.id, { ...item, children: [] }]))
  const tree = []
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parent_id)
    if (parent) parent.children.push(node)
    else tree.push(node)
  }
  return tree
}

async function fetchRoles() {
  try {
    const response = await api.getRoleList(undefined, { signal: loadController.signal })
    if (!loadController.signal.aborted && response.code === 200) {
      roleList.value = response.data ?? []
    }
  } catch (error) {
    if (!loadController.signal.aborted && !error.messageShown) ElMessage.error(error.message || '获取角色失败')
  }
}

async function fetchPermissions() {
  try {
    const response = await getPermissionReference('permissions', api.getPermissionList)
    if (!loadController.signal.aborted && response.code === 200) {
      permissionData.value = listToTree(response.data ?? [])
    }
  } catch (error) {
    if (!loadController.signal.aborted && !error.messageShown) ElMessage.error(error.message || '获取权限失败')
  } finally {
    loadingPermissions.value = false
  }
}

async function handleSaveClick() {
  const role = currentRole.value
  if (!role || !treeRef.value || checkStrictly.value || isSaving.value) return

  isSaving.value = true
  try {
    const checkedKeys = treeRef.value.getCheckedKeys()
    const halfCheckedKeys = treeRef.value.getHalfCheckedKeys()
    const finalPermIds = [...new Set([...checkedKeys, ...halfCheckedKeys])]

    const res = await api.assignPermissions({
      role_id: role.id,
      perm_ids: finalPermIds,
    })

    if (res.code === 200 && !loadController.signal.aborted) {
      role.permissions = finalPermIds.map(id => ({ id }))
      if (res.data?.cache_refreshed === false) {
        if (res.data?.manual_follow_up_required) {
          const ttlSeconds = res.data?.cache_ttl_seconds || 300
          ElMessage.warning(`权限已保存，但部分缓存刷新和重试入队失败；旧权限最迟约 ${Math.ceil(ttlSeconds / 60)} 分钟后失效`)
        } else {
          ElMessage.warning('权限已保存，部分用户缓存正在后台重试刷新')
        }
      } else {
        ElMessage.success('权限分配成功')
      }
    }
  } catch (error) {
    if (!loadController.signal.aborted && !error.messageShown) ElMessage.error(error.message || '保存失败')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  void fetchRoles()
  void fetchPermissions()
})
onBeforeUnmount(() => loadController.abort())
</script>

<template>
  <div class="rbac-container">
    <el-card class="role-panel" shadow="hover">
      <template #header>
        <div class="panel-header">
          <div class="title-group">
            <el-icon class="header-icon"><UserFilled /></el-icon>
            <span>角色管理</span>
          </div>
        </div>
      </template>

      <div class="scroll-content role-list">
        <div
          v-for="(role, index) in roleList"
          :key="role.id"
          class="role-item"
          :class="{ 'is-active': currentRole?.id === role.id }"
          @click="handleRoleClick(role)"
        >
          <div class="role-info">
            <span class="role-name">{{ role.role_name }}</span>
            <el-tag size="small" :type="getTagTypeByIndex(index)" effect="plain">
              {{ role.role_code }}
            </el-tag>
          </div>
          <el-icon v-if="currentRole?.id === role.id" class="arrow-icon">
            <ArrowRight />
          </el-icon>
        </div>
      </div>
    </el-card>

    <el-card class="permission-panel" shadow="hover">
      <template #header>
        <div class="panel-header">
          <div class="title-group">
            <el-icon class="header-icon"><Lock /></el-icon>
            <span>权限配置</span>

            <span v-if="currentRole" class="current-role-tip">
              - 当前正在编辑：<span class="highlight">{{ currentRole.role_name }}</span>
            </span>
          </div>

          <el-button
            type="primary"
            size="small"
            :disabled="!treeRef || checkStrictly"
            :loading="isSaving"
            @click="handleSaveClick"
          >
            保存
          </el-button>
        </div>
      </template>

      <div class="scroll-content tree-wrapper" v-loading="loadingPermissions && !!currentRole">
        <el-empty v-if="!currentRole" description="请选择一个角色" :image-size="100" />
        <el-empty v-else-if="!loadingPermissions && !permissionData" description="权限数据加载失败" :image-size="100" />

        <el-tree
          v-else-if="permissionData"
          ref="treeRef"
          :data="permissionData"
          show-checkbox
          node-key="id" 
          :default-expanded-keys="rootPermissionIds"
          :props="defaultProps"
          :check-strictly="checkStrictly"
          class="custom-tree"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <el-icon v-if="data.children.length" class="node-icon"><Folder /></el-icon>
              <el-icon v-else class="node-icon"><Document /></el-icon>
              <span>{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.rbac-container {
  display: flex;
  gap: 15px;
  height: calc(100vh - 110px);
  /* 与赛事目录/用户管理等页面统一：四周留白 + 页面底色 */
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--background-color);
}

.role-panel {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  /* 与其他页面内容卡一致的阴影和圆角 */
  box-shadow: var(--card-shadow);
  border-radius: var(--card-radius);
}

:deep(.el-card__body) {
  flex: 1; 
  overflow: hidden; 
  padding: 0; 
  display: flex; 
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    color: var(--text-primary);
  }
}

.scroll-content {
  flex: 1; 
  overflow-y: auto; 
  padding: var(--container-padding);
}

.role-list {
  padding: 15px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: var(--card-radius);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent; 
}

.role-item:hover {
  background-color: var(--background-color);
}

.role-item.is-active {
  background-color: #ecf5ff; 
  border-color: #d9ecff;
}

.role-item.is-active .role-name {
  color: #409eff; 
  font-weight: bold;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.permission-panel {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  /* 与其他页面内容卡一致的阴影和圆角 */
  box-shadow: var(--card-shadow);
  border-radius: var(--card-radius);

  .scroll-content {
    flex: 1;
    overflow-y: auto; 
    padding: 20px;
  }
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--primary-font);

  .node-icon {
    color: var(--text-secondary); 
  }
}

.current-role-tip {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: normal;
  margin-left: 10px;
}

.highlight {
  color: #409eff;
  font-weight: bold;
}
</style>
