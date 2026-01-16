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
                path: 'competition',
                name: 'Competition',
                component: () => import('@/views/competition/list.vue'),
                meta: { title: '竞赛管理' }
            },
        ]
    },
    //不需要侧边导航栏的页面
    {
        path:'/login',
        component: EmptyLayout,
        children:[
            {
                path: '',
                name: 'Login',
                component: () => import('@/views/login.vue'),
                meta: { title: '登录' }
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