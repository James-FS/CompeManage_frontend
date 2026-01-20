<script setup>
import { ElIcon } from 'element-plus'
import { Bell, Setting, User } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const handleLogout = () => {
  userStore.logout();
  router.push('/login');
}
</script>

<template>
    <div class="header-container">
        <el-text  size="large" class="header-title">
            学科竞赛管理系统
        </el-text>
        <div class="header-dashboard">
            <el-icon :size="20"><Bell /></el-icon>
            <el-dropdown @command="handleLogout">
              <el-icon :size="20" style="cursor: pointer; color: black;"><User /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-icon :size="20"><Setting /></el-icon>
        </div>
    </div>
</template>

<style scoped>
.header-container{
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding:0 20px;
    background-color: #13C2C2;
    height:60px;
    .header-title{
        color:#ffffff;
        font-weight:600;
    }
    .header-dashboard{
        display: flex;
        align-items: center;
        gap:15px;
    }
}

:deep(.el-dropdown) {
    outline: none;
}

:deep(.el-dropdown:focus) {
    outline: none;
}
</style>