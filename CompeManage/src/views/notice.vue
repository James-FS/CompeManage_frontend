<script setup>
// 1. 引入 ElCard (如果没有配置自动引入)
import { ElDivider, ElCard,ElIcon } from 'element-plus'
import { Document } from '@element-plus/icons-vue';
import 'element-plus/dist/index.css'

let noticeTitle = '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知'
let noticeDate = '2026-01-05 09:37'
let noticeContent = `教务〔2026〕1号 关于举办广州大学第二十届ACM大学生程序设计竞赛的通知.doc`
</script>

<template>
  <div class="page-container">
    <el-card class="notice-card" shadow="hover">
      <div class="card-decoration"></div>
      <div class="notice-header">
        <h2 class="header-title">
          {{ noticeTitle }}
        </h2>
        <div class="notice-date">
          <span>{{ noticeDate }}</span>
        </div>
      </div>

      <el-divider border-style="dashed" />

      <div class="notice-body">
        <div class="attachment-box">
          <div class="file-icon">
            <el-icon :size="24"><Document /></el-icon>
          </div>
          <div class="file-info">
            <span class="file-label">附件下载</span>
            <span class="file-name">{{ noticeContent }}</span>
          </div>
          <div class="download-hint">点击下载</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #dcfce7;
  padding: 20px;
  background-image: radial-gradient(#13c2c2 1px, transparent 1px);
  background-size: 20px 20px;
}

.notice-card {
  width: 60%;
  min-height: 80%;
  max-height: 95%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border: none;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 10px 40px -10px rgba(19, 194, 194, 0.2);
  position: relative;
  overflow: hidden;
  .card-decoration {
    position: absolute; /* 绝对定位，定在最上面 */
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #13c2c2, #36cfc9);
  }

  .notice-header {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 20px;

    .header-title {
      font-size: 22px;
      color: #303133;
      text-align: center;
      margin-bottom: 10px;
    }

    .notice-date {
      color: #909399;
      font-size: 14px;
    }
  }

  .notice-body {
    font-size: 16px;
    line-height: 1.6;
    color: #606266;
    padding: 0 20px;
    .attachment-box {
      margin-top: 30px;
      display: flex;
      align-items: center;
      padding: 15px;

      /* 默认状态：淡灰背景，浅灰边框 */
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;

      /* 👇 加上过渡，让变化丝滑 */
      transition: all 0.3s ease;

      .file-icon {
        margin-right: 15px;
        color: #64748b;
      }

      .file-info {
        display: flex;
        flex-direction: column;
        .file-label {
          font-size: 12px;
          color: #999;
        }
        .file-name {
          font-size: 14px;
          font-weight: 500;
        }
      }

      .download-hint {
        margin-left: auto; /* 把它推到最右边 */
        font-size: 13px;
        color: #13c2c2;
        opacity: 0; /* 平时隐藏 */
        transform: translateX(10px); /* 平时往右偏一点 */
        transition: all 0.3s;
      }

      /* ✨ 悬停时的魔法状态 */
      &:hover {
        background-color: #f0fdfa; /* 变浅青色 */
        border-color: #13c2c2; /* 边框变青 */
        transform: translateY(-2px); /* 向上浮起 2px */
        box-shadow: 0 4px 12px rgba(19, 194, 194, 0.15); /* 产生投影 */

        /* 让右边的文字显现出来 */
        .download-hint {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }
  }
}
</style>
