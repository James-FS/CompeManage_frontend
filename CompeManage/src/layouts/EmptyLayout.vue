<script setup>
// 无需额外逻辑，仅作为容器
</script>

<template>
  <div class="empty-layout">
    <router-view />
  </div>
</template>

<style scoped lang="scss">
.empty-layout {
  width: 100%;
  height:  100vh;
  background-color: var(--background-color);
}
</style>