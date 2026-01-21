<script setup>
import { ref } from 'vue'
import { UserFilled, Plus, ArrowRight, Lock, Folder, Document } from '@element-plus/icons-vue'
const treeRef = ref(null)
const isSaving = ref(false)

// 2. 告诉 el-tree 哪个字段是名字，哪个字段是子节点
const defaultProps = {
  children: 'children',
  label: 'label',
}
const roleList = ref([
  { id: 101, name: '超级管理员', code: 'admin', tagType: 'danger' },
  { id: 102, name: '指导教师', code: 'teacher', tagType: 'warning' },
  { id: 103, name: '普通学生', code: 'student', tagType: 'success' },
  { id: 104, name: '教务处', code: 'dean', tagType: 'info' },
  { id: 105, name: '访客', code: 'guest', tagType: 'info' },
])
const permissionData = [
  {
    id: 1,
    label: '系统管理',
    children: [
      { id: 11, label: '用户管理' },
      { id: 12, label: '角色管理' },
      { id: 13, label: '日志监控' },
      { id: 11, label: '用户管理' },
      { id: 12, label: '角色管理' },
      { id: 13, label: '日志监控' },
      { id: 11, label: '用户管理' },
      { id: 12, label: '角色管理' },
      { id: 13, label: '日志监控' },
      { id: 11, label: '用户管理' },
      { id: 12, label: '角色管理' },
      { id: 13, label: '日志监控' },
      { id: 11, label: '用户管理' },
      { id: 12, label: '角色管理' },
      { id: 13, label: '日志监控' },
    ],
  },
  {
    id: 2,
    label: '竞赛业务',
    children: [
      { id: 21, label: '发布竞赛' },
      { id: 22, label: '审核报名' },
      { id: 23, label: '成绩录入' },
      // 多搞点数据测试滚动
      { id: 24, label: '证书打印' },
      { id: 25, label: '历史归档' },
      { id: 26, label: '数据导出' },
    ],
  },
  {
    id: 3,
    label: '学生中心',
    children: [
      { id: 31, label: '我的竞赛' },
      { id: 32, label: '个人档案' },
    ],
  },
]
// 2. 定义当前选中的角色 (初始为空)
const currentRole = ref(null)

// 3. 点击事件处理
const handleRoleClick = (role) => {
  currentRole.value = role
}

function handleSaveClick(){
  
}
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
          v-for="role in roleList"
          :key="role.id"
          class="role-item"
          :class="{ 'is-active': currentRole?.id === role.id }"
          @click="handleRoleClick(role)"
        >
          <div class="role-info">
            <span class="role-name">{{ role.name }}</span>
            <el-tag size="small" :type="role.tagType" effect="plain">
              {{ role.code }}
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
              - 当前正在编辑：<span class="highlight">{{ currentRole.name }}</span>
            </span>
          </div>

          <el-button type="primary" size="small" :disabled="!currentRole" :loading="isSaving">
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
