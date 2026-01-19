<script setup>
import Sidebar from '@/components/Sidebar.vue';
import Header from '@/components/Header.vue';
</script>

<template>
  <Header />
  <div class="main-layout">
    
    <!-- 侧边导航栏 -->
    <aside class="sidebar">
      <Sidebar />
    </aside>

    <!-- 主内容区 -->
    <div class="main-content">

      <!-- 页面内容 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.main-layout {
  display: flex;
  height: 100vh;
  width: 100%;

  .sidebar {
    width: auto;
    height: 100%;
    z-index: 1;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--background-color);

    .breadcrumb-wrapper {
      padding: 16px 20px;
      background-color: #f5f7fa;
      border-bottom: 1px solid #ebeef5;
      flex-shrink: 0;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }
  }
}
</style>