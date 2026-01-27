<script setup>
import Sidebar from '@/components/Sidebar.vue';
import Header from '@/components/Header.vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { House, Trophy, ArrowRight,EditPen, Key } from '@element-plus/icons-vue';

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

//定义完整的菜单结构(包含权限)
const allMenus = [
  {
    path: '/home',
    title: '首页',
    icon: House,
    roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
  },
  {
    path: '/competition',
    title: '赛事管理',
    icon: Trophy,
    // 只要有任意子菜单权限，就显示父菜单
    roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
    children: [
      { 
        path: '/competition/list', 
        title: '赛事目录', 
        roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] 
      },
      {
        path: '/competition/audit',
        title: userStore.role === 'school_admin' ? '赛事审核' : '赛事申报',
        roles: ['school_admin', 'college_admin']
      },
      {
        path: '/competition/declare',
        title: '新增申报',
        roles: ['college_admin']
      },
      {
        path: '/competition/audit',
        title: '赛事审核',
        roles: ['school_admin', 'college_admin']
      },
      
    ],
  },
  {
    path: '/register',
    title: '报名管理',
    icon: EditPen,
    roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
    children: [
      {
        path: '/register',
        title: '赛事报名',
        roles: ['school_admin', 'college_admin', 'student', 'competition_manager'],
      },
      {
        path: '/register/edit',
        title: '报名设置',
        roles: ['school_admin', 'college_admin', 'competition_manager'],
      },
      {
        path: '/register/audit',
        title: '报名审核',
        roles: ['school_admin', 'college_admin', 'competition_manager'],
      }
    ],
  },
  {
    path: '/permission',
    title: '权限管理',
    icon: Key,
    roles: ['school_admin'],
  },
]
// 深拷贝菜单但保留icon组件引用
const deepCloneMenus = (menus) => {
  return menus.map((item) => ({
    ...item,
    children: item.children ? deepCloneMenus(item.children) : undefined,
  }))
}

// 计算过滤后的菜单项
const filterMenus = (menus, userRoles) => {
  return menus.filter((item) => {
    // 检查是否有权限字段,没有则默认显示
    if (item.roles && !item.roles.includes(userRoles)) {
      return false
    }
    // 如果有子菜单，递归过滤子菜单
    if (item.children) {
      item.children = filterMenus(item.children, userRoles)
      // 如果子菜单全部被过滤掉，则不显示父菜单
      return item.children.length > 0
    }
    return true
  })
}

// 根据用户角色计算可见菜单
const dynamicMenuItems = computed(() => {
  // 深拷贝菜单数据（保留icon组件引用），避免直接修改原数组
  const menusCopy = deepCloneMenus(allMenus);
  return filterMenus(menusCopy, userStore.role);
});

// 面包屑计算
const breadcrumbs = computed(() => {
  // 1. 获取当前路由匹配到的所有嵌套路径（过滤掉没有 title 的）
  let matched = route.matched.filter(item => item.meta && item.meta.title);
  
  // 2. 处理父级插入逻辑
  const currentRouteMeta = route.meta;
  if (currentRouteMeta && currentRouteMeta.parent) {
    const parentRoute = router.getRoutes().find(r => r.name === currentRouteMeta.parent);
    if (parentRoute) {
      const last = matched.pop();
      matched.push(parentRoute); // 插入父级路由
      matched.push(last);        // 放回当前路由
    }
  }
  return matched;
});

// 处理点击跳转
const handleLink = (item) => {
  const { redirect, path } = item;
  // 如果配置了 noRedirect，则不跳转
  if (redirect === 'noRedirect' || item.meta?.redirect === 'noRedirect') {
    return;
  }
  router.push(path);
}

// 获取面包屑项的显示标题
const getBreadcrumbTitle = (item) => {
  // 如果是 CompetitionAudit 路由，根据角色显示不同的标题
  if (item.name === 'CompetitionAudit') {
    return userStore.role === 'school_admin' ? '赛事审核' : '赛事申报';
  }
  // 默认显示 meta.title
  return item.meta.title;
}
</script>

<template>
  <Header />
  <div class="main-layout">
    <!-- 侧边导航栏 -->
    <aside class="sidebar">
      <Sidebar :menu-items="dynamicMenuItems" />
    </aside>

    <!-- 主内容区 -->
    <div class="main-content">
      <div class="breadcrumb-container">
        <el-breadcrumb :separator-icon="ArrowRight">
          <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
            <span 
              v-if="index === breadcrumbs.length - 1 || item.meta.redirect === 'noRedirect'" 
              class="no-redirect">
              {{ getBreadcrumbTitle(item) }}
            </span>
            <a v-else @click.prevent="handleLink(item)" class="redirect">
              {{ getBreadcrumbTitle(item) }}
            </a>
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 页面内容 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.main-layout {
  display: flex;
  height: calc(100vh - 60px);
  width: 100%;

  .sidebar {
    width: auto;
    height: 100%;
    z-index: 1;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--background-color);


    .breadcrumb-container {
      padding: 15px 20px;
      background: #fff;
      border-bottom: 1px solid #e4e7ed;
      flex-shrink: 0;

      :deep(.el-breadcrumb) {
        font-size: 14px;
        line-height: 1;
      }

      /* 纯文本样式 */
      .no-redirect {
        color: #4f5660;
        cursor: text;
      }
      
      /* 链接样式 */
      .redirect {
        font-weight: 600;
        cursor: pointer;
        transition: color 0.2s;
        &:hover {
          color: var(--el-color-primary);
        }
      }
    }


    .content {
      flex: 1;
      overflow-y: auto;
    }
  }
}
</style>
