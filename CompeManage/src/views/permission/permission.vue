<script setup>
import { onMounted, ref, nextTick } from 'vue'
import { UserFilled, Plus, ArrowRight, Lock, Folder, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const treeRef = ref(null)
const isSaving = ref(false)
const checkStrictly = ref(false)

// ✨ 修改 1: label 对应后端返回的 'name'
const defaultProps = {
  children: 'children',
  label: 'name',
}

const tagTypes = ['danger', 'warning', '', 'success', 'info']
const getTagTypeByIndex = (index) => {
  return tagTypes[index % tagTypes.length]
}
const roleList = ref([])
const permissionData = ref([])
const currentRole = ref(null) 

const handleRoleClick = (role) => {
  currentRole.value = role
  // ✨ 修改 2: role.Permissions -> role.permissions, p.ID -> p.id
  const rolePermIds = role.permissions ? role.permissions.map((p) => p.id) : []
  
  checkStrictly.value = true
  nextTick(() => {
    if (treeRef.value) {
      treeRef.value.setCheckedKeys(rolePermIds)
      checkStrictly.value = false
    }
  })
}

/**
 * 扁平数组转树形结构
 * ✨ 修改 3: 默认 key 改为 id 和 parent_id
 */
function listToTree(list, idKey = 'id', pidKey = 'parent_id') {
  const map = {}
  const tree = []

  list.forEach((item) => {
    item.children = []
    map[item[idKey]] = item
  })

  list.forEach((item) => {
    const parentId = item[pidKey]
    if (parentId && parentId !== 0 && map[parentId]) {
      map[parentId].children.push(item)
    } else {
      tree.push(item)
    }
  })

  return tree
}

async function fetchRoles() {
  try {
    const response = await api.getRoleList()
    if (response.code === 200) {
      roleList.value = response.data
    }
  } catch (error) {
    ElMessage.error(error.message || '获取失败')
  }
}

async function fetchPermissions() {
  try {
    const response = await api.getPermissionList()
    if (response.code === 200) {
      permissionData.value = listToTree(response.data)
    }
  } catch (error) {
    ElMessage.error(error.message || '获取失败')
  }
}

async function handleSaveClick() {
  if (!currentRole.value) return

  isSaving.value = true
  try {
    const checkedKeys = treeRef.value.getCheckedKeys()
    const halfCheckedKeys = treeRef.value.getHalfCheckedKeys()
    const finalPermIds = [...checkedKeys, ...halfCheckedKeys]

    const res = await api.assignPermissions({
      // ✨ 修改 4: ID -> id
      role_id: currentRole.value.id, 
      perm_ids: finalPermIds,
    })

    if (res.code === 200) {
      ElMessage.success('权限分配成功')
      await fetchRoles()
    }
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
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
            :disabled="!currentRole"
            :loading="isSaving"
            @click="handleSaveClick"
          >
            保存
          </el-button>
        </div>
      </template>

      <div class="scroll-content tree-wrapper">
        <el-empty v-if="!currentRole" description="请选择一个角色" :image-size="100" />

        <el-tree
          v-else
          ref="treeRef"
          :data="permissionData"
          show-checkbox
          node-key="id" 
          default-expand-all
          :props="defaultProps"
          :check-strictly="checkStrictly"
          class="custom-tree"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <el-icon v-if="data.children" class="node-icon"><Folder /></el-icon>
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
/* 样式保持不变 */
.rbac-container {
  display: flex;
  gap: 16px;
  height: calc(100vh - 60px);
}
.role-panel {
  width: 300px;
  height: 100%; 
  display: flex;
  flex-direction: column;
  border: none;
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
  padding: 15px;
}
.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent; 
}
.role-item:hover {
  background-color: #f5f7fa;
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
  font-size: 14px;
  .node-icon {
    color: #909399; 
  }
}
.current-role-tip {
  font-size: 13px;
  color: #909399;
  font-weight: normal;
  margin-left: 10px;
}
.highlight {
  color: #409eff;
  font-weight: bold;
}
</style>