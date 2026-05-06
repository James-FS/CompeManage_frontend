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
        path: 'add',
        name: 'CompetitionAdd',
        component: () => import('@/views/competition/add.vue'),

        meta: {
          title: '新增赛事',
          roles: ['school_admin'],
          parent: 'CompetitionList',
          activeMenu: '/competition/list',
        },
      },
      {
        path: 'edit/:id',
        name: 'CompetitionEdit',
        component: () => import('@/views/competition/edit.vue'),
        props: true,
        meta: {
          title: '编辑赛事',
          roles: ['school_admin'],
          parent: 'CompetitionList',
          activeMenu: '/competition/list',
        }
      },
      {
        path: 'audit',
        name: 'CompetitionAudit',
        component: () => import('@/views/competition/audit.vue'),
        meta: {
          title: '赛事审核',
          roles: ['school_admin', 'college_admin'],
          isDynamic: true,
          // 分别定义校级和院级的标题
          schoolTitle: '赛事审核',
          collegeTitle: '赛事申报',
        },
      },
      {
        path: 'declare',
        name: 'CompetitionDeclare',
        component: () => import('@/views/competition/declare.vue'),
        meta: {
          title: '新增申报',
          roles: ['college_admin', 'school_admin'],
          parent: 'CompetitionAudit',
          activeMenu: '/competition/audit',
        },
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
        meta: {
          title: '报名详情',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
          parent: 'CompetitionRegister',
        },
        props: true,
      },
      {
        path: '/register/edit',
        name: 'register-edit',
        component: () => import('@/views/register/edit.vue'),
        meta: {
          title: '报名设置',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: '/register/edit/:id',
        name: 'edit-detail',
        component: () => import('@/views/register/editDetail.vue'),
        meta: {
          title: '设置详情',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
          parent: 'register-edit',
        },
        props: true,
      },
      {
        path: '/register/audit',
        name: 'register-audit',
        meta: {
          title: '报名审核',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
        },
        component: () => import('@/views/register/audit.vue'),
      },
      {
        path: '/register/work-audit',
        name: 'register-work-audit',
        component: () => import('@/views/register/workAudit.vue'),
        meta: {
          title: '作品审核',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
        },
      },
      {
        path: '/register/work-audit/comp/:id',
        name: 'work-audit-comp-detail',
        component: () => import('@/views/register/workAuditCompDetail.vue'),
        meta: {
          title: '作品列表',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
          parent: 'register-work-audit',
          activeMenu: '/register/work-audit',
        },
        props: true,
      },
      {
        path: '/register/work-audit/detail/:id',
        name: 'work-audit-detail',
        component: () => import('@/views/register/workAuditDetail.vue'),
        meta: {
          title: '作品详情',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
          parent: 'work-audit-comp-detail',
          activeMenu: '/register/work-audit',
        },
        props: true,
      },
      {
        path: '/register/audit/detail/:id',
        name: 'audit-detail',
        meta: {
          title: '审核详情',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
          parent: 'register-audit',
        },
        component: () => import('@/views/register/auditDetail.vue'),
        props: true,
      },
      {
        path: '/register/work',
        name: 'register-work',
        component: () => import('@/views/register/work.vue'),
        meta: {
          title: '作品提交',
          roles: ['student'],
        },
      },
      {
        path: '/register/work/detail/:id',
        name: 'work-detail',
        component: () => import('@/views/register/workDetail.vue'),
        meta: {
          title: '作品详情',
          roles: ['student'],
          parent: 'register-work',
          activeMenu: '/register/work',
        },
        props: true,
      },
    ],
  },
  {
    path: '/award',
    component: MainLayout,
    children: [
      {
        path: 'list',
        name: 'AwardList',
        component: () => import('@/views/award/list.vue'),
        meta: {
          title: '获奖填报',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'detail/:id',
        name: 'AwardDetail',
        component: () => import('@/views/award/detail.vue'),
        meta: {
          title: '获奖详情',
          parent: 'AwardList',
          activeMenu: '/award/list',
        },
      },
      {
        path: 'import/:id',
        name: 'AwardImport',
        component: () => import('@/views/award/import.vue'),
        meta: {
          title: '导入获奖名单',
          parent: 'AwardDetail',
          activeMenu: '/award/list',
        },
      },
      {
        path: 'student',
        name: 'AwardStudent',
        component: () => import('@/views/award/student.vue'),
        meta: {
          title: '我的竞赛',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'student/declare',
        name: 'AwardStudentDeclare',
        component: () => import('@/views/award/studentDeclare.vue'),
        meta: {
          title: '学生申报',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
      {
        path: 'audit',
        name: 'AwardAudit',
        component: () => import('@/views/award/audit.vue'),
        meta: {
          title: '填报审核',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
        },
      },
      {
        path: 'audit/detail/:id',
        name: 'AwardAuditDetail',
        component: () => import('@/views/award/auditDetail.vue'),
        props: true,
        meta: {
          title: '审核详情',
          parent: 'AwardAudit',
        },
      },
    ],
  },
  {
    path: '/summary',
    component: MainLayout,
    children: [
      {
        path: 'summary-list',
        name: 'SummaryList',
        component: () => import('@/views/summary/summaryList.vue'),
        meta: {
          title: '赛事总结', // 这会在侧边栏显示
          roles: ['school_admin', 'college_admin', 'competition_manager'],
        },
      },
      {
        path: 'summary/edit/:id',
        name: 'SummaryEdit',
        component: () => import('@/views/summary/summaryEdit.vue'),
        props: true,
        meta: {
          title: '填写总结',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
          parent: 'SummaryList', // 面包屑导航用
          activeMenu: '/summary', // 保持侧边栏高亮
          hidden: true // 不在侧边栏显示，只作为详情页
        }
      },
      {
        path: 'summary/view/:id',
        name: 'SummaryView',
        component: () => import('@/views/summary/summaryView.vue'),
        props: true,
        meta: {
          title: '查看总结',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
          parent: 'SummaryList', // 面包屑导航用
          activeMenu: '/summary', // 保持侧边栏高亮
          hidden: true // 不在侧边栏显示，只作为详情页
        }
      }
    ]
  },
  {
    path: '/statistics',
    component: MainLayout,
    children: [
      {
        path: 'dashboard',
        name: 'StatisticsDashboard',
        component: () => import('@/views/statistics/dashboard.vue'),
        meta: {
          title: '数据汇总',
          roles: ['school_admin', 'college_admin'], // 仅限管理员查看
        },
      },
    ],
  },
  {
    path: '/review',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'ExpertReview',
        component: () => import('@/views/review/index.vue'),
        meta: {
          title: '专家评审',
          roles: ['school_admin', 'college_admin', 'competition_manager'],
        },
      },
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
  {
    path: '/notice',
    component: MainLayout,
    children: [
      {
        path: 'notice/:id',
        name: 'Notice',
        component: () => import('@/views/notice/notice.vue'),
        meta: {
          title: '通知',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
        },
      },
       {
        path: 'detail/:id',
        name: 'NoticeDetail',
        component: () => import('@/views/notice/detail.vue'),
        props: true,
        meta: {
          title: '通知详情',
          roles: ['school_admin', 'college_admin', 'competition_manager', 'student'],
          parent:"register-Edit",
        },
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
        path: 'notice/list',
        name: 'NoticeList',
        component: () => import('@/views/notice/list.vue'),
        meta: {
          title: '通知列表',
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

  // 首先恢复store状态(页面刷新时从localStorage恢复)
  if (!userStore.token) {
    userStore.restoreState()
  }

  // 设置页面标题
  let pageTitle = '学科竞赛管理系统'
  if (to.meta.isDynamic && userStore.role === 'school_admin') {
    pageTitle = to.meta.schoolTitle || to.meta.title || pageTitle
  } else if (userStore.role === 'college_admin') {
    pageTitle = to.meta.collegeTitle || to.meta.title || pageTitle
  } else {
    pageTitle = to.meta.title || pageTitle
  }
  document.title = pageTitle

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

  // 确保角色已经被设置
  if (!userStore.role) {
    console.warn('请重新登录')
    next('/login')
    return
  }

  // 检查角色权限
  const allowedRoles = to.meta.roles
  if (allowedRoles) {
    if (allowedRoles.includes(userStore.role)) {
      next()
    } else {
      // 无权限，跳转首页或显示错误页面
      alert('您无权访问该页面')
      next(from.path)
    }
  } else {
    // 没有设置roles，默认允许访问
    next()
  }
})
export default router
