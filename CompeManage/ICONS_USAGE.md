# CompeManage 项目图标配置使用说明

## 📋 项目图标配置现状

本项目已采用 **按需导入** 方式集成 Element Plus 图标库，确保最优的性能表现。

### 当前配置信息
- **Element Plus 版本**：2.13.1
- **Element Plus Icons 版本**：2.3.2
- **导入方式**：按需导入（在各组件中单独引入）
- **打包策略**：仅打包实际使用的图标

---

## 🚀 快速开始

### 第一步：在组件中导入需要的图标

```vue
<script setup>
// 从 @element-plus/icons-vue 导入所需的图标
import { House, Trophy, Plus, Delete } from '@element-plus/icons-vue'
</script>
```

### 第二步：在模板中使用图标

```vue
<template>
  <!-- 方式 1：直接使用 -->
  <el-icon><House /></el-icon>

  <!-- 方式 2：在按钮中使用 -->
  <el-button>
    <el-icon><Plus /></el-icon>
    添加
  </el-button>

  <!-- 方式 3：作为输入框前缀图标 -->
  <el-input placeholder="搜索">
    <template #prefix>
      <el-icon><Search /></el-icon>
    </template>
  </el-input>
</template>
```

---

## 📝 实际使用示例

### 示例 1：为竞赛列表页面添加操作按钮

```vue
<!-- views/competition/list.vue -->
<script setup>
import { Edit, Delete, Plus, Search } from '@element-plus/icons-vue'
</script>

<template>
  <div class="competition-list">
    <!-- 搜索和新增 -->
    <el-row class="toolbar" :gutter="10">
      <el-col :span="18">
        <el-input placeholder="搜索竞赛">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </el-col>
      <el-col :span="6">
        <el-button type="primary">
          <el-icon><Plus /></el-icon>
          新增竞赛
        </el-button>
      </el-col>
    </el-row>

    <!-- 表格操作列 -->
    <el-table :data="competitionList">
      <el-table-column prop="name" label="竞赛名称" />
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button 
            type="primary" 
            size="small" 
            link
            @click="handleEdit(row)"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            link
            @click="handleDelete(row)"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
```

### 示例 2：为添加竞赛页面添加图标

```vue
<!-- views/competition/add.vue -->
<script setup>
import { Plus, Back, Save } from '@element-plus/icons-vue'
</script>

<template>
  <div class="competition-add">
    <!-- 返回按钮 -->
    <el-button @click="goBack">
      <el-icon><Back /></el-icon>
      返回列表
    </el-button>

    <!-- 表单 -->
    <el-form>
      <el-form-item label="竞赛名称">
        <el-input placeholder="输入竞赛名称" />
      </el-form-item>
    </el-form>

    <!-- 提交按钮 -->
    <el-button type="primary">
      <el-icon><Save /></el-icon>
      保存
    </el-button>
  </div>
</template>
```

---

## ⚙️ 如何添加新图标

### 步骤 1：查找图标
访问 [Element Plus 图标库](https://icon.element-plus.org/) 找到需要的图标

### 步骤 2：复制图标名称
例如：`Search`、`Delete`、`Download` 等

### 步骤 3：在组件中导入
```vue
<script setup>
import { YourIconName } from '@element-plus/icons-vue'
</script>
```

### 步骤 4：在模板中使用
```vue
<template>
  <el-icon><YourIconName /></el-icon>
</template>
```


---

## 🔧 常见问题

### Q1：图标显示不出来怎么办？
**A：** 检查以下几点：
1. 确认图标名称拼写正确
2. 确认已从 `@element-plus/icons-vue` 导入
3. 确认用 `<el-icon>` 组件包裹
4. 确认 main.js 中已导入 Element Plus 样式

### Q2：如何知道有哪些图标可用？
**A：** 访问 [Element Plus 官方图标库](https://icon.element-plus.org/)

### Q3：可以改变图标的颜色和大小吗？
**A：** 可以，通过 CSS 或 el-icon 的属性：

```vue
<el-icon color="red" size="large"><House /></el-icon>

<!-- 或使用 CSS -->
<style scoped>
.el-icon {
  color: red;
  font-size: 24px;
}
</style>
```

### Q4：需要在其他项目中复用这个配置吗？
**A：** 可以参考本项目的配置方式，复制相同的导入模式到新组件即可。

---

## 📚 相关资源

- [Element Plus 官方文档](https://element-plus.org/)
- [Element Plus 图标库](https://icon.element-plus.org/)
- [Vue 3 官方文档](https://vuejs.org/)

---