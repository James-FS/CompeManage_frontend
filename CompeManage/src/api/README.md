# API 使用说明

## 项目结构

```
src/
├── utils/
│   └── request.js       # axios 封装，包含请求/响应拦截器
└── api/
    └── index.js         # 所有 API 接口定义
```

## 1. 请求封装 (utils/request.js)

### 功能特性
- ✅ 自动添加 token 到请求头
- ✅ 统一错误处理和提示
- ✅ 401 自动跳转登录页
- ✅ 请求/响应拦截器
- ✅ 支持开发/生产环境切换

### 配置说明

```javascript
const baseURL = 'http://localhost:8080'          // 开发环境
```

### 基础方法

```javascript
import { get, post, put, del } from '@/utils/request'

// GET 请求
get('/api/users', { id: 1 })

// POST 请求
post('/api/login', { username: 'admin', password: '123' })

// PUT 请求
put('/api/users/1', { name: 'newName' })

// DELETE 请求
del('/api/users/1')
```

## 2. API 接口 (api/index.js)

### 使用方式

```javascript
import { api } from '@/api'

// 在 Vue 组件中使用
const handleLogin = async () => {
  try {
    const res = await api.login({ username: 'admin', password: '123' })
    console.log(res.data)
  } catch (error) {
    console.error(error)
  }
}
```

### 接口列表

#### 认证相关
```javascript
api.login(data)              // 用户登录
// 参数: { username: string, password: string }
```

#### 权限相关
```javascript
api.getPermissionList()      // 获取所有权限列表
```

#### 角色相关
```javascript
api.getRoleList()            // 获取所有角色列表
api.assignPermissions(data)  // 分配权限给角色
```

## 3. Store 集成示例

在 Pinia Store 中使用：

```javascript
// stores/user.js
import { defineStore } from 'pinia'
import { api } from '@/api'

export const useUserStore = defineStore('user', () => {
  const login = async (loginForm) => {
    try {
      const response = await api.login(loginForm)
      if (response.code === 200) {
        // 保存 token 和用户信息
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('userInfo', JSON.stringify(response.data.userInfo))
      }
      return response
    } catch (error) {
      throw error
    }
  }
  
  return { login }
})
```

## 4. 组件中使用示例

```vue
<script setup>
import { ref } from 'vue'
import { api } from '@/api'
import { ElMessage } from 'element-plus'

const loading = ref(false)

const handleGetData = async () => {
  loading.value = true
  try {
    const res = await api.getTeamList()
    if (res.code === 200) {
      console.log('队伍列表:', res.data)
      ElMessage.success('获取成功')
    }
  } catch (error) {
    ElMessage.error(error.message || '获取失败')
  } finally {
    loading.value = false
  }
}
</script>
```

## 5. 错误处理

所有 API 请求的错误都会被统一处理：

- **401**: 未登录或登录过期，自动清除 token 并跳转登录页
- **403**: 无权限访问
- **404**: 资源不存在
- **500**: 服务器内部错误
- **网络错误**: 网络连接失败

错误会通过 `ElMessage` 显示给用户，同时在控制台输出详细信息。

## 6. Token 管理

Token 会自动处理：
- 登录成功后，token 保存在 `localStorage`
- 每次请求自动在请求头添加 `Authorization: Bearer {token}`
- 401 响应时自动清除 token 并跳转登录页

## 7. 添加新接口

在 `api/index.js` 中添加新接口：

```javascript
export const api = {
  // ... 现有接口
  
  // 添加新接口
  getCompetitionList: () => get('/api/competitions'),
  createCompetition: (data) => post('/api/competitions', data),
  updateCompetition: (id, data) => put(`/api/competitions/${id}`, data),
  deleteCompetition: (id) => del(`/api/competitions/${id}`)
}
```

## 8. 注意事项

1. 确保后端服务已启动（默认 http://localhost:8080）
2. 后端需要正确配置 CORS 以允许跨域请求
3. 后端返回的数据格式应为：`{ code: number, msg: string, data: any }`
4. 修改 `baseURL` 时记得重启前端开发服务器
