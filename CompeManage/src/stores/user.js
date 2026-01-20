import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
    // 用户信息
    const role = ref('')
    const token = ref('')
    const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

    // 模拟后端数据库中的用户表
    const mockUsers = [
        { username: 'admin', password: '123', role: 'school_admin', name: '校级管理员' },
        { username: 'yuan', password: '123', role: 'college_admin', name: '计算机学院管理员' },
        { username: 'teacher', password: '123', role: 'competition_manager', name: '张老师(赛事负责人)' },
        { username: 'student', password: '123', role: 'student', name: '李同学' },
        { username: 'expert', password: '123', role: 'expert', name: '王专家' }
    ]

    // 登录动作
    async function login(loginForm) {
        // 查找匹配的用户
        const user = mockUsers.find(u => u.username === loginForm.username && u.password === loginForm.password)
        
        if (!user) {
            throw new Error('用户名或密码错误')
        }
        
        // 设置用户信息
        const mockToken = 'mock-token-' + Date.now()
        userInfo.value = { name: user.name, username: user.username }
        role.value = user.role
        token.value = mockToken
        
        // 保存到localStorage
        localStorage.setItem('token', mockToken)
        localStorage.setItem('role', user.role)
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    }

    // 登出动作
    function logout() {
        role.value = ''
        token.value = ''
        userInfo.value = {}
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('userInfo')
    }

    // 恢复store状态（从localStorage）
    function restoreState() {
        const savedRole = localStorage.getItem('role')
        const savedToken = localStorage.getItem('token')
        const savedUserInfo = localStorage.getItem('userInfo')
        
        if (savedRole) role.value = savedRole
        if (savedToken) token.value = savedToken
        if (savedUserInfo) userInfo.value = JSON.parse(savedUserInfo)
    }

    // 检查是否有权限
    function hasPermission(allowedRoles) {
        if (!allowedRoles || allowedRoles.length === 0) {
            return true
        }
        return allowedRoles.includes(role.value)
    }

    return {
        role,
        token,
        userInfo,
        mockUsers,
        login,
        logout,
        restoreState,
        hasPermission
    }
})