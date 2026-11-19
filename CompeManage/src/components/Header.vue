<script setup>
import { ElIcon } from 'element-plus'
import { User } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const handleLogout = () => {
  userStore.logout();
  router.push({ path: '/login', query: { method: 'password' } });
}
</script>

<template>
    <div class="header-container">
        <div class="header-left">
            <img src="/gzhu2.png" alt="广州大学" class="header-logo" />
            <span class="header-divider" aria-hidden="true"></span>
            <el-text size="large" class="header-title">
                学科竞赛管理系统
            </el-text>
        </div>
        <div class="header-dashboard">
            <el-dropdown @command="handleLogout">
              <el-icon :size="20" class="user-trigger" aria-label="账号菜单"><User /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
        gap:14px;
    }
    .header-divider{
        width:1px;
        height:22px;
        background:rgba(255, 255, 255, 0.35);
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
        letter-spacing:1px;
        line-height: normal;
    }
    .header-dashboard{
        display: flex;
        align-items: center;
        gap:15px;
    }
}

/* 账号菜单触发器：Element Plus 的 roving-focus 会以脚本方式接管该元素焦点，
   :focus-visible 启发式可能不命中；菜单按钮在聚焦期间显示焦点环，
   与 ARIA menu button 交互惯例一致（鼠标点击打开菜单时同样保留指示）。 */
.user-trigger {
    cursor: pointer;
    color: black;
    border-radius: 4px;
}

.user-trigger:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}
</style>