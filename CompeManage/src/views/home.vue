<script setup>
import { ElCard, ElButton } from 'element-plus'
import 'element-plus/dist/index.css'
import {ElTag} from 'element-plus'
let noticeList = [
    {
        date: '2026.1.16',
        title: '关于开展2026年大学生创新创业大赛的通知'
    },
    {
        date: '2026.2.10',
        title: '关于举办2026年全国大学生数学竞赛的通知'
    }
]
</script>

<template>
    <div class="home-container">
        <div class="card-container">
            <el-card class="notice-card" shadow="hover">
                <template #header>
                    <span>赛事通知</span>
                </template>
                <div class="notice-content" v-for="notice in noticeList" :key="notice.date">
                    <el-tag class="notice-tag" effect="dark">{{ notice.date }}</el-tag>
                    <span>{{ notice.title }}</span>
                </div>
            </el-card>

            <el-card class="main-card">
                <template #header>
                    <span>欢迎使用学科竞赛管理系统</span>
                </template>
                <div class="index-content">
                    <div class="index-card">
                        <img src="@/assets/index.svg" class="index-image"/>
                        <span>查看国家级竞赛目录</span>
                    </div>
                    <div class="index-card">
                        <img src="@/assets/index.svg" class="index-image"/>
                        <span>查看省级竞赛目录</span>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<style scoped lang="scss">
.home-container{
    box-sizing: border-box;
    display: flex;
    padding:10px;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: var(--background-color);
}

.card-container{
    padding:0 10px;
    display: flex;
    height: 100%;
    justify-content: space-around;
    .main-card{
        width:40%;
        height:40%;
        .index-content{
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
             .index-card{
            background-color: #f1f4f6;
            height:100px;
            width:46%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 8px; 
            cursor: pointer; 
            .index-image{
                width: 50px;
                height: 50px;
                margin-bottom: 10px;
            }
            &:hover {
            background-color: #e6e8eb; // 加个悬停效果
                }
            }
        }
       
    }

    .notice-card{
        width: 50%;
        height:80%;
        
        .notice-content{
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            &:last-child {
                margin-bottom: 0;
            }
            .notice-tag{
                margin-right: 10px;
            }
        }
    }
}

</style>