<script setup>
import { ElCard, ElTag,ElIcon } from 'element-plus'
import { Trophy,DataAnalysis } from '@element-plus/icons-vue';
import 'element-plus/dist/index.css'
import { useRouter } from 'vue-router'
const router = useRouter()
let noticeList = [
  {
    date: '2026.1.16',
    title: '关于开展2026年大学生创新创业大赛的通知',
    link: '',
  },
  {
    date: '2026.2.10',
    title: '关于举办2026年全国大学生数学竞赛的通知',
  },
]

function NavigateToNotice(){
    router.push('/notice')
}
</script>

<template>
  <div class="home-container">
    <div class="card-container">
      <el-card class="notice-card" shadow="hover">
        <template #header>
          <span>赛事通知</span>
        </template>
        <div class="notice-content" v-for="notice in noticeList" :key="notice.date"
        @click="NavigateToNotice" style="cursor: pointer;">
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
            <div class="icon-box">
            <el-icon :size="32"><Trophy /></el-icon>
            </div>
            <div class="text-box">
               <span class="card-title">国家级竞赛</span>
               <span class="card-desc">查看教育部白名单赛事</span>
            </div>
          </div>
          <div class="index-card">
            <div class="icon-box">
                <el-icon :size="32"><DataAnalysis /></el-icon>
            </div>
            <div class="text-box">
               <span class="card-title">省级竞赛</span>
               <span class="card-desc">查看教育部白名单赛事</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-container {
  box-sizing: border-box;
  display: flex;
  padding: 10px;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
}

.card-container {
  padding: 0 10px;
  gap:20px;
  display: flex;
  height: 100%;
  align-items: flex-start;
  justify-content: space-around;
  .main-card {
    flex:0.8;
    min-height: 40%;
    .index-content {
      display: flex;
      flex-direction: column;
      gap:15px;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      .index-card {
        background-color: #f8fafc;
        border: 1px solid #eaeff5;
        height: 80px;
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        // justify-content: center;
        padding:0 25px;
        box-sizing: border-box;
        gap:15px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        &:hover {
          background-color: #ffffff;
          border-color: #ffffff; 
          transform: translateY(-5px); 
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);

          .icon-box {
             color: #13C2C2; /* 你的主题绿 */
             transform: scale(1.1);
          }

          /* 4. 箭头变色 + 向右移动 */
          .arrow-icon {
             color: #13C2C2;
             transform: translateX(5px);
          }
        }

        .icon-box {
            width: 50px;
            height: 50px;
            background-color: #ffffff; 
            border-radius: 50%;        
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05); /* 图标微阴影 */
            transition: transform 0.3s ease; /* 图标单独的缩放动画 */
            color: #606266;
        }
        .text-box {
            display: flex;
            flex-direction: column;
            flex: 1; /* 占满中间剩余空间 */
            .card-title {
                font-size: 16px;
                font-weight: 600;
                color: #303133;
                margin-bottom: 4px;
            }
            .card-desc {
                font-size: 12px;
                color: #909399;
            }
        }
        &:hover {
          background-color: #e6e8eb; // 加个悬停效果
        }
      }
    }
  }

  .notice-card {
    width: 50%;
    height: 90%;
    flex:1.2;
    .notice-content {
      display: flex;
      align-items: center;
      padding:15px 10px;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 10px;
      &:last-child {
        margin-bottom: 0;
      }
      &:hover {
        background-color: #f0fdfa; 
        color: #13C2C2;
        transform: scale(1.02);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(19, 194, 194, 0.1); 
        border-radius: 6px; 
        border-bottom-color: transparent;
    }
      .notice-tag {
        margin-right: 10px;
      }
    }
  }
}
</style>
