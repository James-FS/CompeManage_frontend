import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import ElementPlus from 'element-plus'
// 2026-10-29：组件内置文案/日历统一中文（月份 1月~12月，年/月/日切换等）
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './assets/global.css'
const app = createApp(App)

app.use(createPinia())

app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
