<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { User, Lock, Trophy, } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
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
</script>

<template>
    <div class="login-container">
        <div class="login-box">
            <div class="login-left">
                <div class="logo-area">
                    <el-icon :size="60" color="white">
                        <Trophy />
                    </el-icon>
                    <h2>学科竞赛管理系统</h2>
                    <p>Academic Competition Management System</p>
                </div>
            </div>

            <div class="login-right">
                <h3>用户登录</h3>
                <el-form ref="formRef" :model="loginForm" :rules="rules" class="login-form" size="large"
                    @submit.prevent>
                    <el-form-item prop="username">
                        <el-input v-model="loginForm.username" placeholder="请输入用户名" :prefix-icon="User" />
                    </el-form-item>

                    <el-form-item prop="password">
                        <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock"
                            show-password @keyup.enter="handleLogin" />
                    </el-form-item>

                    <el-button type="primary" class="login-btn" :loading="loading" native-type="button"
                        @click="handleLogin">
                        立即登录
                    </el-button>

                    <div class="dev-tools">
                        <div class="divider"><span>测试账号</span></div>
                        <div class="role-tags">
                            <el-tag effect="dark" @click="quickFill('school_admin')" class="role-tag cursor-pointer">
                                校管理员
                            </el-tag>

                            <el-tag type="success" effect="dark" @click="quickFill('college_admin')"
                                class="role-tag cursor-pointer">
                                院管理员
                            </el-tag>

                            <el-tag type="warning" effect="dark" @click="quickFill('competition_manager')"
                                class="role-tag cursor-pointer">
                                赛事负责人
                            </el-tag>

                            <el-tag type="info" effect="dark" @click="quickFill('student')"
                                class="role-tag cursor-pointer">
                                学生
                            </el-tag>
                        </div>
                    </div>
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