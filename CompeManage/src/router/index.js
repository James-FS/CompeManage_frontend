import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyLayout from '@/layouts/EmptyLayout.vue'

const routes = [
    {
        path: '/',
        redirect: '/home'
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
                meta: { title: '首页' }
            },
            {
                path: 'competition/list',
                name: 'CompetitionList',
                component: () => import('@/views/competition/list.vue'),
                meta: { title: '竞赛列表' }
            },
            {
                path: 'competition/add',
                name: 'CompetitionAdd',
                component: () => import('@/views/competition/add.vue'),
                meta: { title: '新增竞赛' }
            },
        ]

    },
    {
        path: '/competition',
        component: MainLayout,
        children: [
            {
                path:'register',
                name:'CompetitionRegister',
                component: () => import('@/views/competition/register.vue'),
                meta: { title: '赛事报名' }
            },
        ]
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
                meta: { title: '登录' }
            },
            {
                path: 'notice',
                name: 'Notice',
                component: () => import('@/views/notice/notice.vue'),
                meta: { title: '通知' }
            },
            {
                path: 'notice/list',
                name: 'NoticeList',
                component: () => import('@/views/notice/list.vue'),
                meta: { title: '通知列表' }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || '学科竞赛管理系统'
  next()
})
export default router