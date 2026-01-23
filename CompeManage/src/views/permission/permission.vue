<script setup>
import { onMounted, ref, nextTick } from 'vue'
import { UserFilled, Plus, ArrowRight, Lock, Folder, Document } from '@element-plus/icons-vue'
import api from '@/api'
const treeRef = ref(null)
const isSaving = ref(false)
const checkStrictly = ref(false)
// 告诉 el-tree 哪个字段是名字，哪个字段是子节点
const defaultProps = {
  children: 'children',
  label: 'Name',
}
const tagTypes = ['danger', 'warning', '', 'success', 'info']
const getTagTypeByIndex = (index) => {
  return tagTypes[index % tagTypes.length]
}
const roleList = ref([])
const permissionData = ref([])
const currentRole = ref(null) // 定义当前选中的角色 (初始为空)

const handleRoleClick = (role) => {
  currentRole.value = role
  // 从当前点击的角色对象中提取拥有的权限 ID 列表
  const rolePermIds = role.Permissions ? role.Permissions.map((p) => p.ID) : []
  // 切断父子关联
  checkStrictly.value = true

  nextTick(() => {
    if (treeRef.value) {
      treeRef.value.setCheckedKeys(rolePermIds)
      // 恢复关联，方便用户手动操作
      checkStrictly.value = false
    }
  })
}

/**
 * 扁平数组转树形结构
 * @param {Array} list  后端返回的扁平数组
 * @param {String} idKey ID字段名 (你的后端是 "ID")
 * @param {String} pidKey 父ID字段名 (你的后端是 "ParentID")
 */
function listToTree(list, idKey = 'ID', pidKey = 'ParentID') {
  const map = {}
  const tree = []

  list.forEach((item) => {
    item.children = []
    map[item[idKey]] = item
  })

  // 2. 再次遍历，将元素放入父节点的 children 中
  list.forEach((item) => {
    const parentId = item[pidKey]

    // 如果 ParentID 不为 0 且 Map 中能找到父亲
    if (parentId && parentId !== 0 && map[parentId]) {
      map[parentId].children.push(item)
    } else {
      // 否则，它就是根节点
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
    // getCheckedKeys() 拿到底层叶子节点
    // getHalfCheckedKeys() 拿到半选的父节点 (目录)
    const checkedKeys = treeRef.value.getCheckedKeys()
    const halfCheckedKeys = treeRef.value.getHalfCheckedKeys()
    const finalPermIds = [...checkedKeys, ...halfCheckedKeys]

    const res = await api.assignPermissions({
      role_id: currentRole.value.ID, // 注意大小写 ID
      perm_ids: finalPermIds,
    })

    if (res.code === 200) {
      ElMessage.success('权限分配成功')
      await fetchRoles()
      // currentRole.value = roleList.value.find(r => r.ID === currentRole.value.ID)
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
          <!-- <el-button type="primary" link icon="Plus" size="small">新建</el-button> -->
        </div>
      </template>

      <div class="scroll-content role-list">
        <div
          v-for="(role, index) in roleList"
          :key="role.ID"
          class="role-item"
          :class="{ 'is-active': currentRole?.ID === role.ID }"
          @click="handleRoleClick(role)"
        >
          <div class="role-info">
            <span class="role-name">{{ role.RoleName }}</span>
            <el-tag size="small" :type="getTagTypeByIndex(index)" effect="plain">
              {{ role.RoleCode }}
            </el-tag>
          </div>
          <el-icon v-if="currentRole?.ID === role.ID" class="arrow-icon">
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
              - 当前正在编辑：<span class="highlight">{{ currentRole.RoleName }}</span>
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
          node-key="ID"
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
.rbac-container {
  display: flex;
  gap: 16px;
  height: calc(100vh - 60px);
}
.role-panel {
  width: 300px;
  height: 100%; /* 依赖父级的高度 */
  display: flex;
  flex-direction: column;
  border: none;
}

:deep(.el-card__body) {
  flex: 1; /* 占据剩余空间 */
  overflow: hidden; /* 隐藏 body 自身的溢出 */
  padding: 0; /* 去掉默认 padding，让滚动条贴边 */
  display: flex; /* 让内部元素可以使用 flex 布局 */
  flex-direction: column;
}

/* 3. 头部美化 */
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

/* 4. 滚动区域样式 */
.scroll-content {
  flex: 1; /* 撑满 body */
  overflow-y: auto; /* 超出垂直方向自动显示滚动条 */
  padding: 15px;
}

/* 5. 列表项交互样式 */
.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent; /* 预留边框位置防止抖动 */
}

/* 鼠标悬停 */
.role-item:hover {
  background-color: #f5f7fa;
}

/* 选中状态 (高亮) */
.role-item.is-active {
  background-color: #ecf5ff; /* 浅蓝背景 */
  border-color: #d9ecff;
}

.role-item.is-active .role-name {
  color: #409eff; /* 蓝色字体 */
  font-weight: bold;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.permission-panel {
  flex: 1; /* 自动撑满剩余宽度 */
  height: 100%; /* 高度跟随父容器 */
  display: flex;
  flex-direction: column;
  border: none;
  .scroll-content {
    flex: 1;
    overflow-y: auto; /* 开启滚动 */
    padding: 20px;
  }
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  .node-icon {
    color: #909399; /* 灰色图标 */
  }
}

/* 5. 顶部提示文字 */
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
