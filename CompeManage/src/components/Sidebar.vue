<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  House,
  Trophy,
  DataAnalysis,
  Expand,
  Fold
} from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

// Props 定义 - 使组件更加灵活和可配置
const props = defineProps({
  // 菜单项配置，支持从父组件传入
  menuItems: {
    type: Array,
    default: () => [
      {
        path: '/home',
        title: '首页',
        icon: House
      },
      {
        path: '/competition',
        title: '竞赛管理',
        icon: Trophy,
        children: [
          { path: '/competition/list', title: '竞赛列表' },
          { path: '/competition/add', title: '添加竞赛' },
          {path:'/competition/register',title:'赛事报名'},
          {path:'/competition/edit',title:'编辑赛事' }
        ]
      },
      {
        path: '/statistics',
        title: '数据统计',
        icon: DataAnalysis
      }
    ]
  },
  // 默认折叠状态
  defaultCollapse: {
    type: Boolean,
    default: false
  },
  // 自定义背景色
  backgroundColor: {
    type: String,
    default: '#545c64'
  },
  // 自定义文字颜色
  textColor: {
    type: String,
    default: '#fff'
  },
  // 自定义激活文字颜色
  activeTextColor: {
    type: String,
    default: '#ffd04b'
  },
  // 是否显示折叠按钮
  showCollapseButton: {
    type: Boolean,
    default: true
  }
});

// Emits 定义 - 向父组件发送事件
const emit = defineEmits(['select', 'collapse-change', 'menu-open', 'menu-close']);

// 是否折叠
const isCollapse = ref(props.defaultCollapse);

// 切换折叠状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
  // 向父组件发送折叠状态变化事件
  emit('collapse-change', isCollapse.value);
};

// 当前激活的菜单
const activeMenu = ref(route.path);

// 监听路由变化，自动更新激活菜单
watch(() => route.path, (newPath) => {
  activeMenu.value = newPath;
}, { immediate: true });

// 菜单点击事件
const handleMenuSelect = (path) => {
  router.push(path);
  // 向父组件发送选择事件
  emit('select', path);
};

// 菜单展开事件
const handleMenuOpen = (index, indexPath) => {
  emit('menu-open', index, indexPath);
};

// 菜单关闭事件
const handleMenuClose = (index, indexPath) => {
  emit('menu-close', index, indexPath);
};

// 计算侧边栏宽度
const sidebarWidth = computed(() => {
  return isCollapse.value ? '64px' : '220px';
});
</script>

<template>
  <div class="sidebar-container" :style="{ width: sidebarWidth }">
    <!-- 导航菜单 -->
    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapse"
      :background-color="backgroundColor"
      :text-color="textColor"
      :active-text-color="activeTextColor"
      class="sidebar-menu"
      @select="handleMenuSelect"
      @open="handleMenuOpen"
      @close="handleMenuClose"
    >
      <template v-for="item in menuItems" :key="item.path">
        <!-- 有子菜单 -->
        <el-sub-menu v-if="item.children" :index="item.path">
          <template #title>
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </template>
          <el-menu-item
            v-for="child in item.children"
            :key="child.path"
            :index="child.path"
          >
            {{ child.title }}
          </el-menu-item>
        </el-sub-menu>

        <!-- 无子菜单 -->
        <el-menu-item v-else :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </template>
    </el-menu>

    <!-- 折叠按钮 -->
    <div v-if="showCollapseButton" class="sidebar-footer">
      <el-button
        circle
        size="small"
        @click="toggleCollapse"
      >
        <el-icon>
          <component :is="isCollapse ? Expand : Fold" />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: v-bind(backgroundColor);
  transition: width 0.3s ease;
  overflow: hidden;

  .sidebar-menu {
    flex: 1;
    border-right: none;
    overflow-y: auto;
    overflow-x: hidden;
    
    // 隐藏滚动条但保持功能
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }

  .sidebar-footer {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px 0;
    
    .el-button {
      transition: all 0.3s ease;
      
      &:hover {
        transform: scale(1.1);
      }
    }
  }
}
</style>