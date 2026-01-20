import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyLayout from '@/layouts/EmptyLayout.vue'
import { useUserStore } from '@/stores/user'

const routes = [
    {
        path: '/',
        redirect: '/login'
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
                meta: { title: '首页', roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] }
            },

        ]

    },
    {
        path: '/competition',
        component: MainLayout,
        children: [
            {
                path: 'list',
                name: 'CompetitionList',
                component: () => import('@/views/competition/list.vue'),
                meta: { title: '赛事目录', roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] }
            },
            {
                path: 'competition/add',
                name: 'CompetitionAdd',
                component: () => import('@/views/competition/add.vue'),
                meta: { title: '新增赛事', roles: ['school_admin', 'college_admin'] }
            },
            {
                path: 'register',
                name: 'CompetitionRegister',
                component: () => import('@/views/competition/register.vue'),
                meta: { title: '赛事报名', roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] }
            },
            {
                path: 'register/detail/:id',
                name: 'detail',
                component: () => import('@/views/competition/registerDetail.vue'),
                props: true,
            },
            {
                path: 'edit',
                nmame: 'edit',
                component: () => import('@/views/competition/edit.vue'),

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
                meta: { title: '登录', roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] }
            },
            {
                path: 'notice',
                name: 'Notice',
                component: () => import('@/views/notice/notice.vue'),
                meta: { title: '通知', roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] }
            },
            {
                path: 'notice/list',
                name: 'NoticeList',
                component: () => import('@/views/notice/list.vue'),
                meta: { title: '通知列表', roles: ['school_admin', 'college_admin', 'competition_manager', 'student'] }
            },

        ]
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
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
    }else{
        // 没有设置roles，默认允许访问
        next()
    }
})
export default router