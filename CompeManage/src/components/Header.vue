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
        <div class="header-left">
            <img src="/gzhu2.png" alt="广州大学" class="header-logo" />
            <el-text size="large" class="header-title">
                学科竞赛管理系统
            </el-text>
        </div>
        <div class="header-dashboard">
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
    .header-left{
        display: flex;
        align-items: center;
        gap:20px;
    }
    .header-logo{
        height:48px;
        width:auto;
        vertical-align: middle;
    }
    .header-title{
        color:#ffffff;
        font-weight:600;
        font-size:20px;
        line-height: normal;
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