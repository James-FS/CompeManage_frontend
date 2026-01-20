<script setup>
import Sidebar from '@/components/Sidebar.vue';
import Header from '@/components/Header.vue';
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { House, Trophy, DataAnalysis } from '@element-plus/icons-vue';

const userStore = useUserStore();

//定义完整的菜单结构(包含权限)
const allMenus = [
  {
    path: '/home',
    title: '首页',
    icon: House,
    roles: ['school_admin', 'college_admin', 'competition_manager', 'student']
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
        path: '/competition/add', 
        title: '添加赛事', 
        roles: ['school_admin', 'college_admin'] 
      },
      { 
        path: '/competition/register', 
        title: '赛事报名', 
        roles: ['student','competition_manager'] 
      },
      {
        path: '/competition/audit',
        title: '赛事审核',
        roles: ['school_admin']
      }
    ]
  }
];
// 计算过滤后的菜单项
const filterMenus = (menus, userRoles) => {
  return menus.filter(item => {
    // 检查是否有权限字段,没有则默认显示
    if(item.roles && !item.roles.includes(userRoles)){
      return false;
    }
    // 如果有子菜单，递归过滤子菜单
    if(item.children){
      item.children = filterMenus(item.children, userRoles);
      // 如果子菜单全部被过滤掉，则不显示父菜单
      return item.children.length > 0;
    }
    return true;
  });
};

// 根据用户角色计算可见菜单
const dynamicMenuItems = computed(() => {
  // 深拷贝，避免直接修改原数组
  const menusCopy = JSON.parse(JSON.stringify(allMenus));
  return filterMenus(menusCopy, userStore.role);
});
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


    .content {
      flex: 1;
      overflow-y: auto;
    }
  }
}
</style>