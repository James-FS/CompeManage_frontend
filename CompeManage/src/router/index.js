import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyLayout from '@/layouts/EmptyLayout.vue'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  //需要侧边导航栏的页面
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home.vue'),
        meta: {
          title: '首页',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
    ],
  },
  {
    path: '/competition',
    component: MainLayout,
    children: [
      {
        path: 'list',
        name: 'CompetitionList',
        component: () => import('@/views/competition/list.vue'),
        meta: {
          title: '赛事目录',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'competition/add',
        name: 'CompetitionAdd',
        component: () => import('@/views/competition/add.vue'),
        meta: { title: '新增赛事', roles: ['school_admin', 'college_admin'] },
      },
      
    ],
  },
  {
    path: '/register',
    component: MainLayout,
    children: [
        {
        path: '/register',
        name: 'CompetitionRegister',
        component: () => import('@/views/register/register.vue'),
        meta: {
          title: '赛事报名',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: '/register/detail/:id',
        name: 'detail',
        component: () => import('@/views/register/registerDetail.vue'),
        props: true,
      },
      {
        path: '/register/edit',
        name: 'register-edit',
        component: () => import('@/views/register/edit.vue'),
      },
      {
        path: '/register/edit/:id',
        name: 'edit-detail',
        component: () => import('@/views/register/editDetail.vue'),
        props: true,
      },
      {
        path: '/register/audit',
        name: 'register-audit',
        component: () => import('@/views/register/audit.vue'),
      },
      {
        path:'/register/audit/detail/:id',
        name:'audit-detail',
        component: () => import('@/views/register/auditDetail.vue'),
        props: true,
      }
    ],
  },
  {
    path: '/permission',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'permission',
        component: () => import('@/views/permission/permission.vue'),
        meta: { title: '权限管理' },
      },
    ],
  },
  //不需要侧边导航栏的页面
  {
    path: '/',
    component: EmptyLayout,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/login.vue'),
        meta: {
          title: '登录',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'notice',
        name: 'Notice',
        component: () => import('@/views/notice/notice.vue'),
        meta: {
          title: '通知',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'notice/list',
        name: 'NoticeList',
        component: () => import('@/views/notice/list.vue'),
        meta: {
          title: '通知列表',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'notice/detail/:id',
        name: 'NoticeDetail',
        component: () => import('@/views/notice/detail.vue'),
        props: true,
        meta: {
          title: '通知详情',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'notice/edit/:id',
        name: 'NoticeEdit',
        component: () => import('@/views/notice/edit.vue'),
        props: true,
        meta: {
          title: '编辑通知',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 设置页面标题
  document.title = to.meta.title || '学科竞赛管理系统'

  // 白名单页面放行
  if (to.path === '/login') {
    next()
    return
  }

  // 检查是否登录
  const token = localStorage.getItem('token')
  if (!token) {
    next('/login')
    return
  }

  // 恢复store状态(页面刷新)
  if (!userStore.token) {
    userStore.restoreState()
  }

  // 检查角色权限
  const allowedRoles = to.meta.roles
  if (allowedRoles) {
    if (allowedRoles.includes(userStore.role)) {
      next()
    } else {
      // 无权限，跳转首页或显示错误页面
      alert('无权访问该页面')
      next(from.path)
    }
  } else {
    // 没有设置roles，默认允许访问
    next()
  }
})
export default router
