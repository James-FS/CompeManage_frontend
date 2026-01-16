<script setup>
  import Header from './components/Header.vue';
</script>

<template>
    <Header />
    <router-view></router-view>
</template>

<style scoped>
  
</style>

<style>
  html, body, #app {
    height: 100%;
    margin: 0;
    padding: 0;
}
#app {
    display: flex;
    flex-direction: column;
    
}
</style>