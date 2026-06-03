<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { User, Lock, Trophy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const casLoading = ref(false)
const showPasswordLogin = ref(false)
const loginForm = reactive({
    username: '',
    password: ''
})

const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const formRef = ref(null)

// 执行登录
const handleLogin = async () => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
        if (valid) {
            loading.value = true
            try {
                await userStore.login(loginForm)
                ElMessage.success(`你好，${userStore.userInfo.name}`)
                router.push('/home')
            } catch (error) {
                // 网络层错误已在请求拦截器中提示，避免登录页重复弹窗
                if (error?.message === 'Network Error' || (!error?.response && error?.request)) {
                    return
                }
                ElMessage.error(error.message || '登录失败')
            } finally {
                loading.value = false
            }
        }
    })
}

// 快速填入测试账号（开发辅助功能）
const quickFill = (roleKey) => {
    const user = userStore.mockUsers.find(u => u.role === roleKey)
    if (user) {
        loginForm.username = user.username
        loginForm.password = user.password
        ElMessage.info(`已填入 ${user.name} 的账号`)
    }
}

// ===== CAS/OAuth2.0 统一认证 =====

const handleCasLogin = () => {
    casLoading.value = true
    window.location.href = '/api/cas/login'
}

onMounted(() => {
    const token = route.query.token
    const casError = route.query.cas_error

    if (token) {
        const username = route.query.username
        const realname = route.query.realname
        const role = route.query.role
        const userId = route.query.user_id

        localStorage.setItem('token', token)
        localStorage.setItem('role', role)
        localStorage.setItem('userInfo', JSON.stringify({
            id: Number(userId) || 0,
            name: realname || username,
            username: username,
        }))

        userStore.token = token
        userStore.role = role
        userStore.userInfo = {
            id: Number(userId) || 0,
            name: realname || username,
            username: username,
        }

        ElMessage.success(`欢迎，${realname || username}`)
        router.replace('/home')
    } else if (casError) {
        ElMessage.error(decodeURIComponent(casError))
        router.replace({ query: {} })
    }
})
</script>

<template>
    <div class="login-container">
        <div class="login-box">
            <div class="login-left">
                <div class="logo-area">
                    <img src="/gzhu3.png" alt="广州大学" class="login-logo" />
                    <h2>学科竞赛管理系统</h2>
                    <p>Academic Competition Management System</p>
                </div>
            </div>

            <div class="login-right">
                <h3>欢迎登录</h3>

                <!-- 主入口: CAS统一认证登录按钮 -->
                <el-button type="primary" class="cas-main-btn" @click="handleCasLogin" :loading="casLoading">
                    统一身份认证登录
                </el-button>
                <p class="cas-hint">使用学校融合门户账号登录</p>

                <!-- 分隔线 -->
                <el-divider><span style="color: #c0c4cc; font-size: 12px">管理员专用</span></el-divider>

                <!-- 管理员入口: 默认折叠，点击展开密码登录表单 -->
                <div v-if="!showPasswordLogin" class="admin-toggle">
                    <el-button type="default" link size="small" @click="showPasswordLogin = true">
                        管理员账号登录
                    </el-button>
                </div>

                <el-form v-else ref="formRef" :model="loginForm" :rules="rules" class="login-form" size="large"
                    @submit.prevent>
                    <el-form-item prop="username">
                        <el-input v-model="loginForm.username" placeholder="管理员用户名" :prefix-icon="User" />
                    </el-form-item>

                    <el-form-item prop="password">
                        <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock"
                            show-password @keyup.enter="handleLogin" />
                    </el-form-item>

                    <el-button type="default" class="login-btn" :loading="loading" native-type="button"
                        @click="handleLogin">
                        登录
                    </el-button>
                </el-form>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.login-container {
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;
    background-size: cover;
}

.login-box {
    width: 800px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    display: flex;
    overflow: hidden;

    .login-left {
        flex: 1;
        background: linear-gradient(135deg, #409EFF 0%, #3a8ee6 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        text-align: center;
        padding: 20px;

        .logo-area {
            h2 {
                margin: 20px 0 10px;
                font-size: 24px;
            }

            p {
                font-size: 14px;
                opacity: 0.8;
            }

            .login-logo {
                width: 210px;
                height: auto;
            }
        }
    }

    .login-right {
        flex: 1;
        padding: 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;

        h3 {
            text-align: center;
            margin-bottom: 30px;
            color: #303133;
            font-size: 22px;
        }

        .login-btn {
            width: 100%;
            margin-top: 10px;
            font-weight: bold;
        }

        .cas-main-btn {
            width: 100%;
            height: 48px;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .cas-hint {
            text-align: center;
            color: #909399;
            font-size: 12px;
            margin: 0 0 10px;
        }

        .admin-toggle {
            text-align: center;
        }
    }
}

.dev-tools {
    margin-top: 30px;

    .divider {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        color: #909399;
        font-size: 12px;

        &::before,
        &::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #ebeef5;
        }

        span {
            padding: 0 10px;
        }
    }

    .role-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;

        .role-tag {
            cursor: pointer;
            transition: transform 0.2s;
        }
    }
}

</style>