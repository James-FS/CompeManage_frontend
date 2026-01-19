<script setup>
import { ElIcon } from 'element-plus'
import { BellFilled, Setting } from '@element-plus/icons-vue';
</script>

<template>
    <div class="header-container">
        <el-text  size="large" class="header-title">
            学科竞赛管理系统
        </el-text>
        <div class="header-dashboard">
            <el-icon :size="20"><BellFilled /></el-icon>
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
</style>