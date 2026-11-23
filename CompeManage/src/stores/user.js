import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

export const useUserStore = defineStore('user', () => {
    // 用户信息
    const role = ref('')
    const token = ref('')
    const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))
    const reviewerAccess = ref(false)
    let reviewerAccessRequest
    let reviewerAccessToken
    let reviewerAccessExpiresAt = 0

    // 模拟后端数据库中的用户表（用于开发测试）
    const mockUsers = [
        { username: 'T2023001', password: '123', role: 'school_admin', name: '校级管理员' },
        { username: 'T2023002', password: '123', role: 'college_admin', name: '计算机学院管理员' },
        { username: 'T2023003', password: '123', role: 'competition_manager', name: '张老师(赛事负责人)' },
        { username: 'S2024001', password: '123', role: 'student', name: '李同学' },
        { username: 'expert', password: '123', role: 'expert', name: '王专家' }
    ]

    // 登录动作
    async function login(loginForm) {
        try {
            // 调用后端登录接口
            const response = await api.login({
                username: loginForm.username,
                password: loginForm.password
            })

            // 检查响应
            if (response.code === 200 && response.data) {
                const { token: resToken, userInfo: resUserInfo } = response.data
                
                // 设置用户信息
                token.value = resToken
                role.value = resUserInfo.role
                resetReviewerAccess()
                userInfo.value = {
                    id: resUserInfo.id,
                    name: resUserInfo.realname || resUserInfo.username,
                    username: resUserInfo.username
                }
                
                // 保存到 localStorage
                localStorage.setItem('token', resToken)
                localStorage.setItem('role', resUserInfo.role)
                localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
                
                return response
            } else {
                throw new Error(response.msg || '登录失败')
            }
        } catch (error) {
            console.error('登录失败:', error)
            throw error
        }
    }

    // 登出动作
    function logout() {
        role.value = ''
        token.value = ''
        resetReviewerAccess()
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

    function resetReviewerAccess() {
        reviewerAccessRequest = undefined
        reviewerAccessToken = undefined
        reviewerAccessExpiresAt = 0
        reviewerAccess.value = false
    }

    async function refreshReviewerAccess({ force = true } = {}) {
        const currentToken = token.value
        if (!currentToken) return false
        if (reviewerAccessRequest?.token === currentToken) return reviewerAccessRequest.promise
        if (!force && reviewerAccessToken === currentToken && Date.now() < reviewerAccessExpiresAt) {
            return reviewerAccess.value
        }

        const request = { token: currentToken }
        reviewerAccessRequest = request
        request.promise = api.getMyReviewAccess().then(response => {
            if (reviewerAccessRequest !== request || token.value !== currentToken) return false
            reviewerAccess.value = response.code === 200 && !!response.data?.can_review
            reviewerAccessToken = currentToken
            reviewerAccessExpiresAt = Date.now() + 30_000
            return reviewerAccess.value
        }).catch(() => {
            if (reviewerAccessRequest === request && token.value === currentToken) {
                reviewerAccess.value = false
                reviewerAccessExpiresAt = 0
            }
            return false
        }).finally(() => {
            if (reviewerAccessRequest === request) reviewerAccessRequest = undefined
        })
        return request.promise
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
        reviewerAccess,
        mockUsers,
        login,
        logout,
        restoreState,
        refreshReviewerAccess,
        hasPermission
    }
})
